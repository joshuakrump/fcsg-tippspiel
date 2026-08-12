import webpush from "web-push";
import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { createClient } from "@/lib/supabase/server";



const FCSG_TEAM_ID = 1011;
const FCSG_NAME = "FC St. Gallen";

const SYNC_INTERVAL_MS = 60_000;
const PREMATCH_WINDOW_MS = 30 * 60 * 1000;
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

type ApiEvent = {
  time?: {
    elapsed?: number | null;
    extra?: number | null;
  };

  team?: {
    id?: number | null;
    name?: string | null;
  };

  player?: {
    id?: number | null;
    name?: string | null;
  };

  assist?: {
    id?: number | null;
    name?: string | null;
  };

  type?: string | null;
  detail?: string | null;
  comments?: string | null;
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function formatMinute(
  elapsed?: number | null,
  extra?: number | null,
) {
  if (elapsed === null || elapsed === undefined) {
    return "";
  }

  if (extra && extra > 0) {
    return `${elapsed}+${extra}'`;
  }

  return `${elapsed}'`;
}

function eventSignature(event: ApiEvent) {
  return [
    event.type ?? "",
    event.detail ?? "",
    event.time?.elapsed ?? "",
    event.time?.extra ?? "",
    event.team?.id ?? "",
    event.player?.id ?? "",
    event.assist?.id ?? "",
    event.comments ?? "",
  ].join("|");
}

function eventNotificationKey(event: ApiEvent) {
  const signature = eventSignature(event);

  const hash = createHash("sha256")
    .update(signature)
    .digest("hex")
    .slice(0, 32);

  return `event_${hash}`;
}

function getDatabaseMatchLabel(match: {
  opponent: string;
  is_home: boolean;
}) {
  if (match.is_home) {
    return `${FCSG_NAME} – ${match.opponent}`;
  }

  return `${match.opponent} – ${FCSG_NAME}`;
}

function getScoreLabel(
  homeName: string,
  awayName: string,
  homeScore: number | null,
  awayScore: number | null,
) {
  if (homeScore === null || awayScore === null) {
    return `${homeName} – ${awayName}`;
  }

  return `${homeName} ${homeScore}:${awayScore} ${awayName}`;
}

async function sendPushToAll(
  supabase: ReturnType<typeof createAdminClient>,
  payload: PushPayload,
) {
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    console.error(
      "Push-Subscriptions konnten nicht geladen werden:",
      error.message,
    );

    return 0;
  }

  if (!subscriptions?.length) {
    return 0;
  }

  let sent = 0;

  const results = await Promise.allSettled(
    (subscriptions as PushSubscriptionRow[]).map(
      async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              url: payload.url ?? "/",
            }),
          );

          sent++;
        } catch (error) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? Number(
                  (error as { statusCode?: number }).statusCode,
                )
              : null;

          /*
           * 404 / 410 bedeutet:
           * Browser hat diese Push-Subscription gelöscht
           * oder sie ist nicht mehr gültig.
           */
          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", subscription.endpoint);

            return;
          }

          console.error(
            "Push-Versand fehlgeschlagen:",
            statusCode ?? "Unbekannter Fehler",
          );
        }
      },
    ),
  );

  /*
   * Promise.allSettled verhindert,
   * dass eine kaputte Subscription alle anderen blockiert.
   */
  void results;

  return sent;
}

async function notifyOnce(
  supabase: ReturnType<typeof createAdminClient>,
  pushConfigured: boolean,
  matchId: number,
  notificationKey: string,
  payload: PushPayload,
) {
  if (!pushConfigured) {
    return false;
  }

  /*
   * Zuerst versuchen wir, diese Notification zu reservieren.
   *
   * UNIQUE(match_id, notification_key) sorgt dafür,
   * dass zwei gleichzeitige Cron-Aufrufe niemals
   * dieselbe Nachricht doppelt senden.
   */
  const { error: claimError } = await supabase
    .from("push_notification_log")
    .insert({
      match_id: matchId,
      notification_key: notificationKey,
    });

  if (claimError) {
    /*
     * PostgreSQL 23505 = UNIQUE violation.
     * Nachricht wurde also bereits verarbeitet.
     */
    if (claimError.code === "23505") {
      return false;
    }

    console.error(
      `Notification-Log Fehler (${notificationKey}):`,
      claimError.message,
    );

    return false;
  }

  const sent = await sendPushToAll(
    supabase,
    payload,
  );

  console.log(
    `Push ${notificationKey}: ${sent} Gerät(e)`,
  );

  return true;
}

