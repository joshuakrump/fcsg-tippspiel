import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";

async function SpielplanContent() {
  const supabase = await createClient();

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("finished", false)
    .order("kickoff", { ascending: true });

  if (error) {
    return <p className="text-red-300">Spielplan konnte nicht geladen werden.</p>;
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-white text-black rounded-3xl p-6 shadow-2xl">
        <p className="font-semibold">Aktuell sind keine kommenden Spiele vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match, index) => {
        const isNextMatch = index === 0;
        const leftTeamName = match.is_home ? "FC St. Gallen" : match.opponent;
        const rightTeamName = match.is_home ? match.opponent : "FC St. Gallen";
        const leftTeamLogo = match.is_home ? "/logos/fcsg.svg" : match.opponent_logo;
        const rightTeamLogo = match.is_home ? match.opponent_logo : "/logos/fcsg.svg";

        return (
          <article
            key={match.id}
            className={`rounded-3xl p-5 sm:p-6 border shadow-xl bg-white text-black ${
              isNextMatch ? "border-green-300" : "border-gray-200"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {isNextMatch && (
                <span className="inline-flex items-center bg-green-700 text-white text-xs font-black px-3 py-1.5 rounded-full">
                  Nächstes Spiel
                </span>
              )}

              {match.competition_name && (
                <span className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 font-semibold mb-2">
                  {match.is_home ? "Heimspiel" : "Auswärtsspiel"}
                </p>

                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {leftTeamLogo ? (
                    <img
                      src={leftTeamLogo}
                      alt={`${leftTeamName} Logo`}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400 shrink-0">
                      ?
                    </div>
                  )}

                  <p className="font-bold text-sm sm:text-xl leading-tight min-w-0">
                    {leftTeamName}
                    <span className="text-gray-400 mx-1 sm:mx-2">–</span>
                    {rightTeamName}
                  </p>

                  {rightTeamLogo ? (
                    <img
                      src={rightTeamLogo}
                      alt={`${rightTeamName} Logo`}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400 shrink-0">
                      ?
                    </div>
                  )}
                </div>
              </div>

              <div className="flex sm:block items-center justify-between sm:text-right shrink-0 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                <p className="font-semibold text-sm sm:text-base">
                  {new Date(match.kickoff).toLocaleDateString("de-CH", {
                    timeZone: "Europe/Zurich",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                <p className="text-gray-500 text-sm sm:mt-1">
                  {new Date(match.kickoff).toLocaleTimeString("de-CH", {
                    timeZone: "Europe/Zurich",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function SpielplanPage() {
  return (
    <AppShell>
      <AppHeader subtitle="Alle kommenden FCSG-Spiele in allen Wettbewerben" />
      <Navigation />
      <Suspense fallback={<p className="text-green-200">Spielplan wird geladen...</p>}>
        <SpielplanContent />
      </Suspense>
    </AppShell>
  );
}
