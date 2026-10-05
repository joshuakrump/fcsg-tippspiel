"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";

async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin-login");
}

function normalizeTicketUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Bitte eine gültige Ticket-URL eingeben.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Ticket-Links müssen mit https:// beginnen.");
  }

  return url.toString();
}

export async function updateTicketUrl(formData: FormData) {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  const ticketUrl = normalizeTicketUrl(String(formData.get("ticketUrl") ?? ""));

  if (!Number.isInteger(matchId)) {
    throw new Error("Ungültige Match-ID.");
  }

  const supabase = createAdminClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, is_home")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new Error(matchError?.message ?? "Spiel wurde nicht gefunden.");
  }

  if (!match.is_home) {
    throw new Error("Ticket-Links können nur bei Heimspielen hinterlegt werden.");
  }

  const { error } = await supabase
    .from("matches")
    .update({ ticket_url: ticketUrl })
    .eq("id", matchId);

  if (error) throw new Error(error.message);

  revalidatePath("/spielplan");
  revalidatePath("/admin");
  revalidatePath("/admin/tickets");
}
