import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";

async function Ranking() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * RANGLISTE LADEN
   */
  const { data: ranking, error } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      is_hidden,
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
      ?.filter((player) => !player.is_hidden)
      .map((player) => ({
        id: player.id,
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

  /*
   * EIGENE TIPPS LADEN
   */
  const { data: userTips } = user
    ? await supabase
        .from("tips")
        .select("match_id, points")
        .eq("user_id", user.id)
    : { data: [] };

  /*
   * BEENDETE SPIELE LADEN
   *
   * Wichtig für den Durchschnitt:
   * Kommende Spiele sollen nicht als 0-Punkte-Spiel
   * in den Durchschnitt einfliessen.
   */
  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("finished", true);

  const finishedMatchIds = new Set(
    finishedMatches?.map((match) => match.id) ?? []
  );

  /*
   * STATISTIK BERECHNEN
   */
  const totalTips = userTips?.length ?? 0;

  const evaluatedTips =
    userTips?.filter((tip) =>
      finishedMatchIds.has(tip.match_id)
    ) ?? [];

  const totalPoints = evaluatedTips.reduce(
    (sum, tip) => sum + (tip.points ?? 0),
    0
  );

  /*
   * Exaktes Resultat = 7 Punkte
   */
  const exactTips = evaluatedTips.filter(
    (tip) => tip.points === 7
  ).length;

  const averagePoints =
    evaluatedTips.length > 0
      ? totalPoints / evaluatedTips.length
      : 0;

  return (
    <div className="space-y-6">
      {/* RANGLISTE */}
      <div className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-black">
            🏆 Rangliste
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Aktueller Stand des Tippspiels
          </p>
        </div>

        {rankingWithPoints.length === 0 ? (
          <p className="text-gray-500">
            Noch keine Spieler vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {rankingWithPoints.map((player, index) => {
              const rank =
                index > 0 &&
                rankingWithPoints[index - 1].points ===
                  player.points
                  ? rankingWithPoints.findIndex(
                      (otherPlayer) =>
                        otherPlayer.points === player.points
                    ) + 1
                  : index + 1;

              const medal =
                rank === 1
                  ? "🥇"
                  : rank === 2
                    ? "🥈"
                    : rank === 3
                      ? "🥉"
                      : null;

              const isCurrentUser =
                player.id === user?.id;

              return (
                <div
                  key={player.id}
                  className={`
                    flex
                    items-center
                    justify-between
                    rounded-2xl
                    px-4 py-4
                    border-2
                    transition
                    ${
                      rank === 1
                        ? "bg-green-50 border-green-200"
                        : isCurrentUser
                          ? "bg-white border-green-600"
                          : "bg-gray-50 border-gray-100"
                    }
                  `}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 text-center shrink-0">
                      {medal ? (
                        <span className="text-2xl">
                          {medal}
                        </span>
                      ) : (
                        <span className="font-black text-gray-500">
                          {rank}.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-base sm:text-lg truncate">
                        {player.username}
                      </span>

                      {isCurrentUser && (
                        <span className="shrink-0 bg-green-700 text-white text-[10px] sm:text-xs font-black px-2 py-1 rounded-full">
                          Du
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4">
                    <span className="font-black text-green-800 text-lg sm:text-xl">
                      {player.points}
                    </span>

                    <span className="text-gray-500 text-sm ml-1">
                      Pkt.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DEINE STATISTIK */}
      <div className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-2xl sm:text-3xl font-black">
            📊 Deine Statistik
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Deine bisherige Saison in Zahlen
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* GETIPPTE SPIELE */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 sm:p-5">
            <span className="text-2xl">
              🎯
            </span>

            <p className="text-2xl sm:text-3xl font-black mt-3">
              {totalTips}
            </p>

            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Getippte Spiele
            </p>
          </div>

          {/* EXAKTE TIPPS */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 sm:p-5">
            <span className="text-2xl">
              ✅
            </span>

            <p className="text-2xl sm:text-3xl font-black mt-3">
              {exactTips}
            </p>

            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Exakte Tipps
            </p>
          </div>

          {/* PUNKTE */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-5">
            <span className="text-2xl">
              ⭐
            </span>

            <p className="text-2xl sm:text-3xl font-black text-green-800 mt-3">
              {totalPoints}
            </p>

            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Gesammelte Punkte
            </p>
          </div>

          {/* DURCHSCHNITT */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-5">
            <span className="text-2xl">
              📈
            </span>

            <p className="text-2xl sm:text-3xl font-black text-green-800 mt-3">
              {averagePoints.toFixed(1)}
            </p>

            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Ø Punkte pro Tipp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RanglistePage() {
  return (
    <AppShell>
      <AppHeader subtitle="Saisonrangliste" />

      <Navigation />

      <Suspense
        fallback={
          <p className="text-green-200">
            Rangliste wird geladen...
          </p>
        }
      >
        <Ranking />
      </Suspense>
    </AppShell>
  );
}