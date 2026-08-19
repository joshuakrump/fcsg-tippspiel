"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";

async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin-login");
}

async function fetchApiCollection(url: string, headers: Record<string, string>) {
  try {
    const response = await fetch(url, { headers, cache: "no-store" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) return [];
    if (data.errors && Object.keys(data.errors).length > 0) return [];

    return Array.isArray(data.response) ? data.response : [];
  } catch {
    return [];
  }
}

export async function syncFinishedMatchDetails() {
  await requireAdmin();

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY fehlt.");

  const supabase = createAdminClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, api_fixture_id")
    .eq("finished", true)
    .not("api_fixture_id", "is", null)
    .order("kickoff", { ascending: false });

  if (error) throw new Error(error.message);

  const headers = { "x-apisports-key": apiKey };
  let checked = 0;
  let updated = 0;
  let unavailable = 0;

  for (const match of matches ?? []) {
    const fixtureId = match.api_fixture_id;
    if (!fixtureId) continue;

    checked += 1;

    const [events, lineups, statistics] = await Promise.all([
      fetchApiCollection(
        `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
        headers
      ),
      fetchApiCollection(
        `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
        headers
      ),
      fetchApiCollection(
        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
        headers
      ),
    ]);

    const hasDetails = events.length > 0 || lineups.length > 0 || statistics.length > 0;

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        live_events: events,
        live_lineups: lineups,
        live_statistics: statistics,
        api_last_synced_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    if (updateError) {
      throw new Error(`Matchdetails für Spiel ${match.id} konnten nicht gespeichert werden: ${updateError.message}`);
    }

    if (hasDetails) updated += 1;
    else unavailable += 1;
  }

  revalidatePath("/ergebnisse");
  revalidatePath("/admin");
  revalidatePath("/admin/abgeschlossen");

  redirect(
    `/admin?details=success&checked=${checked}&updated=${updated}&unavailable=${unavailable}`
  );
}