export async function GET(request: Request) {
  /*
   * --------------------------------------------------
   * AUTH
   * --------------------------------------------------
   */

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
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }
  }

  /*
   * --------------------------------------------------
   * ENVIRONMENT
   * --------------------------------------------------
   */

  const apiKey =
    process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return Response.json(
      {
        success: false,
        error: "API_FOOTBALL_KEY fehlt.",
      },
      {
        status: 500,
      },
    );
  }

  const vapidPublicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const vapidPrivateKey =
    process.env.VAPID_PRIVATE_KEY;

  const vapidSubject =
    process.env.VAPID_SUBJECT;

  const pushConfigured = Boolean(
    vapidPublicKey &&
      vapidPrivateKey &&
      vapidSubject,
  );

  if (
    vapidPublicKey &&
    vapidPrivateKey &&
    vapidSubject
  ) {
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey,
    );
  } else {
    console.warn(
      "Push deaktiviert: VAPID-Konfiguration fehlt.",
    );
  }

  const supabase = createAdminClient();

  /*
   * --------------------------------------------------
   * SPIELE LADEN
   * --------------------------------------------------
   */

  const { data: matches, error: matchesError } =
    await supabase
      .from("matches")
      .select(
        `
          id,
          opponent,
          kickoff,
          api_fixture_id,
          is_home,
          finished,
          live_status,
          live_events,
          live_lineups
        `,
      )
      .eq("finished", false)
      .not("api_fixture_id", "is", null);

  if (matchesError) {
    return Response.json(
      {
        success: false,
        error: matchesError.message,
      },
      {
        status: 500,
      },
    );
  }

  const now = new Date();

  /*
   * Ein Spiel ist relevant:
   *
   * 30 Minuten vor Anpfiff
   * bis
   * 3 Stunden nach Anpfiff.
   */
  const activeMatches =
    matches?.filter((match) => {
      const kickoff =
        new Date(match.kickoff);

      const differenceMs =
        now.getTime() - kickoff.getTime();

      return (
        differenceMs >= -PREMATCH_WINDOW_MS &&
        differenceMs <= LIVE_WINDOW_MS
      );
    }) ?? [];

  if (activeMatches.length === 0) {
    return Response.json({
      success: true,
      message:
        "Keine aktiven oder bald startenden FCSG-Spiele.",
      synced: 0,
      notifications: 0,
    });
  }

  /*
   * --------------------------------------------------
   * GLOBALER 60-SEKUNDEN-THROTTLE
   * --------------------------------------------------
   */

  const cutoff = new Date(
    Date.now() - SYNC_INTERVAL_MS,
  ).toISOString();

  const {
    data: claimedSlot,
    error: throttleError,
  } = await supabase
    .from("live_sync_state")
    .update({
      last_run: new Date().toISOString(),
    })
    .eq("id", 1)
    .lt("last_run", cutoff)
    .select("id")
    .maybeSingle();

  if (throttleError) {
    return Response.json(
      {
        success: false,
        error: throttleError.message,
      },
      {
        status: 500,
      },
    );
  }

  if (!claimedSlot) {
    return Response.json({
      success: true,
      message:
        "Live-Sync wurde bereits kürzlich ausgeführt.",
      synced: 0,
      notifications: 0,
      throttled: true,
    });
  }

  const headers = {
    "x-apisports-key": apiKey,
  };

  let synced = 0;
  let notifications = 0;

  /*
   * --------------------------------------------------
   * SPIELE VERARBEITEN
   * --------------------------------------------------
   */

  for (const match of activeMatches) {
    const kickoff =
      new Date(match.kickoff);

    const msUntilKickoff =
      kickoff.getTime() - Date.now();

    /*
     * ------------------------------------------------
     * 30 MINUTEN VOR ANPFIFF
     * ------------------------------------------------
     */

    if (
      msUntilKickoff > 0 &&
      msUntilKickoff <= PREMATCH_WINDOW_MS
    ) {
      const wasSent = await notifyOnce(
        supabase,
        pushConfigured,
        match.id,
        "pre30",
        {
          title: "⏰ Noch 30 Minuten",
          body: `${getDatabaseMatchLabel(
            match,
          )} startet in 30 Minuten.`,
          url: "/",
        },
      );

      if (wasSent) {
        notifications++;
      }

      /*
       * Vor dem Anpfiff brauchen wir
       * API-Football noch nicht aufzurufen.
       */
      continue;
    }

    /*
     * Falls das Spiel noch nicht gestartet hat
     * und wir ausserhalb des 30-Minuten-Fensters sind.
     */
    if (msUntilKickoff > 0) {
      continue;
    }

    const fixtureId =
      match.api_fixture_id;

    if (!fixtureId) {
      continue;
    }

    try {
      /*
       * ------------------------------------------------
       * FIXTURE
       * ------------------------------------------------
       */

      const fixtureResponse =
        await fetch(
          `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
          {
            headers,
            cache: "no-store",
          },
        );

      const fixtureData =
        await fixtureResponse.json();

      if (
        !fixtureResponse.ok ||
        (
          fixtureData.errors &&
          Object.keys(
            fixtureData.errors,
          ).length > 0
        )
      ) {
        console.error(
          "Fixture API Fehler:",
          fixtureData.errors,
        );

        continue;
      }

      const fixture =
        fixtureData.response?.[0];

      if (!fixture) {
        continue;
      }

      /*
       * ------------------------------------------------
       * EVENTS
       * ------------------------------------------------
       */

      const eventsResponse =
        await fetch(
          `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
          {
            headers,
            cache: "no-store",
          },
        );

      const eventsData =
        await eventsResponse.json();

      const events: ApiEvent[] =
        eventsResponse.ok &&
        Array.isArray(eventsData.response)
          ? eventsData.response
          : [];

      /*
       * ------------------------------------------------
       * STATISTIK
       * ------------------------------------------------
       */

      const statisticsResponse =
        await fetch(
          `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
          {
            headers,
            cache: "no-store",
          },
        );

      const statisticsData =
        await statisticsResponse.json();

      const statistics =
        statisticsResponse.ok &&
        Array.isArray(
          statisticsData.response,
        )
          ? statisticsData.response
          : [];

      /*
       * ------------------------------------------------
       * AUFSTELLUNGEN
       * ------------------------------------------------
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
            },
          );

        const lineupsData =
          await lineupsResponse.json();

        if (
          lineupsResponse.ok &&
          Array.isArray(
            lineupsData.response,
          )
        ) {
          lineups =
            lineupsData.response;
        }
      }

      /*
       * ------------------------------------------------
       * SPIELSTATUS
       * ------------------------------------------------
       */

      const status =
        fixture.fixture?.status?.short ??
        null;

      const elapsed =
        fixture.fixture?.status?.elapsed ??
        null;

      const extra =
        fixture.fixture?.status?.extra ??
        null;

      const homeScore =
        fixture.goals?.home ?? null;

      const awayScore =
        fixture.goals?.away ?? null;

      const homeName =
        fixture.teams?.home?.name ??
        (
          match.is_home
            ? FCSG_NAME
            : match.opponent
        );

      const awayName =
        fixture.teams?.away?.name ??
        (
          match.is_home
            ? match.opponent
            : FCSG_NAME
        );

      const isFinished =
        status !== null &&
        ["FT", "AET", "PEN"].includes(
          status,
        );

      /*
       * ------------------------------------------------
       * ANPFIFF
       * ------------------------------------------------
       *
       * Nur während der ersten paar Minuten.
       * So vermeiden wir einen verspäteten
       * "Anpfiff"-Push, falls der Server
       * erst in der 30. Minute wieder online wäre.
       */

      if (
        status === "1H" &&
        (
          elapsed === null ||
          elapsed <= 5
        )
      ) {
        const wasSent =
          await notifyOnce(
            supabase,
            pushConfigured,
            match.id,
            "kickoff",
            {
              title: "🟢 Anpfiff!",
              body: `${homeName} – ${awayName}`,
              url: "/",
            },
          );

        if (wasSent) {
          notifications++;
        }
      }

      /*
       * ------------------------------------------------
       * NEUE SPIELEREIGNISSE
       * ------------------------------------------------
       */

      const previousEvents: ApiEvent[] =
        Array.isArray(
          match.live_events,
        )
          ? match.live_events
          : [];

      const previousSignatures =
        new Set(
          previousEvents.map(
            eventSignature,
          ),
        );

      for (const event of events) {
        const signature =
          eventSignature(event);

        /*
         * Dieses Event war beim letzten Sync
         * bereits vorhanden.
         */
        if (
          previousSignatures.has(
            signature,
          )
        ) {
          continue;
        }

        const type =
          event.type ?? "";

        const detail =
          event.detail ?? "";

        const detailLower =
          detail.toLowerCase();

        const playerName =
          event.player?.name ||
          "Unbekannter Spieler";

        const teamName =
          event.team?.name ||
          "Unbekanntes Team";

        const teamId =
          event.team?.id ?? null;

        const minute =
          formatMinute(
            event.time?.elapsed,
            event.time?.extra,
          );

        const scoreText =
          getScoreLabel(
            homeName,
            awayName,
            homeScore,
            awayScore,
          );

        /*
         * ----------------------------------------------
         * TOR
         * ----------------------------------------------
         */

        if (
          type === "Goal" &&
          !detailLower.includes(
            "missed penalty",
          )
        ) {
          const title =
            teamId === FCSG_TEAM_ID
              ? "⚽ TOR FCSG!"
              : `⚽ Tor ${teamName}`;

          const wasSent =
            await notifyOnce(
              supabase,
              pushConfigured,
              match.id,
              eventNotificationKey(
                event,
              ),
              {
                title,
                body: `${scoreText} • ${minute} • ${playerName}`,
                url: "/",
              },
            );

          if (wasSent) {
            notifications++;
          }

          continue;
        }

        /*
         * ----------------------------------------------
         * KARTEN
         * ----------------------------------------------
         */

        if (type === "Card") {
          const isRed =
            detailLower.includes(
              "red",
            ) ||
            detailLower.includes(
              "second yellow",
            );

          const isYellow =
            detailLower.includes(
              "yellow",
            ) &&
            !isRed;

          if (isRed) {
            const wasSent =
              await notifyOnce(
                supabase,
                pushConfigured,
                match.id,
                eventNotificationKey(
                  event,
                ),
                {
                  title: `🟥 Rote Karte – ${teamName}`,
                  body: `${scoreText} • ${minute} • ${playerName}`,
                  url: "/",
                },
              );

            if (wasSent) {
              notifications++;
            }

            continue;
          }

          if (isYellow) {
            const wasSent =
              await notifyOnce(
                supabase,
                pushConfigured,
                match.id,
                eventNotificationKey(
                  event,
                ),
                {
                  title: `🟨 Gelbe Karte – ${teamName}`,
                  body: `${scoreText} • ${minute} • ${playerName}`,
                  url: "/",
                },
              );

            if (wasSent) {
              notifications++;
            }
          }
        }
      }

      /*
       * ------------------------------------------------
       * HALBZEIT
       * ------------------------------------------------
       */

      if (status === "HT") {
        const wasSent =
          await notifyOnce(
            supabase,
            pushConfigured,
            match.id,
            "halftime",
            {
              title: "⏸ Halbzeit",
              body: getScoreLabel(
                homeName,
                awayName,
                homeScore,
                awayScore,
              ),
              url: "/",
            },
          );

        if (wasSent) {
          notifications++;
        }
      }

      /*
       * ------------------------------------------------
       * START ZWEITE HALBZEIT
       * ------------------------------------------------
       */

      if (status === "2H") {
        const wasSent =
          await notifyOnce(
            supabase,
            pushConfigured,
            match.id,
            "second_half",
            {
              title:
                "▶️ Zweite Halbzeit läuft",
              body: getScoreLabel(
                homeName,
                awayName,
                homeScore,
                awayScore,
              ),
              url: "/",
            },
          );

        if (wasSent) {
          notifications++;
        }
      }

      /*
       * ------------------------------------------------
       * SCHLUSSPFIFF
       * ------------------------------------------------
       */

      if (
        isFinished &&
        homeScore !== null &&
        awayScore !== null
      ) {
        let finalBody =
          getScoreLabel(
            homeName,
            awayName,
            homeScore,
            awayScore,
          );

        /*
         * Bei Elfmeterschiessen zeigen wir,
         * falls vorhanden, zusätzlich
         * das Penalty-Ergebnis.
         */
        const penaltyHome =
          fixture.score?.penalty?.home;

        const penaltyAway =
          fixture.score?.penalty?.away;

        if (
          status === "PEN" &&
          penaltyHome !== null &&
          penaltyHome !== undefined &&
          penaltyAway !== null &&
          penaltyAway !== undefined
        ) {
          finalBody +=
            ` • Penalty ${penaltyHome}:${penaltyAway}`;
        }

        const wasSent =
          await notifyOnce(
            supabase,
            pushConfigured,
            match.id,
            "fulltime",
            {
              title: "🏁 Schlusspfiff",
              body: finalBody,
              url: "/",
            },
          );

        if (wasSent) {
          notifications++;
        }
      }

      /*
       * ------------------------------------------------
       * MATCH IN SUPABASE AKTUALISIEREN
       * ------------------------------------------------
       */

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
          ApiEvent[];

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
        live_home_score: homeScore,
        live_away_score: awayScore,
        live_events: events,
        live_lineups: lineups,
        live_statistics: statistics,
      };

      /*
       * Endresultat speichern.
       * Dadurch wird weiterhin dein
       * bestehender Punkte-Trigger ausgelöst.
       */

      if (
        isFinished &&
        homeScore !== null &&
        awayScore !== null
      ) {
        updateData.finished = true;

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

      const { error: updateError } =
        await supabase
          .from("matches")
          .update(updateData)
          .eq("id", match.id);

      if (updateError) {
        console.error(
          `Supabase Update Fehler Match ${match.id}:`,
          updateError,
        );

        continue;
      }

      synced++;
    } catch (error) {
      console.error(
        `Sync Fehler Match ${match.id}:`,
        error,
      );
    }
  }

  /*
   * --------------------------------------------------
   * RESPONSE
   * --------------------------------------------------
   */

  return Response.json({
    success: true,
    synced,
    notifications,
  });
}