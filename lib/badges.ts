import { createAdminClient } from "@/lib/supabase/admin-client";

export const BADGES = [
  { key: "volltreffer", name: "Volltreffer", image: "/badges/volltreffer.webp" },
  { key: "scharfschuetze", name: "Scharfschütze", image: "/badges/scharfschuetze.webp" },
  { key: "heisse-serie", name: "Heisse Serie", image: "/badges/heisse-serie.webp" },
  { key: "dauerbrenner", name: "Dauerbrenner", image: "/badges/dauerbrenner.webp" },
  { key: "stammkurve", name: "Stammkurve", image: "/badges/stammkurve.webp" },
  { key: "leader", name: "Leader", image: "/badges/leader.webp" },
  { key: "perfekter-spieltag", name: "Perfekter Spieltag", image: "/badges/perfekter-spieltag.webp" },
  { key: "saisonfighter", name: "Saisonfighter", image: "/badges/saisonfighter.webp" },
] as const;

type BadgeKey = (typeof BADGES)[number]["key"];

export async function syncBadgesForUser(userId: string) {
  const supabase = createAdminClient();

  const [{ data: tips }, { data: matches }, { data: ranking }] = await Promise.all([
    supabase.from("tips").select("match_id, points").eq("user_id", userId),
    supabase.from("matches").select("id, kickoff, finished").order("kickoff", { ascending: true }),
    supabase.from("profiles").select("id, is_hidden, tips(points)"),
  ]);

  const allTips = tips ?? [];
  const allMatches = matches ?? [];
  const matchById = new Map(allMatches.map((match) => [match.id, match]));
  const evaluatedTips = allTips
    .filter((tip) => matchById.get(tip.match_id)?.finished)
    .sort((a, b) => {
      const aTime = new Date(matchById.get(a.match_id)?.kickoff ?? 0).getTime();
      const bTime = new Date(matchById.get(b.match_id)?.kickoff ?? 0).getTime();
      return aTime - bTime;
    });

  const exactTips = evaluatedTips.filter((tip) => tip.points === 7).length;

  let currentStreak = 0;
  let bestStreak = 0;
  for (const tip of evaluatedTips) {
    if ((tip.points ?? 0) > 0) {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const visibleRanking = (ranking ?? [])
    .filter((player) => !player.is_hidden)
    .map((player) => ({
      id: player.id,
      points: player.tips?.reduce(
        (sum: number, tip: { points: number | null }) => sum + (tip.points ?? 0),
        0,
      ) ?? 0,
    }));
  const maxPoints = Math.max(0, ...visibleRanking.map((player) => player.points));
  const userRankingEntry = visibleRanking.find((player) => player.id === userId);

  const seasonFinished = allMatches.length > 0 && allMatches.every((match) => match.finished);
  const tippedMatchIds = new Set(allTips.map((tip) => tip.match_id));
  const tippedWholeSeason = seasonFinished && allMatches.every((match) => tippedMatchIds.has(match.id));

  const earned: BadgeKey[] = [];
  if (exactTips >= 1) earned.push("volltreffer");
  if (exactTips >= 5) earned.push("scharfschuetze");
  if (bestStreak >= 3) earned.push("heisse-serie");
  if (allTips.length >= 10) earned.push("dauerbrenner");
  if (allTips.length >= 25) earned.push("stammkurve");
  if (userRankingEntry && userRankingEntry.points === maxPoints) earned.push("leader");
  if (exactTips >= 1) earned.push("perfekter-spieltag");
  if (tippedWholeSeason) earned.push("saisonfighter");

  if (earned.length > 0) {
    await supabase.from("user_badges").upsert(
      earned.map((badgeKey) => ({ user_id: userId, badge_key: badgeKey })),
      { onConflict: "user_id,badge_key", ignoreDuplicates: true },
    );
  }

  const { data: unlockedBadges } = await supabase
    .from("user_badges")
    .select("badge_key, unlocked_at")
    .eq("user_id", userId);

  return unlockedBadges ?? [];
}
