"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchDetails } from "@/components/match-details";

type TipFormProps = {
  matchId: number;
  kickoff: string;
  isHome: boolean;
  finished: boolean;
  fcsgScore: number | null;
  opponentScore: number | null;
  opponentName: string;
  opponentLogo: string | null;
  liveEvents: unknown[] | null;
  liveLineups: unknown[] | null;
};

export function TipForm({
  matchId,
  kickoff,
  isHome,
  finished,
  fcsgScore,
  opponentScore,
  opponentName,
  opponentLogo,
  liveEvents,
  liveLineups,
}: TipFormProps) {
  const [fcsgTip, setFcsgTip] = useState("");
  const [opponentTip, setOpponentTip] = useState("");

  const [savedFcsgTip, setSavedFcsgTip] = useState<string | null>(null);
  const [savedOpponentTip, setSavedOpponentTip] = useState<string | null>(null);

  const [points, setPoints] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const gameStarted = new Date() >= new Date(kickoff);

  useEffect(() => {
    async function loadTip() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("tips")
        .select("fcsg_tip, opponent_tip, points")
        .eq("user_id", user.id)
        .eq("match_id", matchId)
        .maybeSingle();

      if (data) {
        const fcsgValue = String(data.fcsg_tip);
        const opponentValue = String(data.opponent_tip);

        setFcsgTip(fcsgValue);
        setOpponentTip(opponentValue);

        setSavedFcsgTip(fcsgValue);
        setSavedOpponentTip(opponentValue);

        setPoints(data.points ?? 0);
      }
    }

    loadTip();
  }, [matchId]);

  async function saveTip() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Du musst eingeloggt sein.");
      setLoading(false);
      return;
    }

    if (gameStarted) {
      setMessage("Die Tippabgabe ist bereits geschlossen.");
      setLoading(false);
      return;
    }

    if (fcsgTip === "" || opponentTip === "") {
      setMessage("Bitte beide Resultate eingeben.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("tips").upsert(
      {
        user_id: user.id,
        match_id: matchId,
        fcsg_tip: Number(fcsgTip),
        opponent_tip: Number(opponentTip),
      },
      {
        onConflict: "user_id,match_id",
      }
    );

    if (error) {
      setMessage(`Fehler: ${error.message}`);
    } else {
      setSavedFcsgTip(fcsgTip);
      setSavedOpponentTip(opponentTip);
      setMessage("");
    }

    setLoading(false);
  }

  const displayedTipLeft = isHome ? fcsgTip : opponentTip;
  const displayedTipRight = isHome ? opponentTip : fcsgTip;

  const displayedSavedLeft =
    savedFcsgTip === null || savedOpponentTip === null
      ? null
      : isHome
        ? savedFcsgTip
        : savedOpponentTip;

  const displayedSavedRight =
    savedFcsgTip === null || savedOpponentTip === null
      ? null
      : isHome
        ? savedOpponentTip
        : savedFcsgTip;

  const displayedScoreLeft = isHome ? fcsgScore : opponentScore;
  const displayedScoreRight = isHome ? opponentScore : fcsgScore;

  const leftTeamName = isHome ? "FC St. Gallen" : opponentName;
  const rightTeamName = isHome ? opponentName : "FC St. Gallen";

  const leftTeamLogo = isHome
    ? "/logos/fcsg.svg"
    : opponentLogo;

  const rightTeamLogo = isHome
    ? opponentLogo
    : "/logos/fcsg.svg";

  const statusText = finished
  ? "BEENDET"
  : gameStarted
    ? "LIVE"
    : "TIPPEN OFFEN";

