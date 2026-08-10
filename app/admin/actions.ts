"use server";

import { fromZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";

/*
 * ADMIN PRÜFEN
 */
async function requireAdmin() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin-login");
  }
}

/*
 * ALLE RELEVANTEN SEITEN AKTUALISIEREN
 */
function revalidateGamePages() {
  revalidatePath("/");
  revalidatePath("/ergebnisse");
  revalidatePath("/rangliste");
  revalidatePath("/admin");
  revalidatePath("/admin/abgeschlossen");
}

/*
 * NEUES SPIEL MANUELL ERSTELLEN
 */
export async function createMatch(formData: FormData) {
  await requireAdmin();

  const teamId = Number(formData.get("teamId"));
  const kickoffLocal = String(
    formData.get("kickoff") ?? ""
  );
  const location = String(
    formData.get("location") ?? ""
  );

  if (
    !Number.isInteger(teamId) ||
    !kickoffLocal ||
    !["home", "away"].includes(location)
  ) {
    return;
  }

  const supabase = createAdminClient();

  const { data: team, error: teamError } =
    await supabase
      .from("teams")
      .select(
        "id, name, short_name, logo_path"
      )
      .eq("id", teamId)
      .single();

  if (teamError || !team) {
    throw new Error(
      teamError?.message ??
        "Gegner konnte nicht gefunden werden."
    );
  }

  if (
    team.short_name === "FCSG" ||
    team.name === "FC St. Gallen"
  ) {
    throw new Error(
      "FC St. Gallen kann nicht als Gegner gewählt werden."
    );
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

      opponent_logo: team.logo_path,

      finished: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidateGamePages();
}

/*
 * SPIEL MANUELL ABSCHLIESSEN
 */
export async function finishMatch(
  formData: FormData
) {
  await requireAdmin();

  const matchId = Number(
    formData.get("matchId")
  );

  const fcsgScore = Number(
    formData.get("fcsgScore")
  );

  const opponentScore = Number(
    formData.get("opponentScore")
  );

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

  revalidateGamePages();
}

/*
 * OFFENES SPIEL BEARBEITEN
 */
export async function updateMatch(
  formData: FormData
) {
  await requireAdmin();

  const matchId = Number(
    formData.get("matchId")
  );

  const opponent = String(
    formData.get("opponent") ?? ""
  ).trim();

  const kickoffLocal = String(
    formData.get("kickoff") ?? ""
  );

  const location = String(
    formData.get("location") ?? ""
  );

  if (
    !Number.isInteger(matchId) ||
    !opponent ||
    !kickoffLocal ||
    !["home", "away"].includes(location)
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

  revalidateGamePages();
}

/*
 * SPIEL LÖSCHEN
 */
export async function deleteMatch(
  formData: FormData
) {
  await requireAdmin();

  const matchId = Number(
    formData.get("matchId")
  );

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

  revalidateGamePages();
}

/*
 * ADMIN ABMELDEN
 */
export async function adminLogout() {
  const cookieStore = await cookies();

  cookieStore.delete(
    "fcsg-admin-session"
  );

  redirect("/admin-login");
}

/*
 * ABGESCHLOSSENES SPIEL BEARBEITEN
 */
export async function updateFinishedMatch(
  formData: FormData
) {
  await requireAdmin();

  const matchId = Number(
    formData.get("matchId")
  );

  const opponent = String(
    formData.get("opponent") ?? ""
  ).trim();

  const kickoffLocal = String(
    formData.get("kickoff") ?? ""
  );

  const location = String(
    formData.get("location") ?? ""
  );

  const fcsgScore = Number(
    formData.get("fcsgScore")
  );

  const opponentScore = Number(
    formData.get("opponentScore")
  );

  if (
    !Number.isInteger(matchId) ||
    !opponent ||
    !kickoffLocal ||
    !["home", "away"].includes(location) ||
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

  revalidateGamePages();
}

/*
 * FCSG SUPER-LEAGUE SPIELE
 * EINES MONATS IMPORTIEREN
 */
export async function importMatchesForMonth(
  formData: FormData
) {
  await requireAdmin();

  const apiKey =
    process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error(
      "API_FOOTBALL_KEY fehlt."
    );
  }

  const year = Number(
    formData.get("year")
  );

  const month = Number(
    formData.get("month")
  );

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "Ungültiger Monat."
    );
  }

  const supabase =
    createAdminClient();

  const FCSG_TEAM_ID = 1011;
  const SUPER_LEAGUE_ID = 207;

  /*
   * Saison wird über das Startjahr angegeben.
   *
   * August 2026 → Saison 2026
   * März 2027   → Saison 2026
   */
  const season =
    month >= 7
      ? year
      : year - 1;

  const firstDay =
    `${year}-${String(month).padStart(
      2,
      "0"
    )}-01`;

  const lastDayNumber =
    new Date(
      year,
      month,
      0
    ).getDate();

  const lastDay =
    `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(lastDayNumber).padStart(
      2,
      "0"
    )}`;

  const url =
    `https://v3.football.api-sports.io/fixtures` +
    `?team=${FCSG_TEAM_ID}` +
    `&league=${SUPER_LEAGUE_ID}` +
    `&season=${season}` +
    `&from=${firstDay}` +
    `&to=${lastDay}`;

  const response = await fetch(
    url,
    {
      headers: {
        "x-apisports-key":
          apiKey,
      },

      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `API-Football Fehler: HTTP ${response.status}`
    );
  }

  const apiData =
    await response.json();

  if (
    apiData.errors &&
    Object.keys(apiData.errors)
      .length > 0
  ) {
    throw new Error(
      `API-Football: ${JSON.stringify(
        apiData.errors
      )}`
    );
  }

  const fixtures =
    apiData.response ?? [];

  for (const item of fixtures) {
    const fixtureId =
      item.fixture?.id;

    if (!fixtureId) {
      continue;
    }

    /*
     * DOPPELTE SPIELE VERHINDERN
     */
    const {
      data: existingMatch,
    } = await supabase
      .from("matches")
      .select("id")
      .eq(
        "api_fixture_id",
        fixtureId
      )
      .maybeSingle();

    if (existingMatch) {
      continue;
    }

    const homeTeam =
      item.teams?.home;

    const awayTeam =
      item.teams?.away;

    if (
      !homeTeam ||
      !awayTeam
    ) {
      continue;
    }

    const fcsgIsHome =
      Number(homeTeam.id) ===
      FCSG_TEAM_ID;

    const opponentApiTeam =
      fcsgIsHome
        ? awayTeam
        : homeTeam;

    /*
     * LOGO / NAME AUS UNSERER
     * TEAM-TABELLE HOLEN
     */
    const {
      data: localTeam,
    } = await supabase
      .from("teams")
      .select(
        "name, logo_path"
      )
      .ilike(
        "name",
        opponentApiTeam.name
      )
      .maybeSingle();

    const opponentName =
      localTeam?.name ??
      opponentApiTeam.name;

    const opponentLogo =
      localTeam?.logo_path ??
      null;

    const status =
      item.fixture?.status
        ?.short ?? "NS";

    const isFinished =
      status === "FT" ||
      status === "AET" ||
      status === "PEN";

    const homeGoals =
      item.goals?.home;

    const awayGoals =
      item.goals?.away;

    let fcsgScore:
      | number
      | null = null;

    let opponentScore:
      | number
      | null = null;

    if (
      isFinished &&
      homeGoals !== null &&
      homeGoals !== undefined &&
      awayGoals !== null &&
      awayGoals !== undefined
    ) {
      if (fcsgIsHome) {
        fcsgScore =
          homeGoals;

        opponentScore =
          awayGoals;
      } else {
        fcsgScore =
          awayGoals;

        opponentScore =
          homeGoals;
      }
    }

    const {
      error: insertError,
    } = await supabase
      .from("matches")
      .insert({
        api_fixture_id:
          fixtureId,

        opponent:
          opponentName,

        opponent_logo:
          opponentLogo,

        kickoff:
          item.fixture.date,

        is_home:
          fcsgIsHome,

        finished:
          isFinished,

        fcsg_score:
          fcsgScore,

        opponent_score:
          opponentScore,

        live_status:
          status,

        live_minute:
          item.fixture?.status
            ?.elapsed ?? null,

        live_extra:
          item.fixture?.status
            ?.extra ?? null,

        live_home_score:
          homeGoals ?? null,

        live_away_score:
          awayGoals ?? null,
      });

    if (insertError) {
      throw new Error(
        `Spiel ${fixtureId} konnte nicht importiert werden: ${insertError.message}`
      );
    }
  }

  revalidateGamePages();
}

