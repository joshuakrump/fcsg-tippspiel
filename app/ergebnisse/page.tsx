import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { TipForm } from "@/components/tip-form";
import { MatchTips } from "@/components/match-tips";
import { AutoRefresh } from "@/components/auto-refresh";

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
      {matches.map((match) => (
        <div
          key={match.id}
          className="bg-white text-black rounded-2xl p-5 shadow-xl"
        >
          <p className="text-sm text-gray-500">
            {new Date(match.kickoff).toLocaleString("de-CH")}
          </p>

          <h2 className="text-xl font-black mt-1">
            {match.is_home
              ? `FC St. Gallen – ${match.opponent}`
              : `${match.opponent} – FC St. Gallen`}
          </h2>

         <TipForm
  matchId={match.id}
  kickoff={match.kickoff}
  isHome={match.is_home}
  finished={match.finished}
  fcsgScore={match.fcsg_score}
  opponentScore={match.opponent_score}
  opponentName={match.opponent}
  opponentLogo={match.opponent_logo}

  liveStatus={match.live_status}
  liveMinute={match.live_minute}
  liveExtra={match.live_extra}
  liveHomeScore={match.live_home_score}
  liveAwayScore={match.live_away_score}

  liveEvents={match.live_events}
  liveLineups={match.live_lineups}
/>

          <MatchTips
            matchId={match.id}
            kickoff={match.kickoff}
            isHome={match.is_home}
            finished={match.finished}
          />
        </div>
      ))}
    </div>
  );
}

export default function ErgebnissePage() {
  return (
    <main className="min-h-screen bg-green-950 text-white p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <AutoRefresh />

        <AppHeader subtitle="Alle abgeschlossenen Spiele" />

        <Navigation />

        <Suspense fallback={<p>Ergebnisse werden geladen...</p>}>
          <ResultsList />
        </Suspense>
      </div>
    </main>
  );
}