import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { AdminNavigation } from "@/components/admin-navigation";

function formatKickoff(kickoff: string) {
  return formatInTimeZone(
    new Date(kickoff),
    "Europe/Zurich",
    "dd.MM.yyyy · HH:mm"
  );
}

function formatSyncTime(value: string | null) {
  if (!value) return "Noch nie";

  return formatInTimeZone(
    new Date(value),
    "Europe/Zurich",
    "dd.MM.yyyy · HH:mm"
  );
}

function matchLabel(match: any) {
  return match.is_home
    ? `FC St. Gallen – ${match.opponent}`
    : `${match.opponent} – FC St. Gallen`;
}

export default async function AdminDashboardPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin-login");
  }

  const supabase = createAdminClient();

  const [matchesResult, profilesResult] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .order("kickoff", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, username, is_hidden, tips(points)"),
  ]);

  if (matchesResult.error) {
    throw new Error(matchesResult.error.message);
  }

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const matches = matchesResult.data ?? [];
  const visiblePlayers =
    profilesResult.data?.filter((player) => !player.is_hidden) ?? [];

  const now = new Date();
  const openMatches = matches.filter((match) => !match.finished);
  const finishedMatches = matches.filter((match) => match.finished);
  const postponedMatches = openMatches.filter(
    (match) => match.live_status === "PST"
  );

  const nextMatch =
    openMatches.find(
      (match) =>
        match.live_status !== "PST" &&
        new Date(match.kickoff).getTime() >= now.getTime()
    ) ??
    openMatches.find((match) => match.live_status !== "PST") ??
    null;

  let tipCount = 0;
  if (nextMatch) {
    const { count, error } = await supabase
      .from("tips")
      .select("id", { count: "exact", head: true })
      .eq("match_id", nextMatch.id);

    if (!error) {
      tipCount = count ?? 0;
    }
  }

  const totalPlayers = visiblePlayers.length;
  const missingTips = Math.max(totalPlayers - tipCount, 0);

  const ranking = visiblePlayers
    .map((player) => ({
      username: player.username,
      points:
        player.tips?.reduce(
          (sum: number, tip: { points: number | null }) =>
            sum + (tip.points ?? 0),
          0
        ) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  const leader = ranking[0] ?? null;

  const lastSyncedAt = matches.reduce<string | null>((latest, match) => {
    const value = match.api_last_synced_at;
    if (!value) return latest;
    if (!latest) return value;
    return new Date(value) > new Date(latest) ? value : latest;
  }, null);

  const missingDetails = finishedMatches.filter((match) => {
    if (!match.api_fixture_id) return false;

    const hasEvents = Array.isArray(match.live_events) && match.live_events.length > 0;
    const hasLineups = Array.isArray(match.live_lineups) && match.live_lineups.length > 0;
    const hasStatistics =
      Array.isArray(match.live_statistics) && match.live_statistics.length > 0;

    return !hasEvents && !hasLineups && !hasStatistics;
  });

  const syncAgeHours = lastSyncedAt
    ? (now.getTime() - new Date(lastSyncedAt).getTime()) / 3_600_000
    : null;

  const attentionItems: Array<{
    icon: string;
    title: string;
    text: string;
    className: string;
  }> = [];

  postponedMatches.forEach((match) => {
    attentionItems.push({
      icon: "⚠️",
      title: `${matchLabel(match)} wurde verschoben`,
      text: "Tippabgabe ist gesperrt. Der neue Termin wird beim nächsten API-Sync übernommen, sobald er verfügbar ist.",
      className: "border-orange-200 bg-orange-50 text-orange-950",
    });
  });

  if (missingDetails.length > 0) {
    attentionItems.push({
      icon: "📊",
      title: `${missingDetails.length} abgeschlossene ${
        missingDetails.length === 1 ? "Spiel hat" : "Spiele haben"
      } keine Matchdetails`,
      text: "Du kannst die Matchdetails im Bereich „Aktiv & geplant“ gesammelt nachladen.",
      className: "border-blue-200 bg-blue-50 text-blue-950",
    });
  }

  if (syncAgeHours !== null && syncAgeHours > 6) {
    attentionItems.push({
      icon: "🔄",
      title: "API-Synchronisation ist älter als 6 Stunden",
      text: `Letzter gespeicherter Sync: ${formatSyncTime(lastSyncedAt)}.`,
      className: "border-amber-200 bg-amber-50 text-amber-950",
    });
  }

  return (
    <main className="min-h-screen bg-green-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-green-300 text-sm font-semibold">FCSG TIPPSPIEL</p>
          <h1 className="text-4xl font-black">Admin-Dashboard</h1>
          <p className="text-green-200 mt-2">
            Alles Wichtige zum Tippspiel auf einen Blick.
          </p>
        </div>

        <AdminNavigation />

        <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 mb-8">
          <div className="col-span-2 lg:col-span-1 rounded-2xl bg-white text-black p-5 shadow-xl border border-green-200">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-2xl">⚽</span>
              <span className="text-xs font-black uppercase tracking-wide text-green-700">
                Nächstes Spiel
              </span>
            </div>
            {nextMatch ? (
              <>
                <p className="font-black text-lg leading-tight">
                  {matchLabel(nextMatch)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {formatKickoff(nextMatch.kickoff)}
                </p>
                {nextMatch.competition_name && (
                  <p className="text-xs font-bold text-green-800 mt-2">
                    {nextMatch.competition_name}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500">Kein kommendes Spiel bekannt.</p>
            )}
          </div>

          <div className="rounded-2xl bg-white text-black p-5 shadow-xl">
            <span className="text-2xl">🎯</span>
            <p className="text-3xl font-black mt-4">
              {nextMatch ? `${tipCount}/${totalPlayers}` : "–"}
            </p>
            <p className="font-bold mt-1">Tipps abgegeben</p>
            <p className="text-xs text-gray-500 mt-1">
              {nextMatch
                ? missingTips === 0
                  ? "Alle haben getippt ✅"
                  : `${missingTips} ${missingTips === 1 ? "Tipp fehlt" : "Tipps fehlen"}`
                : "Kein Spiel zur Tippabgabe"}
            </p>
          </div>

          <div className="rounded-2xl bg-white text-black p-5 shadow-xl">
            <span className="text-2xl">👥</span>
            <p className="text-3xl font-black mt-4">{totalPlayers}</p>
            <p className="font-bold mt-1">Aktive Spieler</p>
            <p className="text-xs text-gray-500 mt-1">Versteckte Testkonten ausgenommen</p>
          </div>

          <div className="rounded-2xl bg-white text-black p-5 shadow-xl">
            <span className="text-2xl">🏆</span>
            <p className="text-xl sm:text-2xl font-black mt-4 truncate">
              {leader?.username ?? "–"}
            </p>
            <p className="font-bold mt-1">Spitzenreiter</p>
            <p className="text-xs text-gray-500 mt-1">
              {leader ? `${leader.points} Punkte` : "Noch keine Rangliste"}
            </p>
          </div>

          <div className="rounded-2xl bg-white text-black p-5 shadow-xl">
            <span className="text-2xl">📅</span>
            <p className="text-3xl font-black mt-4">{matches.length}</p>
            <p className="font-bold mt-1">Spiele insgesamt</p>
            <p className="text-xs text-gray-500 mt-1">
              {finishedMatches.length} beendet · {openMatches.length} offen
            </p>
          </div>

          <div className="rounded-2xl bg-white text-black p-5 shadow-xl">
            <span className="text-2xl">🔄</span>
            <p className="text-lg sm:text-xl font-black mt-4">
              {lastSyncedAt ? formatSyncTime(lastSyncedAt) : "Noch nie"}
            </p>
            <p className="font-bold mt-1">Letzter API-Sync</p>
            <p className="text-xs text-gray-500 mt-1">
              {postponedMatches.length > 0
                ? `${postponedMatches.length} ${postponedMatches.length === 1 ? "Spiel verschoben" : "Spiele verschoben"}`
                : "Keine verschobenen Spiele"}
            </p>
          </div>
        </section>

        <section className="bg-white text-black rounded-2xl p-5 sm:p-6 shadow-xl mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-black">Benötigt Aufmerksamkeit</h2>
              <p className="text-sm text-gray-500 mt-1">
                Auffälligkeiten, die du als Admin im Blick behalten solltest.
              </p>
            </div>
            {attentionItems.length === 0 && (
              <span className="rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-black">
                ✅ Alles ruhig
              </span>
            )}
          </div>

          {attentionItems.length === 0 ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-950">
              Aktuell gibt es keine offenen Warnungen. Das Tippspiel sieht sauber aus.
            </div>
          ) : (
            <div className="space-y-3">
              {attentionItems.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className={`rounded-xl border p-4 ${item.className}`}
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-xl" aria-hidden="true">{item.icon}</span>
                    <div>
                      <p className="font-black">{item.title}</p>
                      <p className="text-sm mt-1 opacity-80">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid sm:grid-cols-3 gap-3">
          <a
            href="/admin"
            className="rounded-xl bg-green-700 hover:bg-green-600 px-5 py-4 font-black text-center transition"
          >
            ⚙️ Spiele verwalten
          </a>
          <a
            href="/admin/abgeschlossen"
            className="rounded-xl bg-white hover:bg-gray-100 text-green-950 px-5 py-4 font-black text-center transition"
          >
            ✅ Abgeschlossene Spiele
          </a>
          <a
            href="/"
            className="rounded-xl border border-green-700 hover:bg-green-900 px-5 py-4 font-black text-center transition"
          >
            ← Zum Tippspiel
          </a>
        </section>
      </div>
    </main>
  );
}
