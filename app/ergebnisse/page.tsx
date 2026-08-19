import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { TipForm } from "@/components/tip-form";
import { MatchTips } from "@/components/match-tips";
import { AppShell } from "@/components/app-shell";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function getMonthGroup(kickoff: string) {
  const date = new Date(kickoff);
  const parts = new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);

  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: `${MONTH_NAMES[month - 1] ?? "Monat"} ${year}`,
  };
}

async function ResultsList() {
  const supabase = await createClient();

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("finished", true)
    .order("kickoff", { ascending: false });

  if (error) {
    return (
      <p className="text-red-300">
        Ergebnisse konnten nicht geladen werden: {error.message}
      </p>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-white text-black rounded-2xl p-6 shadow-xl">
        Noch keine abgeschlossenen Spiele vorhanden.
      </div>
    );
  }

  const groupedMatches = matches.reduce<
    { key: string; label: string; matches: typeof matches }[]
  >((groups, match) => {
    const monthGroup = getMonthGroup(match.kickoff);
    const existing = groups.find((group) => group.key === monthGroup.key);

    if (existing) {
      existing.matches.push(match);
    } else {
      groups.push({ ...monthGroup, matches: [match] });
    }

    return groups;
  }, []);

  return (
    <div className="space-y-5">
      {groupedMatches.map((group, groupIndex) => (
        <details
          key={group.key}
          open={groupIndex === 0}
          className="group bg-white text-black rounded-3xl border border-gray-200 overflow-hidden shadow-xl"
        >
          <summary className="cursor-pointer list-none px-5 sm:px-7 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-green-900">
                {group.label}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {group.matches.length} {group.matches.length === 1 ? "Spiel" : "Spiele"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-gray-400">
                Ergebnisse anzeigen
              </span>
              <span className="text-gray-400 text-lg group-open:rotate-180 transition-transform">
                ▼
              </span>
            </div>
          </summary>

          <div className="border-t border-gray-200 p-4 sm:p-6 space-y-5 bg-gray-50/50">
            {group.matches.map((match) => (
              <article
                key={match.id}
                className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-md border border-gray-200"
              >
                <div className="mb-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center bg-gray-100 text-gray-500 rounded-full px-3 py-1 text-xs font-semibold">
                      {new Date(match.kickoff).toLocaleString("de-CH", {
                        timeZone: "Europe/Zurich",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {match.competition_name && (
                      <span className="inline-flex items-center gap-2 bg-green-50 text-green-800 rounded-full px-3 py-1 text-xs font-bold">
                        {match.competition_logo && (
                          <img
                            src={match.competition_logo}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                        )}
                        {match.competition_name}
                        {match.competition_round ? ` · ${match.competition_round}` : ""}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                    {match.is_home
                      ? `FC St. Gallen – ${match.opponent}`
                      : `${match.opponent} – FC St. Gallen`}
                  </h3>
                </div>

                <TipForm
                  matchId={match.id}
                  kickoff={match.kickoff}
                  isHome={match.is_home}
                  finished={match.finished}
                  fcsgScore={match.fcsg_score}
                  opponentScore={match.opponent_score}
                  opponentName={match.opponent}
                  opponentLogo={match.opponent_logo}
                  liveStatus={match.live_status}
                  liveMinute={match.live_minute}
                  liveExtra={match.live_extra}
                  liveHomeScore={match.live_home_score}
                  liveAwayScore={match.live_away_score}
                  liveEvents={match.live_events}
                  liveLineups={match.live_lineups}
                  liveStatistics={match.live_statistics}
                />

                <MatchTips
                  matchId={match.id}
                  kickoff={match.kickoff}
                  isHome={match.is_home}
                  finished={match.finished}
                />
              </article>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export default function ErgebnissePage() {
  return (
    <AppShell>
      <AppHeader subtitle="Alle abgeschlossenen FCSG-Spiele" />
      <Navigation />
      <Suspense fallback={<p className="text-green-200">Ergebnisse werden geladen...</p>}>
        <ResultsList />
      </Suspense>
    </AppShell>
  );
}
