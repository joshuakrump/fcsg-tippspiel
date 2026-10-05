import Image from "next/image";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { BADGES, syncBadgesForUser } from "@/lib/badges";

async function Ranking() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ranking, error } = await supabase
    .from("profiles")
    .select(`id, username, is_hidden, tips ( points )`);

  if (error) {
    return <p className="text-red-300">Rangliste konnte nicht geladen werden: {error.message}</p>;
  }

  const rankingWithPoints = ranking
    ?.filter((player) => !player.is_hidden)
    .map((player) => ({
      id: player.id,
      username: player.username,
      points: player.tips?.reduce(
        (sum: number, tip: { points: number | null }) => sum + (tip.points ?? 0),
        0,
      ) ?? 0,
    }))
    .sort((a, b) => b.points - a.points) ?? [];

  const { data: userTips } = user
    ? await supabase.from("tips").select("match_id, points").eq("user_id", user.id)
    : { data: [] };

  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("finished", true);

  const finishedMatchIds = new Set(finishedMatches?.map((match) => match.id) ?? []);
  const totalTips = userTips?.length ?? 0;
  const evaluatedTips = userTips?.filter((tip) => finishedMatchIds.has(tip.match_id)) ?? [];
  const totalPoints = evaluatedTips.reduce((sum, tip) => sum + (tip.points ?? 0), 0);
  const exactTips = evaluatedTips.filter((tip) => tip.points === 7).length;
  const averagePoints = evaluatedTips.length > 0 ? totalPoints / evaluatedTips.length : 0;

  const unlockedRows = user ? await syncBadgesForUser(user.id) : [];
  const unlockedMap = new Map(unlockedRows.map((row) => [row.badge_key, row.unlocked_at]));
  const unlockedCount = BADGES.filter((badge) => unlockedMap.has(badge.key)).length;

  return (
    <div className="space-y-6">
      <div className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-black">🏆 Rangliste</h2>
          <p className="text-gray-500 text-sm mt-1">Aktueller Stand des Tippspiels</p>
        </div>

        {rankingWithPoints.length === 0 ? (
          <p className="text-gray-500">Noch keine Spieler vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {rankingWithPoints.map((player, index) => {
              const rank = index > 0 && rankingWithPoints[index - 1].points === player.points
                ? rankingWithPoints.findIndex((otherPlayer) => otherPlayer.points === player.points) + 1
                : index + 1;
              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
              const isCurrentUser = player.id === user?.id;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-2xl px-4 py-4 border-2 transition ${
                    rank === 1
                      ? "bg-green-50 border-green-200"
                      : isCurrentUser
                        ? "bg-white border-green-600"
                        : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 text-center shrink-0">
                      {medal ? <span className="text-2xl">{medal}</span> : <span className="font-black text-gray-500">{rank}.</span>}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-base sm:text-lg truncate">{player.username}</span>
                      {isCurrentUser && (
                        <span className="shrink-0 bg-green-700 text-white text-[10px] sm:text-xs font-black px-2 py-1 rounded-full">Du</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="font-black text-green-800 text-lg sm:text-xl">{player.points}</span>
                    <span className="text-gray-500 text-sm ml-1">Pkt.</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-2xl sm:text-3xl font-black">📊 Deine Statistik</h2>
          <p className="text-gray-500 text-sm mt-1">Deine bisherige Saison in Zahlen</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard value={totalTips} label="Getippte Spiele" />
          <StatCard value={exactTips} label="Exakte Tipps" />
          <StatCard value={totalPoints} label="Gesammelte Punkte" highlight />
          <StatCard value={averagePoints.toFixed(1)} label="Ø Punkte pro Tipp" highlight />
        </div>
      </div>

      {user && (
        <div className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-black">Deine Abzeichen</h2>
            <p className="text-gray-500 text-sm mt-1">
              {unlockedCount} von {BADGES.length} freigeschaltet
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BADGES.map((badge) => {
              const isUnlocked = unlockedMap.has(badge.key);

              return (
                <div
                  key={badge.key}
                  className={`rounded-2xl border p-3 text-center transition ${
                    isUnlocked
                      ? "bg-green-50 border-green-200 shadow-sm"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="relative">
                    <Image
                      src={badge.image}
                      alt={badge.name}
                      width={180}
                      height={180}
                      className={`w-full h-auto transition ${
                        isUnlocked
                          ? ""
                          : "grayscale opacity-25 contrast-50"
                      }`}
                    />
                  </div>
                  <p className={`font-black mt-2 ${isUnlocked ? "text-black" : "text-gray-400"}`}>
                    {badge.name}
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${isUnlocked ? "text-green-700" : "text-gray-400"}`}>
                    {isUnlocked ? "Freigeschaltet" : "Noch gesperrt"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, highlight = false }: { value: number | string; label: string; highlight?: boolean }) {
  return (
    <div className={`${highlight ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"} border rounded-2xl p-4 sm:p-5`}>
      <p className={`text-2xl sm:text-3xl font-black ${highlight ? "text-green-800" : ""}`}>{value}</p>
      <p className="text-gray-500 text-xs sm:text-sm mt-1">{label}</p>
    </div>
  );
}

export default function RanglistePage() {
  return (
    <AppShell>
      <AppHeader subtitle="Saisonrangliste" />
      <Navigation />
      <Suspense fallback={<p className="text-green-200">Rangliste wird geladen...</p>}>
        <Ranking />
      </Suspense>
    </AppShell>
  );
}
