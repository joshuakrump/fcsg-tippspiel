import { TipForm } from "@/components/tip-form";
import { MatchTips } from "@/components/match-tips";
import { LogoutButton } from "@/components/logout-button";
import { Navigation } from "@/components/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { AppHeader } from "@/components/app-header";

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function UserHeader() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <p className="text-green-200 text-sm">
          Eingeloggt als
        </p>

        <p className="text-xl font-bold">
          {profile?.username ?? "Spieler"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="/admin-login"
          className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          Admin
        </a>

        <LogoutButton />
      </div>
    </div>
  );
}

async function MatchList() {
  const supabase = await createClient();

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff", { ascending: true });

  if (error) {
    return (
      <div className="bg-red-900 p-4 rounded-lg">
        Fehler beim Laden der Spiele: {error.message}
      </div>
    );
  }

  const upcomingMatches =
    matches
      ?.filter((match) => !match.finished)
      .slice(0, 2) ?? [];

  const finishedMatches =
    matches?.filter((match) => match.finished) ?? [];

  const lastFinishedMatch =
    finishedMatches.length > 0
      ? finishedMatches[finishedMatches.length - 1]
      : null;

  const nextKickoff =
    upcomingMatches.length > 0
      ? upcomingMatches[0].kickoff
      : null;

  const now = new Date();

const hasLiveMatch = upcomingMatches.some((match) => {
  const kickoff = new Date(match.kickoff);

  const differenceMs =
    now.getTime() - kickoff.getTime();

  const threeHoursMs =
    3 * 60 * 60 * 1000;

  return (
    differenceMs >= 0 &&
    differenceMs <= threeHoursMs &&
    !match.finished
  );
});

  return (
    <div className="space-y-10">
      <AutoRefresh
  nextKickoff={nextKickoff}
  hasLiveMatch={hasLiveMatch}
/>

      {/* Aktuelle Tipps */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">
          Aktuelle Tipps
        </h2>

        {upcomingMatches.length === 0 ? (
          <div className="bg-white text-black rounded-xl p-5 shadow-xl">
            Aktuell stehen keine Spiele zur Tippabgabe an.
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingMatches.map((match) => (
              <div
                key={match.id}
                className="bg-white text-black rounded-2xl p-5 shadow-xl"
              >
                <p className="text-sm text-gray-500">
                  {new Date(match.kickoff).toLocaleString("de-CH")}
                </p>

                <h3 className="text-xl font-bold mt-2">
                  {match.is_home
                    ? `FC St. Gallen – ${match.opponent}`
                    : `${match.opponent} – FC St. Gallen`}
                </h3>

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
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Letztes Ergebnis */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold text-white">
            Letztes Ergebnis
          </h2>

          <a
            href="/ergebnisse"
            className="
              inline-flex items-center justify-center
              bg-white text-green-950
              px-4 py-2.5
              rounded-xl
              text-sm font-bold
              shadow-md
              hover:bg-green-100
              active:scale-95
              transition
              whitespace-nowrap
            "
          >
            Alle Ergebnisse →
          </a>
        </div>

        {!lastFinishedMatch ? (
          <div className="bg-white text-black rounded-xl p-5 shadow-xl">
            Noch kein abgeschlossenes Spiel vorhanden.
          </div>
        ) : (
          <div className="bg-white text-black rounded-2xl p-5 shadow-xl">
            <p className="text-sm text-gray-500">
              {new Date(
                lastFinishedMatch.kickoff
              ).toLocaleString("de-CH")}
            </p>

            <h3 className="text-xl font-bold mt-2">
              {lastFinishedMatch.is_home
                ? `FC St. Gallen – ${lastFinishedMatch.opponent}`
                : `${lastFinishedMatch.opponent} – FC St. Gallen`}
            </h3>

            <TipForm
              matchId={lastFinishedMatch.id}
              kickoff={lastFinishedMatch.kickoff}
              isHome={lastFinishedMatch.is_home}
              finished={lastFinishedMatch.finished}
              fcsgScore={lastFinishedMatch.fcsg_score}
              opponentScore={lastFinishedMatch.opponent_score}
              opponentName={lastFinishedMatch.opponent}
              opponentLogo={lastFinishedMatch.opponent_logo}
              liveStatus={lastFinishedMatch.live_status}
              liveMinute={lastFinishedMatch.live_minute}
              liveExtra={lastFinishedMatch.live_extra}
              liveHomeScore={lastFinishedMatch.live_home_score}
              liveAwayScore={lastFinishedMatch.live_away_score}
              liveEvents={lastFinishedMatch.live_events}
              liveLineups={lastFinishedMatch.live_lineups}
              liveStatistics={lastFinishedMatch.live_statistics}
            />

            <MatchTips
              matchId={lastFinishedMatch.id}
              kickoff={lastFinishedMatch.kickoff}
              isHome={lastFinishedMatch.is_home}
              finished={lastFinishedMatch.finished}
            />
          </div>
        )}
      </section>
    </div>
  );
}

async function ProtectedHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <>
      <AppHeader subtitle="Tippe die Spiele des FC St. Gallen" />

      <Navigation />

      <UserHeader />

      <MatchList />
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-green-950 text-white p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Suspense fallback={<p>Tippspiel wird geladen...</p>}>
          <ProtectedHome />
        </Suspense>
      </div>
    </main>
  );
}