const statusClass = finished
  ? "bg-gray-200 text-gray-700"
  : gameStarted
    ? "bg-red-600 text-white"
    : "bg-green-100 text-green-800";

  return (
    <div className="mt-5">
      {/* Status */}
      <div className="flex justify-center mb-5">
        <span
  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wide ${statusClass}`}
>
  {gameStarted && !finished && (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
    </span>
  )}

  {statusText}
</span>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* Links */}
        <div className="flex flex-col items-center text-center">
          <p className="font-bold mb-3 min-h-12 flex items-end">
            {leftTeamName}
          </p>

          <div className="w-24 h-24 flex items-center justify-center mb-4">
            {leftTeamLogo ? (
              <img
                src={leftTeamLogo}
                alt={`${leftTeamName} Logo`}
                className="w-20 h-20 object-contain"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">
                Kein Logo
              </div>
            )}
          </div>

          {!finished && (
            <input
              type="number"
              min="0"
              value={displayedTipLeft}
              disabled={gameStarted}
              onChange={(e) =>
                isHome
                  ? setFcsgTip(e.target.value)
                  : setOpponentTip(e.target.value)
              }
              className="
                w-20 h-14
                border-2 border-gray-200
                rounded-xl
                text-center text-2xl font-black
                focus:outline-none focus:border-green-700
                disabled:bg-gray-100
              "
            />
          )}
        </div>

        {/* Mitte */}
        <div className="flex flex-col items-center">
          {finished &&
          displayedScoreLeft !== null &&
          displayedScoreRight !== null ? (
            <>
              <span className="text-xs text-gray-500 font-semibold mb-1">
                ENDSTAND
              </span>

              <span className="text-4xl font-black">
                {displayedScoreLeft} : {displayedScoreRight}
              </span>
            </>
          ) : (
            <span className="text-2xl font-black text-gray-500">
              VS
            </span>
          )}
        </div>

        {/* Rechts */}
        <div className="flex flex-col items-center text-center">
          <p className="font-bold mb-3 min-h-12 flex items-end">
            {rightTeamName}
          </p>

          <div className="w-24 h-24 flex items-center justify-center mb-4">
            {rightTeamLogo ? (
              <img
                src={rightTeamLogo}
                alt={`${rightTeamName} Logo`}
                className="w-20 h-20 object-contain"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">
                Kein Logo
              </div>
            )}
          </div>

          {!finished && (
            <input
              type="number"
              min="0"
              value={displayedTipRight}
              disabled={gameStarted}
              onChange={(e) =>
                isHome
                  ? setOpponentTip(e.target.value)
                  : setFcsgTip(e.target.value)
              }
              className="
                w-20 h-14
                border-2 border-gray-200
                rounded-xl
                text-center text-2xl font-black
                focus:outline-none focus:border-green-700
                disabled:bg-gray-100
              "
            />
          )}
        </div>
      </div>

      {/* Speichern */}
      {!gameStarted && !finished && (
        <button
          onClick={saveTip}
          disabled={loading}
          className="
            w-full mt-6
            bg-green-700 hover:bg-green-800
            text-white
            px-4 py-3
            rounded-xl
            font-black
            transition
            active:scale-[0.99]
            disabled:bg-gray-400
          "
        >
          {loading ? "Speichert..." : "Tipp speichern"}
        </button>
      )}

      {/* Gespeicherter Tipp */}
      {!finished &&
        displayedSavedLeft !== null &&
        displayedSavedRight !== null && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 font-bold text-center">
            ✓ Gespeichert: {displayedSavedLeft} : {displayedSavedRight}
          </div>
        )}

      {/* Laufendes Spiel */}
      {gameStarted && !finished && (
        <p className="text-red-600 text-sm mt-4 text-center font-semibold">
          Die Tippabgabe ist geschlossen.
        </p>
      )}

      {/* Eigenes Ergebnis bei beendetem Spiel */}
      {finished &&
        displayedSavedLeft !== null &&
        displayedSavedRight !== null && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                Dein Tipp
              </span>

              <span className="font-black text-lg">
                {displayedSavedLeft} : {displayedSavedRight}
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

      {message && (
        <p className="text-sm mt-3 font-medium text-center">
          {message}
        </p>
      )}
     <MatchDetails
  events={liveEvents as any[]}
  lineups={liveLineups as any[]}
  isHome={isHome}
  opponentName={opponentName}
/>
    </div>
  );
}