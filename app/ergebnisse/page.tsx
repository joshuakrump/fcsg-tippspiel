import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { MatchTips } from "@/components/match-tips";

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

  return (
    <div className="space-y-5">
      {matches.map((match) => {
        const leftTeamName = match.is_home
          ? "FC St. Gallen"
          : match.opponent;

        const rightTeamName = match.is_home
          ? match.opponent
          : "FC St. Gallen";

        const leftTeamLogo = match.is_home
          ? "/logos/fcsg.svg"
          : match.opponent_logo;

        const rightTeamLogo = match.is_home
          ? match.opponent_logo
          : "/logos/fcsg.svg";

        const leftScore = match.is_home
          ? match.fcsg_score
          : match.opponent_score;

        const rightScore = match.is_home
          ? match.opponent_score
          : match.fcsg_score;

        return (
          <article
            key={match.id}
            className="bg-white text-black rounded-2xl p-5 sm:p-6 shadow-xl"
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <p className="text-sm text-gray-500 font-semibold">
                {new Date(match.kickoff).toLocaleString("de-CH", {
                  timeZone: "Europe/Zurich",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                Beendet
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Team links */}
              <div className="flex flex-col items-center text-center">
                {leftTeamLogo && (
                  <img
                    src={leftTeamLogo}
                    alt={`${leftTeamName} Logo`}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-2"
                  />
                )}

                <p className="font-bold text-sm sm:text-base">
                  {leftTeamName}
                </p>
              </div>

              {/* Resultat */}
              <div className="text-center px-2">
                <p className="text-xs text-gray-500 font-semibold mb-1">
                  ENDSTAND
                </p>

                <p className="text-3xl sm:text-4xl font-black whitespace-nowrap">
                  {leftScore} : {rightScore}
                </p>
              </div>

              {/* Team rechts */}
              <div className="flex flex-col items-center text-center">
                {rightTeamLogo && (
                  <img
                    src={rightTeamLogo}
                    alt={`${rightTeamName} Logo`}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-2"
                  />
                )}

                <p className="font-bold text-sm sm:text-base">
                  {rightTeamName}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-200">
              <MatchTips
                matchId={match.id}
                kickoff={match.kickoff}
                isHome={match.is_home}
                finished={match.finished}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function ErgebnissePage() {
  return (
    <main className="min-h-screen bg-green-950 text-white p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <AppHeader subtitle="Alle abgeschlossenen Spiele" />

        <Navigation />

        <Suspense fallback={<p>Ergebnisse werden geladen...</p>}>
          <ResultsList />
        </Suspense>
      </div>
    </main>
  );
}