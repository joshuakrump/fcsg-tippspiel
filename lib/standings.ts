import { cacheLife } from "next/cache";

export const FCSG_TEAM_ID = 1011;
export const SUPER_LEAGUE_ID = 207;

export type StandingRow = {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
  update: string;
};

export type StandingsResult =
  | { ok: true; leagueName: string; leagueLogo: string | null; season: number; groups: StandingRow[][] }
  | { ok: false; error: string };

/** Saison im Format von API-Football: Saison 2026/27 = 2026 (Start im Juli). */
export function currentSeason(now = new Date()) {
  return now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

async function fetchStandings(season: number) {
  "use cache";
  // Tabelle höchstens alle 30 Minuten neu laden (schont das API-Kontingent)
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY fehlt.");

  const response = await fetch(
    `https://v3.football.api-sports.io/standings?league=${SUPER_LEAGUE_ID}&season=${season}`,
    { headers: { "x-apisports-key": apiKey } },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const league = data?.response?.[0]?.league;
  const groups: StandingRow[][] = league?.standings ?? [];
  // Fehler werfen statt zurückgeben, damit ein Fehler nicht zwischengespeichert wird
  if (!league || groups.length === 0) throw new Error("Keine Tabellendaten erhalten.");

  return {
    leagueName: (league.name as string) ?? "Super League",
    leagueLogo: (league.logo as string) ?? null,
    groups,
  };
}

export async function getSuperLeagueStandings(): Promise<StandingsResult> {
  const season = currentSeason();
  try {
    const result = await fetchStandings(season);
    return { ok: true, season, ...result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" };
  }
}
