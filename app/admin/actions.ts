"use server";

import { fromZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { cookies } from "next/headers";

async function requireAdmin() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin-login");
  }
}

// NEUES SPIEL ERSTELLEN
export async function createMatch(formData: FormData) {
  await requireAdmin();

  const teamId = Number(formData.get("teamId"));
  const kickoffLocal = String(formData.get("kickoff") ?? "");
  const location = String(formData.get("location") ?? "");

  if (
    !Number.isInteger(teamId) ||
    !kickoffLocal ||
    !["home", "away"].includes(location)
  ) {
    return;
  }

  const supabase = createAdminClient();

  // Gegner aus unserer Team-Tabelle laden
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name,short_name, logo_path")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    throw new Error(
      teamError?.message ?? "Gegner konnte nicht gefunden werden."
    );
  }

  // Sicherheit: FCSG darf nicht Gegner von sich selbst sein
  if (team.short_name === "FCSG" || team.name === "FC St. Gallen") {
    throw new Error("FC St. Gallen kann nicht als Gegner gewählt werden.");
  }

  const { error } = await supabase
    .from("matches")
    .insert({
      opponent: team.name,

      kickoff: fromZonedTime(
        kickoffLocal,
        "Europe/Zurich"
      ).toISOString(),

      is_home: location === "home",

      // Die Spalte haben wir bereits erstellt.
      opponent_logo: team.logo_path,

      finished: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

// SPIEL ABSCHLIESSEN
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
  ) {
    return;
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("matches")
    .update({
      fcsg_score: fcsgScore,
      opponent_score: opponentScore,
      finished: true,
    })
    .eq("id", matchId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

// SPIEL BEARBEITEN
export async function updateMatch(formData: FormData) {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  const opponent = String(formData.get("opponent") ?? "").trim();
  const kickoffLocal = String(formData.get("kickoff") ?? "");
  const location = String(formData.get("location") ?? "");

  if (
    !Number.isInteger(matchId) ||
    !opponent ||
    !kickoffLocal
  ) {
    return;
  }

  const isHome = location === "home";

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("matches")
    .update({
      opponent,
      kickoff: fromZonedTime(
        kickoffLocal,
        "Europe/Zurich"
      ).toISOString(),
      is_home: isHome,
    })
    .eq("id", matchId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

// SPIEL LÖSCHEN
export async function deleteMatch(formData: FormData) {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));

  if (!Number.isInteger(matchId)) {
    return;
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
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
    !Number.isInteger(matchId) ||
    !opponent ||
    !kickoffLocal ||
    !Number.isInteger(fcsgScore) ||
    !Number.isInteger(opponentScore) ||
    fcsgScore < 0 ||
    opponentScore < 0
  ) {
    return;
  }

  const isHome = location === "home";
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("matches")
    .update({
      opponent,
      kickoff: fromZonedTime(
  kickoffLocal,
  "Europe/Zurich"
).toISOString(),
      is_home: isHome,
      fcsg_score: fcsgScore,
      opponent_score: opponentScore,
      finished: true,
    })
    .eq("id", matchId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/rangliste");
  revalidatePath("/admin");
  revalidatePath("/admin/abgeschlossen");
}
export async function importMatchesForMonth(formData: FormData) {
  await requireAdmin();

  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY fehlt.");
  }

  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error("Ungültiger Monat.");
  }

  const supabase = createAdminClient();

  const FCSG_TEAM_ID = 1011;
  const SUPER_LEAGUE_ID = 207;

  // Saison wird über das Startjahr definiert.
  // Beispiel: August 2026 = Saison 2026/27.
  const season =
    month >= 7
      ? year
      : year - 1;

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;

  const lastDayNumber = new Date(
    year,
    month,
    0
  ).getDate();

  const lastDay =
    `${year}-${String(month).padStart(2, "0")}-${String(
      lastDayNumber
    ).padStart(2, "0")}`;

  const url =
    `https://v3.football.api-sports.io/fixtures` +
    `?team=${FCSG_TEAM_ID}` +
    `&league=${SUPER_LEAGUE_ID}` +
    `&season=${season}` +
    `&from=${firstDay}` +
    `&to=${lastDay}`;

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `API-Football Fehler: HTTP ${response.status}`
    );
  }

  const apiData = await response.json();

  if (
    apiData.errors &&
    Object.keys(apiData.errors).length > 0
  ) {
    throw new Error(
      `API-Football: ${JSON.stringify(apiData.errors)}`
    );
  }

  const fixtures = apiData.response ?? [];

  for (const item of fixtures) {
    const fixtureId = item.fixture?.id;

    if (!fixtureId) {
      continue;
    }

    // Prüfen, ob dieses API-Spiel schon vorhanden ist
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("id")
      .eq("api_fixture_id", fixtureId)
      .maybeSingle();

    if (existingMatch) {
      continue;
    }

    const homeTeam = item.teams?.home;
    const awayTeam = item.teams?.away;

    if (!homeTeam || !awayTeam) {
      continue;
    }

    const fcsgIsHome =
      homeTeam.id === FCSG_TEAM_ID;

    const opponentApiTeam = fcsgIsHome
      ? awayTeam
      : homeTeam;

    // Gegner über Namen in unserer teams-Tabelle suchen
    const { data: localTeam } = await supabase
      .from("teams")
      .select("name, logo_path")
      .ilike("name", opponentApiTeam.name)
      .maybeSingle();

    // Falls API-Name und unser Name leicht abweichen,
    // verwenden wir den API-Namen und versuchen das Logo
    // später manuell zu korrigieren.
    const opponentName =
      localTeam?.name ?? opponentApiTeam.name;

    const opponentLogo =
      localTeam?.logo_path ?? null;

    const status =
      item.fixture?.status?.short ?? "NS";

    const isFinished =
      status === "FT" ||
      status === "AET" ||
      status === "PEN";

    const homeGoals = item.goals?.home;
    const awayGoals = item.goals?.away;

    let fcsgScore: number | null = null;
    let opponentScore: number | null = null;

    if (
      isFinished &&
      homeGoals !== null &&
      homeGoals !== undefined &&
      awayGoals !== null &&
      awayGoals !== undefined
    ) {
      if (fcsgIsHome) {
        fcsgScore = homeGoals;
        opponentScore = awayGoals;
      } else {
        fcsgScore = awayGoals;
        opponentScore = homeGoals;
      }
    }

    const { error: insertError } = await supabase
      .from("matches")
      .insert({
        api_fixture_id: fixtureId,
        opponent: opponentName,
        opponent_logo: opponentLogo,
        kickoff: item.fixture.date,
        is_home: fcsgIsHome,
        finished: isFinished,
        fcsg_score: fcsgScore,
        opponent_score: opponentScore,
      });

    if (insertError) {
      throw new Error(
        `Spiel ${fixtureId} konnte nicht importiert werden: ${insertError.message}`
      );
    }
  }

  revalidatePath("/");
  revalidatePath("/ergebnisse");
  revalidatePath("/rangliste");
  revalidatePath("/admin");
  revalidatePath("/admin/abgeschlossen");
}

