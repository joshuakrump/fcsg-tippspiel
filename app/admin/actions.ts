"use server";

import { fromZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";

const FCSG_TEAM_ID = 1011;
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin-login");
}

function revalidateGamePages() {
  revalidatePath("/");
  revalidatePath("/spielplan");
  revalidatePath("/ergebnisse");
  revalidatePath("/rangliste");
  revalidatePath("/admin");
  revalidatePath("/admin/abgeschlossen");
}

async function resolveOpponent(
  supabase: ReturnType<typeof createAdminClient>,
  apiTeam: { id?: number; name?: string; logo?: string | null } | null | undefined
) {
  if (!apiTeam?.name) {
    return { name: "Unbekannter Gegner", logo: null };
  }

  const { data: localTeam } = await supabase
    .from("teams")
    .select("name, logo_path")
    .ilike("name", apiTeam.name)
    .maybeSingle();

  return {
    name: localTeam?.name ?? apiTeam.name,
    logo: localTeam?.logo_path ?? apiTeam.logo ?? null,
  };
}

export async function createMatch(formData: FormData) {
  await requireAdmin();

  const teamId = Number(formData.get("teamId"));
  const kickoffLocal = String(formData.get("kickoff") ?? "");
  const location = String(formData.get("location") ?? "");

  if (!Number.isInteger(teamId) || !kickoffLocal || !["home", "away"].includes(location)) {
    return;
  }

  const supabase = createAdminClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, short_name, logo_path")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    throw new Error(teamError?.message ?? "Gegner konnte nicht gefunden werden.");
  }

  if (team.short_name === "FCSG" || team.name === "FC St. Gallen") {
    throw new Error("FC St. Gallen kann nicht als Gegner gewählt werden.");
  }

  const { error } = await supabase.from("matches").insert({
    opponent: team.name,
    kickoff: fromZonedTime(kickoffLocal, "Europe/Zurich").toISOString(),
    is_home: location === "home",
    opponent_logo: team.logo_path,
    competition_name: "Manuell erstellt",
    finished: false,
  });

  if (error) throw new Error(error.message);
  revalidateGamePages();
}

export async function finishMatch(formData: FormData) {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  const fcsgScore = Number(formData.get("fcsgScore"));
  const opponentScore = Number(formData.get("opponentScore"));

  if (
    !Number.isInteger(matchId) ||
    !Number.isInteger(fcsgScore) ||
    !Number.isInteger(opponentScore) ||
    fcsgScore < 0 ||
    opponentScore < 0
  ) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("matches")
    .update({ fcsg_score: fcsgScore, opponent_score: opponentScore, finished: true })
    .eq("id", matchId);

  if (error) throw new Error(error.message);
  revalidateGamePages();
}

export async function updateMatch(formData: FormData) {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  const opponent = String(formData.get("opponent") ?? "").trim();
  const kickoffLocal = String(formData.get("kickoff") ?? "");
  const location = String(formData.get("location") ?? "");

  if (!Number.isInteger(matchId) || !opponent || !kickoffLocal || !["home", "away"].includes(location)) {
    return;
  }

  const supabase = createAdminClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("name, logo_path")
    .eq("name", opponent)
    .single();

  if (teamError || !team) {
    throw new Error(`Gegner "${opponent}" wurde in der Teams-Tabelle nicht gefunden.`);
  }

  const { error } = await supabase
    .from("matches")
    .update({
      opponent: team.name,
      opponent_logo: team.logo_path,
      kickoff: fromZonedTime(kickoffLocal, "Europe/Zurich").toISOString(),
      is_home: location === "home",
    })
    .eq("id", matchId);

  if (error) throw new Error(error.message);
  revalidateGamePages();
}

export async function deleteMatch(formData: FormData) {
  await requireAdmin();
  const matchId = Number(formData.get("matchId"));
  if (!Number.isInteger(matchId)) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) throw new Error(error.message);
  revalidateGamePages();
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("fcsg-admin-session");
  redirect("/admin-login");
}

