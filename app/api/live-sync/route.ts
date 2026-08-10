import { createAdminClient } from "@/lib/supabase/admin-client";

const FCSG_TEAM_ID = 1011;

export async function GET(request: Request) {
  /*
   * Später schützt Vercel Cron diesen Endpoint.
   * Lokal darf er ohne Secret laufen.
   */
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader =
      request.headers.get("authorization");

    if (
      authHeader !==
      `Bearer ${cronSecret}`
    ) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }
  }

  const apiKey =
    process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return Response.json(
      {
        success: false,
        error:
          "API_FOOTBALL_KEY fehlt.",
      },
      {
        status: 500,
      }
    );
  }

  const supabase =
    createAdminClient();

  /*
   * Nur offene Spiele laden.
   */
  const {
    data: matches,
    error: matchesError,
  } = await supabase
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
    .not(
      "api_fixture_id",
      "is",
      null
    );

  if (matchesError) {
    return Response.json(
      {
        success: false,
        error:
          matchesError.message,
      },
      {
        status: 500,
      }
    );
  }

  const now = new Date();

  /*
   * Nur Matches synchronisieren,
   * deren Anpfiff bereits erreicht wurde.
   *
   * Zusätzlich begrenzen wir auf ca.
   * 3 Stunden nach Anpfiff.
   */
  const activeMatches =
    matches?.filter((match) => {
      const kickoff =
        new Date(match.kickoff);

      const differenceMs =
        now.getTime() -
        kickoff.getTime();

      const threeHoursMs =
        3 * 60 * 60 * 1000;

      return (
        differenceMs >= 0 &&
        differenceMs <=
          threeHoursMs
      );
    }) ?? [];

  if (
    activeMatches.length === 0
  ) {
    return Response.json({
      success: true,
      message:
        "Keine aktiven FCSG-Spiele.",
      synced: 0,
    });
  }

  const headers = {
    "x-apisports-key":
      apiKey,
  };

  let synced = 0;

  for (
    const match of activeMatches
  ) {
    const fixtureId =
      match.api_fixture_id;

    if (!fixtureId) {
      continue;
    }

    try {
      /*
       * 1. FIXTURE
       *
       * Dieser Request liefert:
       * Status
       * Minute
       * Spielstand
       */
      const fixtureResponse =
        await fetch(
          `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
          {
            headers,
            cache: "no-store",
          }
        );

      const fixtureData =
        await fixtureResponse.json();

      if (
        !fixtureResponse.ok ||
        (fixtureData.errors &&
          Object.keys(
            fixtureData.errors
          ).length > 0)
      ) {
        console.error(
          "Fixture API Fehler:",
          fixtureData.errors
        );

        continue;
      }

      const fixture =
        fixtureData.response?.[0];

      if (!fixture) {
        continue;
      }

      /*
       * 2. EVENTS
       */
      const eventsResponse =
        await fetch(
          `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
          {
            headers,
            cache: "no-store",
          }
        );

      const eventsData =
        await eventsResponse.json();

      const events =
        eventsResponse.ok &&
        Array.isArray(
          eventsData.response
        )
          ? eventsData.response
          : [];

      /*
       * 3. STATISTIK
       */
      const statisticsResponse =
        await fetch(
          `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
          {
            headers,
            cache: "no-store",
          }
        );

      const statisticsData =
        await statisticsResponse.json();

      const statistics =
        statisticsResponse.ok &&
        Array.isArray(
          statisticsData.response
        )
          ? statisticsData.response
          : [];

      /*
       * 4. LINEUPS
       *
       * Nur holen, solange wir noch
       * keine gespeichert haben.
       *
       * Das spart Requests.
       */
      let lineups =
        match.live_lineups;

      const lineupsMissing =
        !Array.isArray(lineups) ||
        lineups.length === 0;

      if (lineupsMissing) {
        const lineupsResponse =
          await fetch(
            `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
            {
              headers,
              cache: "no-store",
            }
          );

        const lineupsData =
          await lineupsResponse.json();

        if (
          lineupsResponse.ok &&
          Array.isArray(
            lineupsData.response
          )
        ) {
          lineups =
            lineupsData.response;
        }
      }

      /*
       * STATUS
       */
      const status =
        fixture.fixture?.status
          ?.short ?? null;

      const elapsed =
        fixture.fixture?.status
          ?.elapsed ?? null;

      const extra =
        fixture.fixture?.status
          ?.extra ?? null;

      const homeScore =
        fixture.goals?.home ??
        null;

      const awayScore =
        fixture.goals?.away ??
        null;

      const finishedStatuses =
        [
          "FT",
          "AET",
          "PEN",
        ];

      const isFinished =
        status !== null &&
        finishedStatuses.includes(
          status
        );

      const updateData: {
        live_status:
          | string
          | null;

        live_minute:
          | number
          | null;

        live_extra:
          | number
          | null;

        live_home_score:
          | number
          | null;

        live_away_score:
          | number
          | null;

        live_events:
          unknown[];

        live_lineups:
          unknown;

        live_statistics:
          unknown[];

        finished?: boolean;

        fcsg_score?:
          | number
          | null;

        opponent_score?:
          | number
          | null;
      } = {
        live_status: status,

        live_minute: elapsed,

        live_extra: extra,

        live_home_score:
          homeScore,

        live_away_score:
          awayScore,

        live_events: events,

        live_lineups: lineups,

        live_statistics:
          statistics,
      };

      /*
       * SPIEL BEENDET
       */
      if (
        isFinished &&
        homeScore !== null &&
        awayScore !== null
      ) {
        updateData.finished =
          true;

        if (match.is_home) {
          updateData.fcsg_score =
            homeScore;

          updateData.opponent_score =
            awayScore;
        } else {
          updateData.fcsg_score =
            awayScore;

          updateData.opponent_score =
            homeScore;
        }
      }

      const {
        error: updateError,
      } = await supabase
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
      console.error(
        `Sync Fehler Match ${match.id}:`,
        error
      );
    }
  }

  return Response.json({
    success: true,
    synced,
  });
}