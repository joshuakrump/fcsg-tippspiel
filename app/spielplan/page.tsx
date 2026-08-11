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
console.log(match.opponent, match.opponent_logo);
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
              <div className="flex items-center gap-4">
                {match.opponent_logo && (
                  <img
                    src={match.opponent_logo}
                    alt={match.opponent}
                    className="w-12 h-12 object-contain"
                  />
                )}

                <div>
                  <p className="text-sm text-gray-500 font-semibold">
                    {match.is_home ? "Heimspiel" : "Auswärtsspiel"}
                  </p>

                  <p className="font-bold text-lg sm:text-xl">
                    {match.is_home
                      ? `FC St. Gallen – ${match.opponent}`
                      : `${match.opponent} – FC St. Gallen`}
                  </p>
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
    <main className="min-h-screen bg-green-950 text-white p-8">
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