export async function updateFinishedMatch(formData: FormData) {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  const opponent = String(formData.get("opponent") ?? "").trim();
  const kickoffLocal = String(formData.get("kickoff") ?? "");
  const location = String(formData.get("location") ?? "");
  const fcsgScore = Number(formData.get("fcsgScore"));
  const opponentScore = Number(formData.get("opponentScore"));

  if (
    !Number.isInteger(matchId) || !opponent || !kickoffLocal ||
    !["home", "away"].includes(location) || !Number.isInteger(fcsgScore) ||
    !Number.isInteger(opponentScore) || fcsgScore < 0 || opponentScore < 0
  ) return;

  const supabase = createAdminClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("name, logo_path")
    .eq("name", opponent)
    .single();

  if (teamError || !team) {
    throw new Error(`Gegner "${opponent}" wurde in der Teams-Tabelle nicht gefunden.`);
  }

  const { error } = await supabase
    .from("matches")
    .update({
      opponent: team.name,
      opponent_logo: team.logo_path,
      kickoff: fromZonedTime(kickoffLocal, "Europe/Zurich").toISOString(),
      is_home: location === "home",
      fcsg_score: fcsgScore,
      opponent_score: opponentScore,
      finished: true,
    })
    .eq("id", matchId);

  if (error) throw new Error(error.message);
  revalidateGamePages();
}

