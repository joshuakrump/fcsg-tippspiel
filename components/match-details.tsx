"use client";

import { useState } from "react";

const FCSG_TEAM_ID = 1011;

type MatchEvent = {
  time?: {
    elapsed?: number | null;
    extra?: number | null;
  };
  team?: {
    id?: number;
    name?: string;
  };
  player?: {
    name?: string | null;
  };
  assist?: {
    name?: string | null;
  };
  type?: string;
  detail?: string;
};

type MatchLineup = {
  team?: {
    id?: number;
    name?: string;
  };
  formation?: string | null;
  coach?: {
    name?: string | null;
  };
  startXI?: Array<{
    player?: {
      name?: string | null;
      number?: number | null;
      pos?: string | null;
    };
  }>;
  substitutes?: Array<{
    player?: {
      name?: string | null;
      number?: number | null;
      pos?: string | null;
    };
  }>;
};

type MatchDetailsProps = {
  events: MatchEvent[] | null;
  lineups: MatchLineup[] | null;
  isHome: boolean;
  opponentName: string;
};

function getMinute(event: MatchEvent) {
  const elapsed = event.time?.elapsed ?? "?";
  const extra = event.time?.extra;

  return extra
    ? `${elapsed}+${extra}'`
    : `${elapsed}'`;
}

function getEventIcon(event: MatchEvent) {
  const type = event.type?.toLowerCase() ?? "";
  const detail = event.detail?.toLowerCase() ?? "";

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

  if (type === "subst") {
    return "🔄";
  }

  if (type === "var") {
    return "📺";
  }

  return "•";
}

function TeamEvents({
  events,
}: {
  events: MatchEvent[];
}) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        Keine Ereignisse
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div
          key={index}
          className="border-b border-gray-100 pb-3 last:border-0"
        >
          <div className="flex gap-2 items-start">
            <span className="text-sm font-black whitespace-nowrap">
              {getMinute(event)}
            </span>

            <span>
              {getEventIcon(event)}
            </span>

            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight">
                {event.player?.name ??
                  event.detail ??
                  "Ereignis"}
              </p>

              {event.type?.toLowerCase() === "goal" &&
                event.assist?.name && (
                  <p className="text-xs text-gray-500 mt-1">
                    Assist: {event.assist.name}
                  </p>
                )}

              {event.detail &&
                event.type?.toLowerCase() !== "goal" && (
                  <p className="text-xs text-gray-400 mt-1">
                    {event.detail}
                  </p>
                )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamLineup({
  lineup,
}: {
  lineup: MatchLineup | undefined;
}) {
  if (!lineup) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        Keine Aufstellung
      </p>
    );
  }

  return (
    <div>
      {lineup.formation && (
        <p className="text-xs text-gray-500 mb-1">
          Formation:{" "}
          <strong>{lineup.formation}</strong>
        </p>
      )}

      {lineup.coach?.name && (
        <p className="text-xs text-gray-500 mb-4">
          Trainer: {lineup.coach.name}
        </p>
      )}

      <p className="font-black text-sm mb-2">
        Startelf
      </p>

      <div className="space-y-1.5">
        {lineup.startXI?.map((entry, index) => (
          <p
            key={index}
            className="text-xs sm:text-sm"
          >
            {entry.player?.number
              ? `${entry.player.number}. `
              : ""}

            {entry.player?.name ?? "Spieler"}
          </p>
        ))}
      </div>

      {lineup.substitutes &&
        lineup.substitutes.length > 0 && (
          <>
            <p className="font-black text-sm mt-5 mb-2">
              Ersatzbank
            </p>

            <div className="space-y-1.5">
              {lineup.substitutes.map(
                (entry, index) => (
                  <p
                    key={index}
                    className="text-xs sm:text-sm text-gray-600"
                  >
                    {entry.player?.number
                      ? `${entry.player.number}. `
                      : ""}

                    {entry.player?.name ?? "Spieler"}
                  </p>
                )
              )}
            </div>
          </>
        )}
    </div>
  );
}

export function MatchDetails({
  events,
  lineups,
  isHome,
  opponentName,
}: MatchDetailsProps) {
  const [open, setOpen] = useState(false);

  const [tab, setTab] = useState<
    "events" | "lineups"
  >("events");

  const allEvents = events ?? [];
  const allLineups = lineups ?? [];

  /*
   * FCSG / Gegner zuerst eindeutig trennen
   */
  const fcsgEvents = allEvents.filter(
    (event) =>
      Number(event.team?.id) === FCSG_TEAM_ID
  );

  const opponentEvents = allEvents.filter(
    (event) =>
      event.team?.id &&
      Number(event.team.id) !== FCSG_TEAM_ID
  );

  const fcsgLineup = allLineups.find(
    (lineup) =>
      Number(lineup.team?.id) === FCSG_TEAM_ID
  );

  const opponentLineup = allLineups.find(
    (lineup) =>
      lineup.team?.id &&
      Number(lineup.team.id) !== FCSG_TEAM_ID
  );

  /*
   * EXAKT dieselbe Links-/Rechts-Logik
   * wie oben in der Tippkarte
   */
  const leftTeamName = isHome
    ? "FC St. Gallen"
    : opponentName;

  const rightTeamName = isHome
    ? opponentName
    : "FC St. Gallen";

  const leftEvents = isHome
    ? fcsgEvents
    : opponentEvents;

  const rightEvents = isHome
    ? opponentEvents
    : fcsgEvents;

  const leftLineup = isHome
    ? fcsgLineup
    : opponentLineup;

  const rightLineup = isHome
    ? opponentLineup
    : fcsgLineup;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        className="
          w-full
          flex items-center justify-between
          bg-gray-100 hover:bg-gray-200
          px-4 py-3
          rounded-xl
          font-bold
          transition
        "
      >
        <span>Matchdetails</span>

        <span>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="mt-3 border border-gray-200 rounded-xl p-4">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() =>
                setTab("events")
              }
              className={`px-3 py-2.5 rounded-lg font-semibold ${
                tab === "events"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Ereignisse
            </button>

            <button
              type="button"
              onClick={() =>
                setTab("lineups")
              }
              className={`px-3 py-2.5 rounded-lg font-semibold ${
                tab === "lineups"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Aufstellung
            </button>
          </div>

          {/* Teamnamen */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <p className="font-black text-center text-sm sm:text-base">
              {leftTeamName}
            </p>

            <p className="font-black text-center text-sm sm:text-base">
              {rightTeamName}
            </p>
          </div>

          {/* Events */}
          {tab === "events" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div className="pr-3 sm:pr-5 border-r border-gray-200">
                <TeamEvents
                  events={leftEvents}
                />
              </div>

              <div className="pl-1">
                <TeamEvents
                  events={rightEvents}
                />
              </div>
            </div>
          )}

          {/* Aufstellung */}
          {tab === "lineups" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div className="pr-3 sm:pr-5 border-r border-gray-200">
                <TeamLineup
                  lineup={leftLineup}
                />
              </div>

              <div className="pl-1">
                <TeamLineup
                  lineup={rightLineup}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}