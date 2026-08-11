import { createAdminClient } from "@/lib/supabase/admin-client";
import { createClient } from "@/lib/supabase/server";

const FCSG_TEAM_ID = 1011;
const SYNC_INTERVAL_MS = 60_000;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronAuthorized =
    Boolean(cronSecret) &&
    authHeader === `Bearer ${cronSecret}`;

  if (!cronAuthorized) {
    const userSupabase = await createClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return Response.json(
      { success: false, error: "API_FOOTBALL_KEY fehlt." },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(
      `
        id,
        kickoff,
        api_fixture_id,
        is_home,
        finished,
        live_lineups
      `
    )
    .eq("finished", false)
    .not("api_fixture_id", "is", null);

  if (matchesError) {
    return Response.json(
      { success: false, error: matchesError.message },
      { status: 500 }
    );
  }

  const now = new Date();
  const threeHoursMs = 3 * 60 * 60 * 1000;

  const activeMatches =
    matches?.filter((match) => {
      const kickoff = new Date(match.kickoff);
      const differenceMs = now.getTime() - kickoff.getTime();

      return differenceMs >= 0 && differenceMs <= threeHoursMs;
    }) ?? [];

  if (activeMatches.length === 0) {
    return Response.json({
      success: true,
      message: "Keine aktiven FCSG-Spiele.",
      synced: 0,
    });
  }

  // Globale Sperre: Egal wie viele Browser offen sind,
  // nur ein Request darf pro Minute API-Football aufrufen.
  const cutoff = new Date(
    Date.now() - SYNC_INTERVAL_MS
  ).toISOString();

  const { data: claimedSlot, error: throttleError } = await supabase
    .from("live_sync_state")
    .update({ last_run: new Date().toISOString() })
    .eq("id", 1)
    .lt("last_run", cutoff)
    .select("id")
    .maybeSingle();

  if (throttleError) {
    return Response.json(
      { success: false, error: throttleError.message },
      { status: 500 }
    );
  }

  if (!claimedSlot) {
    return Response.json({
      success: true,
      message: "Live-Sync wurde bereits kürzlich ausgeführt.",
      synced: 0,
      throttled: true,
    });
  }

  const headers = {
    "x-apisports-key": apiKey,
  };

  let synced = 0;

  for (const match of activeMatches) {
    const fixtureId = match.api_fixture_id;

    if (!fixtureId) {
      continue;
    }

    try {
      const fixtureResponse = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
        { headers, cache: "no-store" }
      );

      const fixtureData = await fixtureResponse.json();

      if (
        !fixtureResponse.ok ||
        (fixtureData.errors &&
          Object.keys(fixtureData.errors).length > 0)
      ) {
        console.error("Fixture API Fehler:", fixtureData.errors);
        continue;
      }

      const fixture = fixtureData.response?.[0];

      if (!fixture) {
        continue;
      }

      const eventsResponse = await fetch(
        `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
        { headers, cache: "no-store" }
      );

      const eventsData = await eventsResponse.json();
      const events =
        eventsResponse.ok && Array.isArray(eventsData.response)
          ? eventsData.response
          : [];

      const statisticsResponse = await fetch(
        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
        { headers, cache: "no-store" }
      );

      const statisticsData = await statisticsResponse.json();
      const statistics =
        statisticsResponse.ok && Array.isArray(statisticsData.response)
          ? statisticsData.response
          : [];

      let lineups = match.live_lineups;
      const lineupsMissing =
        !Array.isArray(lineups) || lineups.length === 0;

      if (lineupsMissing) {
        const lineupsResponse = await fetch(
          `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
          { headers, cache: "no-store" }
        );

        const lineupsData = await lineupsResponse.json();

        if (
          lineupsResponse.ok &&
          Array.isArray(lineupsData.response)
        ) {
          lineups = lineupsData.response;
        }
      }

      const status = fixture.fixture?.status?.short ?? null;
      const elapsed = fixture.fixture?.status?.elapsed ?? null;
      const extra = fixture.fixture?.status?.extra ?? null;
      const homeScore = fixture.goals?.home ?? null;
      const awayScore = fixture.goals?.away ?? null;

      const isFinished =
        status !== null && ["FT", "AET", "PEN"].includes(status);

      const updateData: {
        live_status: string | null;
        live_minute: number | null;
        live_extra: number | null;
        live_home_score: number | null;
        live_away_score: number | null;
        live_events: unknown[];
        live_lineups: unknown;
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
        .eq("id", match.id);

      if (updateError) {
        console.error(
          `Supabase Update Fehler Match ${match.id}:`,
          updateError
        );
        continue;
      }

      synced++;
    } catch (error) {
      console.error(`Sync Fehler Match ${match.id}:`, error);
    }
  }

  return Response.json({
    success: true,
    synced,
  });
}
