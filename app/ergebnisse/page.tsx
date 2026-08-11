import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";

async function SpielplanContent() {
  const supabase = await createClient();

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("finished", false)
    .order("kickoff", { ascending: true });

  if (error) {
    return (
      <p className="text-red-300">
        Spielplan konnte nicht geladen werden.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {matches?.map((match, index) => {
        const isNextMatch = index === 0;

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

        return (
          <div
            key={match.id}
            className={`
              rounded-2xl p-5 border
              ${
                isNextMatch
                  ? "bg-white text-black border-green-300 shadow-lg"
                  : "bg-white/95 text-black border-white/20"
              }
            `}
          >
            {isNextMatch && (
              <div className="mb-3">
                <span className="inline-block bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Nächstes Spiel
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
  <div className="min-w-0 flex-1">
    <p className="text-sm text-gray-500 font-semibold mb-1">
      {match.is_home ? "Heimspiel" : "Auswärtsspiel"}
    </p>

    <div className="flex items-center gap-3">
      {leftTeamLogo ? (
        <img
          src={leftTeamLogo}
          alt={`${leftTeamName} Logo`}
          className="w-11 h-11 object-contain shrink-0"
        />
      ) : (
        <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 shrink-0">
          ?
        </div>
      )}

      <p className="font-bold text-lg sm:text-xl whitespace-nowrap">
        {leftTeamName} – {rightTeamName}
      </p>

      {rightTeamLogo ? (
        <img
          src={rightTeamLogo}
          alt={`${rightTeamName} Logo`}
          className="w-11 h-11 object-contain shrink-0"
        />
      ) : (
        <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 shrink-0">
          ?
        </div>
      )}
    </div>
  </div>

  <div className="text-right shrink-0">
    <p className="font-semibold">
      {new Date(match.kickoff).toLocaleDateString("de-CH", {
        timeZone: "Europe/Zurich",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}
    </p>

    <p className="text-gray-500">
      {new Date(match.kickoff).toLocaleTimeString("de-CH", {
        timeZone: "Europe/Zurich",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </p>
  </div>
</div>
          </div>
        );
      })}
    </div>
  );
}

export default function SpielplanPage() {
  return (
    <main className="min-h-screen bg-green-950 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          Spielplan
        </h1>

        <Navigation />

        <Suspense
          fallback={
            <p className="text-green-200">
              Spielplan wird geladen...
            </p>
          }
        >
          <SpielplanContent />
        </Suspense>
      </div>
    </main>
  );
}