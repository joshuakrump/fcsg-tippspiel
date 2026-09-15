import { createAdminClient } from "@/lib/supabase/admin-client";

const RECOVERY_MIN_AGE_MS = 3 * 60 * 60 * 1000;
const RECOVERY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return Response.json(
      { success: false, error: "API_FOOTBALL_KEY fehlt." },
      { status: 500 },
    );
  }

  const now = Date.now();
  const olderThan = new Date(now - RECOVERY_MIN_AGE_MS).toISOString();
  const newerThan = new Date(now - RECOVERY_MAX_AGE_MS).toISOString();

  const supabase = createAdminClient();

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, opponent, kickoff, api_fixture_id, is_home")
    .eq("finished", false)
    .not("api_fixture_id", "is", null)
    .lte("kickoff", olderThan)
    .gte("kickoff", newerThan)
    .order("kickoff", { ascending: true });

  if (matchesError) {
    return Response.json(
      { success: false, error: matchesError.message },
      { status: 500 },
    );
  }

  let checked = 0;
  let recovered = 0;
  const errors: Array<{ matchId: number; error: string }> = [];

  for (const match of matches ?? []) {
    checked++;

    try {
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${match.api_fixture_id}`,
        {
          headers: { "x-apisports-key": apiKey },
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (
        !response.ok ||
        (data.errors && Object.keys(data.errors).length > 0)
      ) {
        errors.push({
          matchId: match.id,
          error: JSON.stringify(data.errors ?? { status: response.status }),
        });
        continue;
      }

      const fixture = data.response?.[0];

      if (!fixture) {
        continue;
      }

      const status = fixture.fixture?.status?.short ?? null;
      const elapsed = fixture.fixture?.status?.elapsed ?? null;
      const extra = fixture.fixture?.status?.extra ?? null;
      const homeScore = fixture.goals?.home ?? null;
      const awayScore = fixture.goals?.away ?? null;

      if (
        !status ||
        !FINAL_STATUSES.has(status) ||
        homeScore === null ||
        awayScore === null
      ) {
        continue;
      }

      const updateData: {
        live_status: string;
        live_minute: number | null;
        live_extra: number | null;
        live_home_score: number;
        live_away_score: number;
        finished: boolean;
        fcsg_score: number;
        opponent_score: number;
      } = {
        live_status: status,
        live_minute: elapsed,
        live_extra: extra,
        live_home_score: homeScore,
        live_away_score: awayScore,
        finished: true,
        fcsg_score: match.is_home ? homeScore : awayScore,
        opponent_score: match.is_home ? awayScore : homeScore,
      };

      const { error: updateError } = await supabase
        .from("matches")
        .update(updateData)
        .eq("id", match.id);

      if (updateError) {
        errors.push({ matchId: match.id, error: updateError.message });
        continue;
      }

      recovered++;
      console.log(
        `Recovery Match ${match.id} (${match.opponent}): ${status} ${homeScore}:${awayScore}`,
      );
    } catch (error) {
      errors.push({
        matchId: match.id,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  }

  return Response.json({
    success: errors.length === 0,
    checked,
    recovered,
    errors,
  });
}
