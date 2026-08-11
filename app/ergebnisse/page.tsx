import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { TipForm } from "@/components/tip-form";
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
    <div className="space-y-6">
      {matches.map((match) => (
        <article
          key={match.id}
          className="
            bg-white
            text-black
            rounded-3xl
            p-5 sm:p-7
            shadow-2xl
            border border-gray-200
          "
        >
          <div className="mb-1">
            <div
              className="
                inline-flex
                items-center
                bg-gray-100
                text-gray-500
                rounded-full
                px-3 py-1
                text-xs
                font-semibold
                mb-3
              "
            >
              {new Date(match.kickoff).toLocaleString("de-CH", {
                timeZone: "Europe/Zurich",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {match.is_home
                ? `FC St. Gallen – ${match.opponent}`
                : `${match.opponent} – FC St. Gallen`}
            </h2>
          </div>

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
            liveStatistics={match.live_statistics}
          />

          <MatchTips
            matchId={match.id}
            kickoff={match.kickoff}
            isHome={match.is_home}
            finished={match.finished}
          />
        </article>
      ))}
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