"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchDetails } from "@/components/match-details";

const FCSG_TEAM_ID = 1011;

type MatchEvent = {
  time?: {
    elapsed?: number | null;
    extra?: number | null;
  };
  team?: {
    id?: number | string | null;
    name?: string | null;
  };
  player?: {
    name?: string | null;
  };
  assist?: {
    name?: string | null;
  };
  type?: string | null;
  detail?: string | null;
};

type TipFormProps = {
  matchId: number;
  kickoff: string;
  isHome: boolean;
  finished: boolean;

  fcsgScore: number | null;
  opponentScore: number | null;

  opponentName: string;
  opponentLogo: string | null;

  liveStatus: string | null;
  liveMinute: number | null;
  liveExtra: number | null;
  liveHomeScore: number | null;
  liveAwayScore: number | null;

  liveEvents: unknown[] | null;
  liveLineups: unknown[] | null;
  liveStatistics: unknown[] | null;
};

function getEventMinute(event: MatchEvent) {
  const elapsed = event.time?.elapsed;

  if (elapsed === null || elapsed === undefined) {
    return "";
  }

  const extra = event.time?.extra;

  return extra
    ? `${elapsed}+${extra}'`
    : `${elapsed}'`;
}

function getEventIcon(event: MatchEvent) {
  const type =
    event.type?.toLowerCase() ?? "";

  const detail =
    event.detail?.toLowerCase() ?? "";

  if (type === "goal") {
    return "⚽";
  }

  if (type === "card") {
    if (
      detail.includes("red") ||
      detail.includes("second yellow")
    ) {
      return "🟥";
    }

    return "🟨";
  }

  return "";
}

/*
 * TORE + KARTEN AUF DER HAUPTKARTE
 *
 * Mobile:
 * kompakte Darstellung, damit beide Teams
 * weiterhin nebeneinander bleiben können.
 */