export async function importMatchesForMonth(formData: FormData) {
  await requireAdmin();

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY fehlt.");

  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Ungültiger Monat.");
  }

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayNumber = new Date(year, month, 0).getDate();
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNumber).padStart(2, "0")}`;

  // Absichtlich KEIN league-Filter: Wir importieren sämtliche Pflichtspiele,
  // die API-Football für den FC St. Gallen in diesem Zeitraum kennt.
  const url =
    `https://v3.football.api-sports.io/fixtures` +
    `?team=${FCSG_TEAM_ID}` +
    `&from=${firstDay}` +
    `&to=${lastDay}`;

  const response = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`API-Football Fehler: HTTP ${response.status}`);

  const apiData = await response.json();
  if (apiData.errors && Object.keys(apiData.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(apiData.errors)}`);
  }

  const fixtures = Array.isArray(apiData.response) ? apiData.response : [];
  const supabase = createAdminClient();
  const syncedAt = new Date().toISOString();
  let importedCount = 0;

  for (const item of fixtures) {
    const fixtureId = item.fixture?.id;
    const homeTeam = item.teams?.home;
    const awayTeam = item.teams?.away;

    if (!fixtureId || !homeTeam || !awayTeam) continue;

    const fcsgIsHome = Number(homeTeam.id) === FCSG_TEAM_ID;
    const fcsgIsAway = Number(awayTeam.id) === FCSG_TEAM_ID;
    if (!fcsgIsHome && !fcsgIsAway) continue;

    const opponentApiTeam = fcsgIsHome ? awayTeam : homeTeam;
    const opponent = await resolveOpponent(supabase, opponentApiTeam);
    const status = item.fixture?.status?.short ?? "NS";
    const isFinished = FINISHED_STATUSES.includes(status);
    const homeGoals = item.goals?.home ?? null;
    const awayGoals = item.goals?.away ?? null;

    let fcsgScore: number | null = null;
    let opponentScore: number | null = null;

    if (isFinished && homeGoals !== null && awayGoals !== null) {
      fcsgScore = fcsgIsHome ? homeGoals : awayGoals;
      opponentScore = fcsgIsHome ? awayGoals : homeGoals;
    }

    const matchData = {
      api_fixture_id: fixtureId,
      opponent: opponent.name,
      opponent_logo: opponent.logo,
      kickoff: item.fixture?.date,
      is_home: fcsgIsHome,
      finished: isFinished,
      fcsg_score: fcsgScore,
      opponent_score: opponentScore,
      live_status: status,
      live_minute: item.fixture?.status?.elapsed ?? null,
      live_extra: item.fixture?.status?.extra ?? null,
      live_home_score: homeGoals,
      live_away_score: awayGoals,
      api_last_synced_at: syncedAt,
      competition_id: item.league?.id ?? null,
      competition_name: item.league?.name ?? "Unbekannter Wettbewerb",
      competition_logo: item.league?.logo ?? null,
      competition_country: item.league?.country ?? null,
      competition_round: item.league?.round ?? null,
    };

    const { error: upsertError } = await supabase
      .from("matches")
      .upsert(matchData, { onConflict: "api_fixture_id" });

    if (upsertError) {
      throw new Error(`Spiel ${fixtureId} konnte nicht importiert/aktualisiert werden: ${upsertError.message}`);
    }

    importedCount += 1;
  }

  revalidateGamePages();
  redirect(`/admin?import=success&count=${importedCount}&month=${month}&year=${year}`);
}

export async function syncMatchWithApi(formData: FormData) {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  if (!Number.isInteger(matchId)) throw new Error("Ungültige Match-ID.");

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY fehlt.");

  const supabase = createAdminClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, api_fixture_id, is_home")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new Error(matchError?.message ?? "Match konnte nicht gefunden werden.");
  }
  if (!match.api_fixture_id) throw new Error("Dieses Spiel besitzt keine API-Fixture-ID.");

  const fixtureId = match.api_fixture_id;
  const headers = { "x-apisports-key": apiKey };

  const fixtureResponse = await fetch(
    `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
    { headers, cache: "no-store" }
  );
  const fixtureData = await fixtureResponse.json();

  if (!fixtureResponse.ok || (fixtureData.errors && Object.keys(fixtureData.errors).length > 0)) {
    throw new Error(`Fixture-API: ${JSON.stringify(fixtureData.errors ?? {})}`);
  }

  const fixture = fixtureData.response?.[0];
  if (!fixture) throw new Error("Keine Spieldaten von API-Football erhalten.");

  const [eventsResponse, lineupsResponse, statisticsResponse] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`, { headers, cache: "no-store" }),
    fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`, { headers, cache: "no-store" }),
    fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`, { headers, cache: "no-store" }),
  ]);

  const [eventsData, lineupsData, statisticsData] = await Promise.all([
    eventsResponse.json(), lineupsResponse.json(), statisticsResponse.json(),
  ]);

  if (eventsData.errors && Object.keys(eventsData.errors).length > 0) {
    throw new Error(`Events-API: ${JSON.stringify(eventsData.errors)}`);
  }
  if (lineupsData.errors && Object.keys(lineupsData.errors).length > 0) {
    throw new Error(`Lineups-API: ${JSON.stringify(lineupsData.errors)}`);
  }
  if (statisticsData.errors && Object.keys(statisticsData.errors).length > 0) {
    throw new Error(`Statistics-API: ${JSON.stringify(statisticsData.errors)}`);
  }

  const status = fixture.fixture?.status?.short ?? null;
  const homeScore = fixture.goals?.home ?? null;
  const awayScore = fixture.goals?.away ?? null;
  const homeTeam = fixture.teams?.home;
  const awayTeam = fixture.teams?.away;
  const hasTeams = Boolean(homeTeam && awayTeam);
  const fcsgIsHome = hasTeams ? Number(homeTeam.id) === FCSG_TEAM_ID : match.is_home;
  const opponentApiTeam = hasTeams ? (fcsgIsHome ? awayTeam : homeTeam) : null;
  const opponent = opponentApiTeam ? await resolveOpponent(supabase, opponentApiTeam) : null;
  const isFinished = status !== null && FINISHED_STATUSES.includes(status);

  const updateData: Record<string, unknown> = {
    live_status: status,
    live_minute: fixture.fixture?.status?.elapsed ?? null,
    live_extra: fixture.fixture?.status?.extra ?? null,
    live_home_score: homeScore,
    live_away_score: awayScore,
    live_events: Array.isArray(eventsData.response) ? eventsData.response : [],
    live_lineups: Array.isArray(lineupsData.response) ? lineupsData.response : [],
    live_statistics: Array.isArray(statisticsData.response) ? statisticsData.response : [],
    api_last_synced_at: new Date().toISOString(),
    competition_id: fixture.league?.id ?? null,
    competition_name: fixture.league?.name ?? null,
    competition_logo: fixture.league?.logo ?? null,
    competition_country: fixture.league?.country ?? null,
    competition_round: fixture.league?.round ?? null,
  };

  if (fixture.fixture?.date) updateData.kickoff = fixture.fixture.date;
  if (hasTeams) updateData.is_home = fcsgIsHome;
  if (opponent) {
    updateData.opponent = opponent.name;
    updateData.opponent_logo = opponent.logo;
  }

  if (isFinished && homeScore !== null && awayScore !== null) {
    updateData.finished = true;
    updateData.fcsg_score = fcsgIsHome ? homeScore : awayScore;
    updateData.opponent_score = fcsgIsHome ? awayScore : homeScore;
  }

  const { error: updateError } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId);

  if (updateError) throw new Error(updateError.message);
  revalidateGamePages();
}