/*
 * EIN SPIEL MIT API-FOOTBALL
 * SYNCHRONISIEREN
 */
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

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, api_fixture_id, is_home")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new Error(
      matchError?.message ??
        "Match konnte nicht gefunden werden."
    );
  }

  if (!match.api_fixture_id) {
    throw new Error(
      "Dieses Spiel besitzt keine API-Fixture-ID."
    );
  }

  const fixtureId = match.api_fixture_id;

  const headers = {
    "x-apisports-key": apiKey,
  };

  // 1. Spielstatus / Spielstand
  const fixtureResponse = await fetch(
    `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
    {
      headers,
      cache: "no-store",
    }
  );

  const fixtureData = await fixtureResponse.json();

  if (
    fixtureData.errors &&
    Object.keys(fixtureData.errors).length > 0
  ) {
    throw new Error(
      `Fixture-API: ${JSON.stringify(fixtureData.errors)}`
    );
  }

  const fixture = fixtureData.response?.[0];

  if (!fixture) {
    throw new Error(
      "Keine Spieldaten von API-Football erhalten."
    );
  }

  // 2. Ereignisse
  const eventsResponse = await fetch(
    `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
    {
      headers,
      cache: "no-store",
    }
  );

  const eventsData = await eventsResponse.json();

  if (
    eventsData.errors &&
    Object.keys(eventsData.errors).length > 0
  ) {
    throw new Error(
      `Events-API: ${JSON.stringify(eventsData.errors)}`
    );
  }

  const events = Array.isArray(eventsData.response)
    ? eventsData.response
    : [];

  // 3. Aufstellungen
  const lineupsResponse = await fetch(
    `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
    {
      headers,
      cache: "no-store",
    }
  );

  const lineupsData = await lineupsResponse.json();

  if (
    lineupsData.errors &&
    Object.keys(lineupsData.errors).length > 0
  ) {
    throw new Error(
      `Lineups-API: ${JSON.stringify(lineupsData.errors)}`
    );
  }

  const lineups = Array.isArray(lineupsData.response)
    ? lineupsData.response
    : [];

  // 4. Statistiken
  const statisticsResponse = await fetch(
    `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
    {
      headers,
      cache: "no-store",
    }
  );

  const statisticsData = await statisticsResponse.json();

  if (
    statisticsData.errors &&
    Object.keys(statisticsData.errors).length > 0
  ) {
    throw new Error(
      `Statistics-API: ${JSON.stringify(
        statisticsData.errors
      )}`
    );
  }

  const statistics = Array.isArray(statisticsData.response)
    ? statisticsData.response
    : [];

  // Status
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

  const isFinished =
    status !== null &&
    ["FT", "AET", "PEN"].includes(status);

  const updateData: {
    live_status: string | null;
    live_minute: number | null;
    live_extra: number | null;
    live_home_score: number | null;
    live_away_score: number | null;
    live_events: unknown[];
    live_lineups: unknown[];
    live_statistics: unknown[];
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
    live_statistics: statistics,
  };

  // Bei Spielende automatisch abschliessen
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