export async function syncMatchWithApi(formData: FormData) {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));

  if (!Number.isInteger(matchId)) {
    throw new Error("Ungültige Match-ID.");
  }

  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY fehlt.");
  }

  const supabase = createAdminClient();

  // Unser Match laden
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, api_fixture_id, is_home")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new Error(
      matchError?.message ?? "Match konnte nicht gefunden werden."
    );
  }

  if (!match.api_fixture_id) {
    throw new Error(
      "Dieses Spiel besitzt keine API-Fixture-ID."
    );
  }

  // Match inkl. Events + Lineups laden
  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?id=${match.api_fixture_id}`,
    {
      headers: {
        "x-apisports-key": apiKey,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `API-Football Fehler: HTTP ${response.status}`
    );
  }

  const apiData = await response.json();

  if (
    apiData.errors &&
    Object.keys(apiData.errors).length > 0
  ) {
    throw new Error(
      `API-Football: ${JSON.stringify(apiData.errors)}`
    );
  }

  const fixture = apiData.response?.[0];

  if (!fixture) {
    throw new Error(
      "API-Football hat keine Daten für dieses Spiel geliefert."
    );
  }

  const status =
    fixture.fixture?.status?.short ?? null;

  const elapsed =
    fixture.fixture?.status?.elapsed ?? null;

  const extra =
    fixture.fixture?.status?.extra ?? null;

  const homeScore =
    fixture.goals?.home ?? null;

  const awayScore =
    fixture.goals?.away ?? null;

  // Events enthalten u.a.:
  // Tore, Assists, Karten, Wechsel und VAR
  const events =
    Array.isArray(fixture.events)
      ? fixture.events
      : [];

  // Lineups enthalten u.a.:
  // Formation, Trainer, Startelf und Ersatzspieler
  const lineups =
    Array.isArray(fixture.lineups)
      ? fixture.lineups
      : [];

  const finishedStatuses = [
    "FT",
    "AET",
    "PEN",
  ];

  const isFinished =
    status !== null &&
    finishedStatuses.includes(status);

  const updateData: {
    live_status: string | null;
    live_minute: number | null;
    live_extra: number | null;
    live_home_score: number | null;
    live_away_score: number | null;
    live_events: unknown[];
    live_lineups: unknown[];
    finished?: boolean;
    fcsg_score?: number | null;
    opponent_score?: number | null;
  } = {
    live_status: status,
    live_minute: elapsed,
    live_extra: extra,
    live_home_score: homeScore,
    live_away_score: awayScore,
    live_events: events,
    live_lineups: lineups,
  };

  // Wenn Spiel beendet:
  // Endresultat automatisch übernehmen
  if (
    isFinished &&
    homeScore !== null &&
    awayScore !== null
  ) {
    updateData.finished = true;

    if (match.is_home) {
      updateData.fcsg_score = homeScore;
      updateData.opponent_score = awayScore;
    } else {
      updateData.fcsg_score = awayScore;
      updateData.opponent_score = homeScore;
    }
  }
  const { error: updateError } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/");
  revalidatePath("/ergebnisse");
  revalidatePath("/rangliste");
  revalidatePath("/admin");
  revalidatePath("/admin/abgeschlossen");
}