function TeamKeyEvents({
  events,
}: {
  events: MatchEvent[];
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-4 space-y-2">
      {events.map((event, index) => (
        <div
          key={index}
          className="
            bg-gray-50
            border border-gray-100
            rounded-lg
            px-2 py-2
            sm:px-3 sm:py-2.5
            text-left
          "
        >
          <div
            className="
              grid
              grid-cols-[auto_auto_1fr]
              gap-x-1.5
              sm:gap-x-2
              items-start
            "
          >
            {/* Minute */}
            <span
              className="
                text-[11px]
                sm:text-xs
                font-black
                whitespace-nowrap
                leading-tight
              "
            >
              {getEventMinute(event)}
            </span>

            {/* Icon */}
            <span
              className="
                text-xs
                sm:text-sm
                leading-tight
              "
            >
              {getEventIcon(event)}
            </span>

            {/* Spieler */}
            <div className="min-w-0">
              <p
                className="
                  text-[11px]
                  sm:text-sm
                  font-bold
                  leading-[1.15]
                  break-words
                "
              >
                {event.player?.name ??
                  "Unbekannter Spieler"}
              </p>

              {event.type?.toLowerCase() === "goal" &&
                event.assist?.name && (
                  <p
                    className="
                      text-[9px]
                      sm:text-xs
                      text-gray-500
                      mt-1
                      leading-tight
                      break-words
                    "
                  >
                    Assist: {event.assist.name}
                  </p>
                )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TipForm({
  matchId,
  kickoff,
  isHome,
  finished,

  fcsgScore,
  opponentScore,

  opponentName,
  opponentLogo,

  liveStatus,
  liveMinute,
  liveExtra,
  liveHomeScore,
  liveAwayScore,

  liveEvents,
  liveLineups,
  liveStatistics,
}: TipFormProps) {
  const [fcsgTip, setFcsgTip] =
    useState("");

  const [opponentTip, setOpponentTip] =
    useState("");

  const [
    savedFcsgTip,
    setSavedFcsgTip,
  ] = useState<string | null>(null);

  const [
    savedOpponentTip,
    setSavedOpponentTip,
  ] = useState<string | null>(null);

  const [points, setPoints] =
    useState<number | null>(null);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /*
   * Lokale Live-Minute.
   * Sie wird zwischen den Server-Refreshes
   * auf dem Gerät weitergezählt.
   */
  const [
    displayLiveMinute,
    setDisplayLiveMinute,
  ] = useState<number | null>(
    liveMinute
  );

  const supabase = createClient();

  const gameStarted =
    new Date() >= new Date(kickoff);

  /*
   * EIGENEN TIPP LADEN
   */
  useEffect(() => {
    async function loadTip() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("tips")
        .select(
          "fcsg_tip, opponent_tip, points"
        )
        .eq("user_id", user.id)
        .eq("match_id", matchId)
        .maybeSingle();

      if (data) {
        const fcsgValue = String(
          data.fcsg_tip
        );

        const opponentValue = String(
          data.opponent_tip
        );

        setFcsgTip(fcsgValue);
        setOpponentTip(opponentValue);

        setSavedFcsgTip(fcsgValue);
        setSavedOpponentTip(
          opponentValue
        );

        setPoints(data.points ?? 0);
      }
    }

    loadTip();
  }, [matchId]);

  /*
   * LIVE-MINUTE LOKAL WEITERZÄHLEN
   */
  useEffect(() => {
    /*
     * Bei jedem neuen API-Wert
     * wieder exakt synchronisieren.
     */
    setDisplayLiveMinute(
      liveMinute
    );

    /*
     * Keine lokale Uhr bei:
     * - beendet
     * - noch nicht gestartet
     * - Halbzeit
     * - keiner verfügbaren Minute
     */
    if (
      finished ||
      liveStatus === "NS" ||
      liveStatus === "HT" ||
      liveMinute === null
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        setDisplayLiveMinute(
          (current) => {
            if (current === null) {
              return liveMinute;
            }

            /*
             * Ab Minute 90 zählen wir
             * nicht künstlich weiter.
             * Nachspielzeit liefert
             * API-Football über liveExtra.
             */
            if (current >= 90) {
              return current;
            }

            return current + 1;
          }
        );
      }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, [
    liveMinute,
    liveStatus,
    finished,
  ]);

  /*
   * TIPP SPEICHERN
   */
  async function saveTip() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setMessage(
        "Du musst eingeloggt sein."
      );
      setLoading(false);
      return;
    }

    if (gameStarted) {
      setMessage(
        "Die Tippabgabe ist bereits geschlossen."
      );
      setLoading(false);
      return;
    }

    if (
      fcsgTip === "" ||
      opponentTip === ""
    ) {
      setMessage(
        "Bitte beide Resultate eingeben."
      );
      setLoading(false);
      return;
    }

    const { error } =
      await supabase
        .from("tips")
        .upsert(
          {
            user_id: user.id,

            match_id: matchId,

            fcsg_tip:
              Number(fcsgTip),

            opponent_tip:
              Number(opponentTip),
          },
          {
            onConflict:
              "user_id,match_id",
          }
        );

    if (error) {
      setMessage(
        `Fehler: ${error.message}`
      );
    } else {
      setSavedFcsgTip(fcsgTip);
      setSavedOpponentTip(
        opponentTip
      );
      setMessage("");
    }

    setLoading(false);
  }

  /*
   * TIPP LINKS / RECHTS
   */
  const displayedTipLeft =
    isHome
      ? fcsgTip
      : opponentTip;

  const displayedTipRight =
    isHome
      ? opponentTip
      : fcsgTip;

  const displayedSavedLeft =
    savedFcsgTip === null ||
    savedOpponentTip === null
      ? null
      : isHome
        ? savedFcsgTip
        : savedOpponentTip;

  const displayedSavedRight =
    savedFcsgTip === null ||
    savedOpponentTip === null
      ? null
      : isHome
        ? savedOpponentTip
        : savedFcsgTip;

  /*
   * ENDSTAND
   */
  const displayedScoreLeft =
    isHome
      ? fcsgScore
      : opponentScore;

  const displayedScoreRight =
    isHome
      ? opponentScore
      : fcsgScore;

  /*
   * TEAMNAMEN
   */
  const leftTeamName =
    isHome
      ? "FC St. Gallen"
      : opponentName;

  const rightTeamName =
    isHome
      ? opponentName
      : "FC St. Gallen";

  /*
   * LOGOS
   */
  const leftTeamLogo =
    isHome
      ? "/logos/fcsg.svg"
      : opponentLogo;

  const rightTeamLogo =
    isHome
      ? opponentLogo
      : "/logos/fcsg.svg";

  /*
   * LIVE-SPIELSTAND
   */
  const liveScoreLeft =
    isHome
      ? liveHomeScore
      : liveAwayScore;

  const liveScoreRight =
    isHome
      ? liveAwayScore
      : liveHomeScore;

  /*
   * EVENTS
   */
  const allEvents =
    (liveEvents ?? []) as MatchEvent[];

  /*
   * Auf Hauptkarte nur
   * Tore und Karten.
   */
  const keyEvents =
    allEvents.filter(
      (event) => {
        const type =
          event.type?.toLowerCase();

        return (
          type === "goal" ||
          type === "card"
        );
      }
    );

  const fcsgKeyEvents =
    keyEvents.filter(
      (event) =>
        Number(event.team?.id) ===
        FCSG_TEAM_ID
    );

  const opponentKeyEvents =
    keyEvents.filter(
      (event) =>
        event.team?.id !== null &&
        event.team?.id !==
          undefined &&
        Number(event.team.id) !==
          FCSG_TEAM_ID
    );

  const leftKeyEvents =
    isHome
      ? fcsgKeyEvents
      : opponentKeyEvents;

  const rightKeyEvents =
    isHome
      ? opponentKeyEvents
      : fcsgKeyEvents;

  /*
   * LIVE STATUS
   */
  const isLive =
    !finished &&
    gameStarted &&
    liveStatus !== "NS";

  const liveMinuteText =
    displayLiveMinute !== null
      ? liveExtra
        ? `${displayLiveMinute}+${liveExtra}'`
        : `${displayLiveMinute}'`
      : null;

  const statusText =
    finished
      ? "BEENDET"
      : isLive
        ? liveMinuteText
          ? `LIVE · ${liveMinuteText}`
          : "LIVE"
        : gameStarted
          ? "LIVE"
          : "TIPPEN OFFEN";

  const statusClass =
    finished
      ? "bg-gray-200 text-gray-700"
      : gameStarted
        ? "bg-red-600 text-white"
        : "bg-green-100 text-green-800";

  return (
    <div className="mt-5">
      {/* STATUS */}
      <div className="flex justify-center mb-6">
        <span
          className={`
            inline-flex
            items-center
            gap-2
            px-4
            py-1.5
            rounded-full
            text-xs
            font-black
            tracking-wide
            ${statusClass}
          `}
        >
          {gameStarted &&
            !finished && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />

                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
            )}

          {statusText}
        </span>
      </div>

      {/* TEAMS */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-6 items-start">

        {/* LINKES TEAM */}
        <div className="flex flex-col items-center text-center min-w-0">
          <p className="font-bold mb-3 min-h-12 flex items-end justify-center text-sm sm:text-base">
            {leftTeamName}
          </p>

          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-4">
            {leftTeamLogo ? (
              <img
                src={leftTeamLogo}
                alt={`${leftTeamName} Logo`}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">
                Kein Logo
              </div>
            )}
          </div>

          {!finished &&
            !gameStarted && (
              <input
                type="number"
                min="0"
                value={
                  displayedTipLeft
                }
                onChange={(e) =>
                  isHome
                    ? setFcsgTip(
                        e.target.value
                      )
                    : setOpponentTip(
                        e.target.value
                      )
                }
                className="
                  w-16 h-12
                  sm:w-20 sm:h-14
                  border-2
                  border-gray-200
                  rounded-xl
                  text-center
                  text-xl
                  sm:text-2xl
                  font-black
                  focus:outline-none
                  focus:border-green-700
                "
              />
            )}

          {(gameStarted ||
            finished) && (
            <TeamKeyEvents
              events={
                leftKeyEvents
              }
            />
          )}
        </div>

        {/* MITTE */}
        <div className="flex flex-col items-center justify-center min-w-14 sm:min-w-20 pt-16">
          {finished &&
          displayedScoreLeft !==
            null &&
          displayedScoreRight !==
            null ? (
            <>
              <span className="text-[10px] sm:text-xs text-gray-500 font-semibold mb-1">
                ENDSTAND
              </span>

              <span className="text-3xl sm:text-4xl font-black whitespace-nowrap">
                {displayedScoreLeft}
                {" : "}
                {displayedScoreRight}
              </span>
            </>
          ) : gameStarted &&
            liveScoreLeft !== null &&
            liveScoreRight !== null ? (
            <>
              <span className="text-[10px] sm:text-xs text-red-600 font-bold mb-1">
                LIVE
              </span>

              <span className="text-3xl sm:text-4xl font-black whitespace-nowrap">
                {liveScoreLeft}
                {" : "}
                {liveScoreRight}
              </span>
            </>
          ) : (
            <span className="text-lg sm:text-xl font-black text-gray-400">
              VS
            </span>
          )}
        </div>

        {/* RECHTES TEAM */}
        <div className="flex flex-col items-center text-center min-w-0">
          <p className="font-bold mb-3 min-h-12 flex items-end justify-center text-sm sm:text-base">
            {rightTeamName}
          </p>

          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-4">
            {rightTeamLogo ? (
              <img
                src={rightTeamLogo}
                alt={`${rightTeamName} Logo`}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">
                Kein Logo
              </div>
            )}
          </div>

          {!finished &&
            !gameStarted && (
              <input
                type="number"
                min="0"
                value={
                  displayedTipRight
                }
                onChange={(e) =>
                  isHome
                    ? setOpponentTip(
                        e.target.value
                      )
                    : setFcsgTip(
                        e.target.value
                      )
                }
                className="
                  w-16 h-12
                  sm:w-20 sm:h-14
                  border-2
                  border-gray-200
                  rounded-xl
                  text-center
                  text-xl
                  sm:text-2xl
                  font-black
                  focus:outline-none
                  focus:border-green-700
                "
              />
            )}

          {(gameStarted ||
            finished) && (
            <TeamKeyEvents
              events={
                rightKeyEvents
              }
            />
          )}
        </div>
      </div>

      {/* TIPP SPEICHERN */}
      {!gameStarted &&
        !finished && (
          <button
            onClick={saveTip}
            disabled={loading}
            className="
              w-full
              mt-6
              bg-green-700
              hover:bg-green-800
              text-white
              px-4
              py-3
              rounded-xl
              font-black
              transition
              active:scale-[0.99]
              disabled:bg-gray-400
            "
          >
            {loading
              ? "Speichert..."
              : "Tipp speichern"}
          </button>
        )}

      {/* GESPEICHERTER TIPP */}
      {!finished &&
        !gameStarted &&
        displayedSavedLeft !==
          null &&
        displayedSavedRight !==
          null && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 font-bold text-center">
            ✓ Gespeichert:{" "}
            {displayedSavedLeft}
            {" : "}
            {displayedSavedRight}
          </div>
        )}

      {/* LAUFENDES SPIEL */}
      {gameStarted &&
        !finished && (
          <div className="mt-5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
            <p className="text-red-700 text-sm font-bold">
              Tippabgabe geschlossen
            </p>

            {displayedSavedLeft !==
              null &&
              displayedSavedRight !==
                null && (
                <p className="text-gray-700 mt-1 text-sm">
                  Dein Tipp:{" "}
                  <strong>
                    {displayedSavedLeft}
                    {" : "}
                    {displayedSavedRight}
                  </strong>
                </p>
              )}
          </div>
        )}

      {/* BEENDETES SPIEL */}
      {finished &&
        displayedSavedLeft !==
          null &&
        displayedSavedRight !==
          null && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                Dein Tipp
              </span>

              <span className="font-black text-lg">
                {displayedSavedLeft}
                {" : "}
                {displayedSavedRight}
              </span>
            </div>

            {points !== null && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600">
                  Punkte
                </span>

                <span className="font-black text-green-700 text-lg">
                  +{points}
                </span>
              </div>
            )}
          </div>
        )}

      {/* MELDUNG */}
      {message && (
        <p className="text-sm mt-3 font-medium text-center">
          {message}
        </p>
      )}

      {/* MATCHDETAILS */}
      <MatchDetails
        events={
          liveEvents as any[]
        }
        lineups={
          liveLineups as any[]
        }
        statistics={
          liveStatistics as any[]
        }
        isHome={isHome}
        opponentName={
          opponentName
        }
      />
    </div>
  );
}