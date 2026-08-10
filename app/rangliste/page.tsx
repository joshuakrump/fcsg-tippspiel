import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { AppHeader } from "@/components/app-header";

async function Ranking() {
  const supabase = await createClient();

  const { data: ranking, error } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      tips (
        points
      )
    `);

  if (error) {
    return (
      <p className="text-red-300">
        Rangliste konnte nicht geladen werden: {error.message}
      </p>
    );
  }

  const rankingWithPoints =
    ranking
      ?.map((player) => ({
        username: player.username,
        points:
          player.tips?.reduce(
            (
              sum: number,
              tip: { points: number | null }
            ) => sum + (tip.points ?? 0),
            0
          ) ?? 0,
      }))
      .sort((a, b) => b.points - a.points) ?? [];

  return (
    <div className="bg-white text-black rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-black mb-5">
        🏆 Rangliste
      </h2>

      {rankingWithPoints.length === 0 ? (
        <p className="text-gray-500">
          Noch keine Spieler vorhanden.
        </p>
      ) : (
        <div className="space-y-3">
          {rankingWithPoints.map((player, index) => {
            const rank =
              index > 0 &&
              rankingWithPoints[index - 1].points === player.points
                ? rankingWithPoints.findIndex(
                    (otherPlayer) =>
                      otherPlayer.points === player.points
                  ) + 1
                : index + 1;

            return (
              <div
                key={player.username}
                className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-black text-lg w-8">
                    {rank}.
                  </span>

                  <span className="font-semibold">
                    {player.username}
                  </span>
                </div>

                <span className="font-black text-green-800">
                  {player.points} Pkt.
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RanglistePage() {
  return (
    <main className="min-h-screen bg-green-950 text-white p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <AutoRefresh nextKickoff={null} />

        <AppHeader subtitle="Saisonrangliste" />

        <Navigation />

        <Suspense fallback={<p>Rangliste wird geladen...</p>}>
          <Ranking />
        </Suspense>
      </div>
    </main>
  );
}