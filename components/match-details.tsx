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

type MatchStatisticItem = {
  type?: string;
  value?: string | number | null;
};

type MatchStatisticTeam = {
  team?: {
    id?: number;
    name?: string;
  };
  statistics?: MatchStatisticItem[];
};

type MatchDetailsProps = {
  events: MatchEvent[] | null;
  lineups: MatchLineup[] | null;
  statistics?: MatchStatisticTeam[] | null;
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

/* =========================================================
   AUSWECHSLUNGEN
========================================================= */

function TeamSubstitutions({
  events,
}: {
  events: MatchEvent[];
}) {
  const substitutions = events.filter(
    (event) =>
      event.type?.toLowerCase() === "subst"
  );

  if (substitutions.length === 0) {
    return (
      <p className="text-[11px] sm:text-xs text-gray-400 text-center py-4">
        Keine Auswechslungen
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {substitutions.map((event, index) => (
        <div
          key={index}
          className="
            bg-gray-50
            border border-gray-100
            rounded-lg
            px-2 py-2
            sm:px-3 sm:py-3
          "
        >
          <div
            className="
              grid
              grid-cols-[auto_1fr]
              gap-x-2
              items-start
            "
          >
            <span
              className="
                text-[11px]
                sm:text-sm
                font-black
                whitespace-nowrap
                leading-tight
                pt-0.5
              "
            >
              {getMinute(event)}
            </span>

            <div className="min-w-0">
              <div
                className="
                  grid
                  grid-cols-[auto_1fr]
                  gap-x-1.5
                  items-start
                "
              >
                <span className="text-red-600 text-xs sm:text-sm leading-tight">
                  ↓
                </span>

                <p
                  className="
                    text-[11px]
                    sm:text-sm
                    font-bold
                    leading-[1.15]
                    break-words
                  "
                >
                  {event.player?.name ?? "Spieler"}
                </p>
              </div>

              <div
                className="
                  grid
                  grid-cols-[auto_1fr]
                  gap-x-1.5
                  items-start
                  mt-1
                "
              >
                <span className="text-green-700 text-xs sm:text-sm leading-tight">
                  ↑
                </span>

                <p
                  className="
                    text-[10px]
                    sm:text-sm
                    text-gray-700
                    font-semibold
                    leading-[1.15]
                    break-words
                  "
                >
                  {event.assist?.name ?? "Spieler"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   AUFSTELLUNG
========================================================= */

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

/* =========================================================
   STATISTIK
========================================================= */

function getStatisticValue(
  team: MatchStatisticTeam | undefined,
  type: string
) {
  const item = team?.statistics?.find(
    (stat) => stat.type === type
  );

  return item?.value ?? "-";
}

function StatisticsView({
  leftTeamName,
  rightTeamName,
  leftStatistics,
  rightStatistics,
}: {
  leftTeamName: string;
  rightTeamName: string;
  leftStatistics: MatchStatisticTeam | undefined;
  rightStatistics: MatchStatisticTeam | undefined;
}) {
  const rows = [
    {
      type: "Ball Possession",
      label: "Ballbesitz",
      bar: true,
    },
    {
      type: "Total Shots",
      label: "Schüsse",
    },
    {
      type: "Shots on Goal",
      label: "Schüsse aufs Tor",
    },
    {
      type: "Shots off Goal",
      label: "Schüsse neben das Tor",
    },
    {
      type: "Blocked Shots",
      label: "Geblockte Schüsse",
    },
    {
      type: "Shots insidebox",
      label: "Schüsse im Strafraum",
    },
    {
      type: "Shots outsidebox",
      label: "Schüsse ausserhalb",
    },
    {
      type: "Corner Kicks",
      label: "Eckbälle",
    },
    {
      type: "Offsides",
      label: "Abseits",
    },
    {
      type: "Fouls",
      label: "Fouls",
    },
    {
      type: "Yellow Cards",
      label: "Gelbe Karten",
    },
    {
      type: "Red Cards",
      label: "Rote Karten",
    },
    {
      type: "Goalkeeper Saves",
      label: "Paraden",
    },
    {
      type: "Total passes",
      label: "Pässe",
    },
    {
      type: "Passes accurate",
      label: "Angekommene Pässe",
    },
    {
      type: "Passes %",
      label: "Passquote",
    },
  ];

  if (!leftStatistics && !rightStatistics) {
    return (
      <div className="py-8 text-center">
        <div className="text-3xl mb-2">
          📊
        </div>

        <p className="font-bold text-gray-600">
          Noch keine Statistiken verfügbar
        </p>

        <p className="text-xs text-gray-400 mt-1">
          Die Daten erscheinen während des Spiels.
        </p>
      </div>
    );
  }

  function parsePercentage(
    value: string | number | null | undefined
  ) {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(
        value.replace("%", "")
      );

      return Number.isNaN(parsed)
        ? 0
        : parsed;
    }

    return 0;
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-6">
        <p className="font-black text-center text-sm sm:text-base">
          {leftTeamName}
        </p>

        <span className="text-gray-300 font-black">
          VS
        </span>

        <p className="font-black text-center text-sm sm:text-base">
          {rightTeamName}
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const leftValue =
            getStatisticValue(
              leftStatistics,
              row.type
            );

          const rightValue =
            getStatisticValue(
              rightStatistics,
              row.type
            );

          if (row.bar) {
            const leftPercentage =
              parsePercentage(
                leftValue === "-"
                  ? 0
                  : leftValue
              );

            const rightPercentage =
              parsePercentage(
                rightValue === "-"
                  ? 0
                  : rightValue
              );

            return (
              <div
                key={row.type}
                className="
                  bg-gray-50
                  border border-gray-100
                  rounded-xl
                  p-4
                "
              >
                <p className="text-xs text-gray-500 font-bold text-center mb-3">
                  {row.label}
                </p>

                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-lg">
                    {String(leftValue)}
                  </span>

                  <span className="font-black text-lg">
                    {String(rightValue)}
                  </span>
                </div>

                <div className="flex w-full h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="
                      h-full
                      bg-green-700
                      transition-all
                      duration-500
                    "
                    style={{
                      width: `${leftPercentage}%`,
                    }}
                  />

                  <div
                    className="
                      h-full
                      bg-gray-400
                      transition-all
                      duration-500
                    "
                    style={{
                      width: `${rightPercentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          }

          const leftNumber =
            typeof leftValue === "number"
              ? leftValue
              : Number(
                  String(leftValue)
                    .replace("%", "")
                );

          const rightNumber =
            typeof rightValue === "number"
              ? rightValue
              : Number(
                  String(rightValue)
                    .replace("%", "")
                );

          const leftBetter =
            !Number.isNaN(leftNumber) &&
            !Number.isNaN(rightNumber) &&
            leftNumber > rightNumber;

          const rightBetter =
            !Number.isNaN(leftNumber) &&
            !Number.isNaN(rightNumber) &&
            rightNumber > leftNumber;

          return (
            <div
              key={row.type}
              className="
                grid
                grid-cols-[1fr_1.6fr_1fr]
                gap-2
                items-center
                py-2
              "
            >
              <div className="text-center">
                <span
                  className={`
                    inline-flex
                    min-w-10
                    justify-center
                    px-2 py-1
                    rounded-lg
                    font-black
                    text-base
                    ${
                      leftBetter
                        ? "bg-green-100 text-green-800"
                        : "text-gray-900"
                    }
                  `}
                >
                  {String(leftValue)}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-500 font-semibold text-center">
                {row.label}
              </p>

              <div className="text-center">
                <span
                  className={`
                    inline-flex
                    min-w-10
                    justify-center
                    px-2 py-1
                    rounded-lg
                    font-black
                    text-base
                    ${
                      rightBetter
                        ? "bg-green-100 text-green-800"
                        : "text-gray-900"
                    }
                  `}
                >
                  {String(rightValue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   MATCHDETAILS
========================================================= */

export function MatchDetails({
  events,
  lineups,
  statistics,
  isHome,
  opponentName,
}: MatchDetailsProps) {
  const [open, setOpen] = useState(false);

  const [tab, setTab] = useState<
    "substitutions" | "lineups" | "statistics"
  >("substitutions");

  const allEvents = events ?? [];
  const allLineups = lineups ?? [];
  const allStatistics = statistics ?? [];

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

  const fcsgStatistics = allStatistics.find(
    (team) =>
      Number(team.team?.id) === FCSG_TEAM_ID
  );

  const opponentStatistics = allStatistics.find(
    (team) =>
      team.team?.id &&
      Number(team.team.id) !== FCSG_TEAM_ID
  );

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

  const leftStatistics = isHome
    ? fcsgStatistics
    : opponentStatistics;

  const rightStatistics = isHome
    ? opponentStatistics
    : fcsgStatistics;

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
          {/* TABS IMMER OBEN */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              type="button"
              onClick={() =>
                setTab("substitutions")
              }
              className={`
                min-w-0
                w-full
                px-1.5
                py-2.5
                rounded-lg
                text-[10px]
                sm:text-sm
                font-semibold
                whitespace-nowrap
                transition
                ${
                  tab === "substitutions"
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-700"
                }
              `}
            >
              Auswechslungen
            </button>

            <button
              type="button"
              onClick={() =>
                setTab("lineups")
              }
              className={`
                min-w-0
                w-full
                px-1.5
                py-2.5
                rounded-lg
                text-[10px]
                sm:text-sm
                font-semibold
                whitespace-nowrap
                transition
                ${
                  tab === "lineups"
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-700"
                }
              `}
            >
              Aufstellung
            </button>

            <button
              type="button"
              onClick={() =>
                setTab("statistics")
              }
              className={`
                min-w-0
                w-full
                px-1.5
                py-2.5
                rounded-lg
                text-[10px]
                sm:text-sm
                font-semibold
                whitespace-nowrap
                transition
                ${
                  tab === "statistics"
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-700"
                }
              `}
            >
              Statistik
            </button>
          </div>

          {/* AUSWECHSLUNGEN */}
          {tab === "substitutions" && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <p className="font-black text-center text-sm sm:text-base">
                  {leftTeamName}
                </p>

                <p className="font-black text-center text-sm sm:text-base">
                  {rightTeamName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-5">
                <div className="pr-3 sm:pr-5 border-r border-gray-200">
                  <TeamSubstitutions
                    events={leftEvents}
                  />
                </div>

                <div className="pl-1">
                  <TeamSubstitutions
                    events={rightEvents}
                  />
                </div>
              </div>
            </>
          )}

          {/* AUFSTELLUNG */}
          {tab === "lineups" && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <p className="font-black text-center text-sm sm:text-base">
                  {leftTeamName}
                </p>

                <p className="font-black text-center text-sm sm:text-base">
                  {rightTeamName}
                </p>
              </div>

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
            </>
          )}

          {/* STATISTIK */}
          {tab === "statistics" && (
            <StatisticsView
              leftTeamName={leftTeamName}
              rightTeamName={rightTeamName}
              leftStatistics={leftStatistics}
              rightStatistics={rightStatistics}
            />
          )}
        </div>
      )}
    </div>
  );
}