import { TipForm } from "@/components/tip-form";
import { MatchTips } from "@/components/match-tips";
import { LogoutButton } from "@/components/logout-button";
import { Navigation } from "@/components/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { AppHeader } from "@/components/app-header";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PushNotifications } from "@/components/push-notifications";

function formatKickoff(kickoff: string) {
  return new Date(kickoff).toLocaleString("de-CH", {
    timeZone: "Europe/Zurich",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CompetitionBadge({ match }: { match: any }) {
  if (!match.competition_name) return null;

  return (
    <span className="inline-flex items-center gap-2 bg-green-50 text-green-800 rounded-full px-3 py-1 text-xs font-bold">
      {match.competition_logo && (
        <img src={match.competition_logo} alt="" className="w-4 h-4 object-contain" />
      )}
      {match.competition_name}
      {match.competition_round ? ` · ${match.competition_round}` : ""}
    </span>
  );
}

async function UserHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const username = profile?.username ?? user.user_metadata?.username ?? "Spieler";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 p-4 sm:p-5 rounded-2xl border border-green-800/70 bg-green-900/40 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-green-700 text-lg font-black shadow-inner">
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-green-300 text-xs font-medium">Eingeloggt als</p>
          <p className="text-lg font-bold leading-tight">{username}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/admin-login"
          className="inline-flex items-center justify-center bg-green-700 hover:bg-green-600 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition"
        >
          Admin
        </a>
        <LogoutButton />
      </div>
    </div>
  );
}

function MatchHeader({ match, next }: { match: any; next?: boolean }) {
  const isPostponed = match.live_status === "PST";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center bg-gray-100 text-gray-500 rounded-full px-3 py-1 text-xs font-semibold">
            {formatKickoff(match.kickoff)}
          </span>
          <CompetitionBadge match={match} />
        </div>

        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
          {match.is_home
            ? `FC St. Gallen – ${match.opponent}`
            : `${match.opponent} – FC St. Gallen`}
        </h3>
      </div>

      {isPostponed ? (
        <span className="inline-flex self-start items-center rounded-full bg-orange-100 text-orange-800 px-3 py-1.5 text-xs font-extrabold whitespace-nowrap">
          ⚠️ Verschoben
        </span>
      ) : next ? (
        <span className="inline-flex self-start items-center rounded-full bg-green-100 text-green-800 px-3 py-1.5 text-xs font-extrabold whitespace-nowrap">
          Nächstes Spiel
        </span>
      ) : null}
    </div>
  );
}

function PostponedMatchNotice() {
  return (
    <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-5 text-orange-950">
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden="true">⚠️</span>
        <div>
          <p className="font-black">Dieses Spiel wurde verschoben.</p>
          <p className="mt-1 text-sm leading-relaxed text-orange-900">
            Bereits abgegebene Tipps wurden entfernt und die Tippabgabe ist vorübergehend gesperrt.
            Sobald der neue Termin offiziell bekannt ist, wird das Spiel automatisch aktualisiert und die Tippabgabe wieder geöffnet.
          </p>
          <p className="mt-3 text-xs font-semibold text-orange-800">
            Der oben angezeigte Termin ist der bisherige Termin und kann sich noch ändern.
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchContent({ match }: { match: any }) {
  if (match.live_status === "PST") {
    return <PostponedMatchNotice />;
  }

  return (
    <>
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
    </>
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
      <div className="bg-red-900/80 border border-red-700 p-5 rounded-2xl">
        Fehler beim Laden der Spiele: {error.message}
      </div>
    );
  }

  const openMatches = matches?.filter((match) => !match.finished) ?? [];
  const upcomingMatches = openMatches.filter((match) => match.live_status !== "PST").slice(0, 2);
  const postponedMatches = openMatches.filter((match) => match.live_status === "PST");
  const finishedMatches = matches?.filter((match) => match.finished) ?? [];
  const lastFinishedMatch = finishedMatches.length > 0 ? finishedMatches[finishedMatches.length - 1] : null;
  const nextPlayableMatch = upcomingMatches[0] ?? null;
  const nextKickoff = nextPlayableMatch?.kickoff ?? null;
  const now = new Date();
  const hasLiveMatch = upcomingMatches.some((match) => {
    const differenceMs = now.getTime() - new Date(match.kickoff).getTime();
    return differenceMs >= 0 && differenceMs <= 3 * 60 * 60 * 1000 && !match.finished;
  });

  return (
    <div className="space-y-12">
      <AutoRefresh nextKickoff={nextKickoff} hasLiveMatch={hasLiveMatch} />

      <section>
        <div className="mb-5">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Aktuelle Tipps</h2>
          <p className="text-green-300 text-sm mt-1">Tippe die nächsten Spiele des FC St. Gallen – wettbewerbsübergreifend.</p>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-xl">
            <p className="font-semibold">Aktuell stehen keine Spiele zur Tippabgabe an.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {upcomingMatches.map((match) => (
              <article
                key={match.id}
                className={`bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl border transition ${
                  match.id === nextPlayableMatch?.id ? "border-green-400/80" : "border-gray-200"
                }`}
              >
                <MatchHeader match={match} next={match.id === nextPlayableMatch?.id} />
                <MatchContent match={match} />
              </article>
            ))}
          </div>
        )}
      </section>

      {postponedMatches.length > 0 && (
        <section>
          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-black text-white">Verschobene Spiele</h2>
            <p className="text-orange-200 text-sm mt-1">
              Diese Spiele bleiben sichtbar, blockieren aber keinen Platz für die nächsten tippbaren Partien.
            </p>
          </div>

          <div className="space-y-6">
            {postponedMatches.map((match) => (
              <article
                key={match.id}
                className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl border border-orange-300"
              >
                <MatchHeader match={match} />
                <MatchContent match={match} />
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Letztes Ergebnis</h2>
            <p className="text-green-300 text-sm mt-1">Das zuletzt abgeschlossene FCSG-Spiel.</p>
          </div>
          <a
            href="/ergebnisse"
            className="inline-flex self-start sm:self-auto items-center justify-center bg-white text-green-950 px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-green-100 active:scale-95 transition whitespace-nowrap"
          >
            Alle Ergebnisse <span className="ml-2">→</span>
          </a>
        </div>

        {!lastFinishedMatch ? (
          <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-xl">
            Noch kein abgeschlossenes Spiel vorhanden.
          </div>
        ) : (
          <article className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl border border-gray-200">
            <MatchHeader match={lastFinishedMatch} />
            <MatchContent match={lastFinishedMatch} />
          </article>
        )}
      </section>
    </div>
  );
}

async function ProtectedHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <>
      <AppHeader subtitle="Tippe alle Spiele des FC St. Gallen" />
      <Navigation />
      <UserHeader />
      <div className="mb-10"><PushNotifications /></div>
      <MatchList />
    </>
  );
}

export default function Home() {
  return (
    <AppShell>
      <Suspense fallback={<div className="py-20 text-center text-green-200">Tippspiel wird geladen...</div>}>
        <ProtectedHome />
      </Suspense>
    </AppShell>
  );
}
