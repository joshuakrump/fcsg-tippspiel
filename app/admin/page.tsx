import { Suspense } from "react";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";

import {
  createMatch,
  finishMatch,
  updateMatch,
  deleteMatch,
  adminLogout,
  importMatchesForMonth,
  syncMatchWithApi,
} from "./actions";
import { syncFinishedMatchDetails } from "./match-detail-actions";

import { DeleteMatchButton } from "@/components/delete-match-button";
import { AdminNavigation } from "@/components/admin-navigation";
import { AdminSubmitButton } from "@/components/admin-submit-button";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const STATUS_INFO: Record<
  string,
  { label: string; badge: string; icon: string }
> = {
  NS: { label: "Geplant", badge: "bg-slate-100 text-slate-700", icon: "📅" },
  TBD: { label: "Termin offen", badge: "bg-amber-100 text-amber-800", icon: "⏳" },
  PST: { label: "Verschoben", badge: "bg-orange-100 text-orange-800", icon: "⚠️" },
  CANC: { label: "Abgesagt", badge: "bg-red-100 text-red-800", icon: "❌" },
  ABD: { label: "Abgebrochen", badge: "bg-red-100 text-red-800", icon: "⛔" },
  SUSP: { label: "Unterbrochen", badge: "bg-amber-100 text-amber-800", icon: "⏸️" },
  INT: { label: "Unterbrochen", badge: "bg-amber-100 text-amber-800", icon: "⏸️" },
  FT: { label: "Beendet", badge: "bg-green-100 text-green-800", icon: "✅" },
  AET: { label: "Beendet n. V.", badge: "bg-green-100 text-green-800", icon: "✅" },
  PEN: { label: "Beendet n. P.", badge: "bg-green-100 text-green-800", icon: "✅" },
  HT: { label: "Halbzeit", badge: "bg-red-100 text-red-800", icon: "🔴" },
  "1H": { label: "Live · 1. Halbzeit", badge: "bg-red-100 text-red-800", icon: "🔴" },
  "2H": { label: "Live · 2. Halbzeit", badge: "bg-red-100 text-red-800", icon: "🔴" },
  ET: { label: "Live · Verlängerung", badge: "bg-red-100 text-red-800", icon: "🔴" },
  P: { label: "Live · Penaltyschiessen", badge: "bg-red-100 text-red-800", icon: "🔴" },
};

function getStatusInfo(status: string | null) {
  if (!status) {
    return { label: "Kein API-Status", badge: "bg-slate-100 text-slate-600", icon: "○" };
  }

  return (
    STATUS_INFO[status] ?? {
      label: status,
      badge: "bg-purple-100 text-purple-800",
      icon: "ℹ️",
    }
  );
}

function formatKickoff(kickoff: string) {
  return formatInTimeZone(
    new Date(kickoff),
    "Europe/Zurich",
    "dd.MM.yyyy · HH:mm"
  );
}

type ImportResult = {
  import?: string;
  count?: string;
  month?: string;
  year?: string;
  details?: string;
  checked?: string;
  updated?: string;
  unavailable?: string;
};

async function AdminContent({ importResult }: { importResult: ImportResult }) {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin-login");
  }

  const supabase = createAdminClient();

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, short_name, logo_path")
    .neq("short_name", "FCSG")
    .order("name", { ascending: true });

  if (teamsError) {
    return (
      <p className="text-red-300">
        Teams konnten nicht geladen werden: {teamsError.message}
      </p>
    );
  }

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff", { ascending: true });

  if (error) {
    return (
      <p className="text-red-300">
        Spiele konnten nicht geladen werden: {error.message}
      </p>
    );
  }

  const openMatches = matches?.filter((match) => !match.finished) ?? [];
  const groupedOpenMatches = openMatches.reduce<
    { key: string; label: string; matches: typeof openMatches }[]
  >((groups, match) => {
    const year = formatInTimeZone(new Date(match.kickoff), "Europe/Zurich", "yyyy");
    const month = Number(
      formatInTimeZone(new Date(match.kickoff), "Europe/Zurich", "M")
    );
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[month - 1]} ${year}`;
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      existing.matches.push(match);
    } else {
      groups.push({ key, label, matches: [match] });
    }

    return groups;
  }, []);

  const now = new Date();
  const currentYear = formatInTimeZone(now, "Europe/Zurich", "yyyy");
  const currentMonth = formatInTimeZone(now, "Europe/Zurich", "M");
  const yearOptions = Array.from(
    new Set([Number(currentYear), Number(currentYear) + 1, 2026, 2027])
  ).sort((a, b) => a - b);

  const importMonthNumber = Number(importResult.month);
  const importMonthName =
    importMonthNumber >= 1 && importMonthNumber <= 12
      ? MONTH_NAMES[importMonthNumber - 1]
      : "Monat";
  const importCount = Number(importResult.count || 0);
  const detailsChecked = Number(importResult.checked || 0);
  const detailsUpdated = Number(importResult.updated || 0);
  const detailsUnavailable = Number(importResult.unavailable || 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <p className="text-green-300 text-sm font-semibold">FCSG TIPPSPIEL</p>
        <h1 className="text-4xl font-bold">Admin-Bereich</h1>

        <AdminNavigation />

        <div className="flex flex-wrap gap-3 mt-5">
          <a
            href="/"
            className="bg-white text-green-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Zurück zum Tippspiel
          </a>

          <form action={adminLogout}>
            <AdminSubmitButton
              idleText="Admin abmelden"
              pendingText="Wird abgemeldet…"
              className="bg-white text-green-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            />
          </form>
        </div>
      </div>

      {importResult.import === "success" && (
        <div className="mb-8 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 text-green-900 shadow-sm">
          <p className="font-bold text-lg">✅ Import erfolgreich</p>
          <p className="mt-1 text-sm">
            {importMonthName} {importResult.year}: {importCount}{" "}
            {importCount === 1 ? "Spiel wurde" : "Spiele wurden"} importiert oder aktualisiert.
          </p>
        </div>
      )}

      {importResult.details === "success" && (
        <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-950 shadow-sm">
          <p className="font-bold text-lg">🔄 Matchdetails synchronisiert</p>
          <p className="mt-1 text-sm">
            {detailsChecked} abgeschlossene API-Spiele geprüft. Für {detailsUpdated}{" "}
            {detailsUpdated === 1 ? "Spiel wurden" : "Spiele wurden"} Detaildaten gefunden.
            {detailsUnavailable > 0 && (
              <> Für {detailsUnavailable} {detailsUnavailable === 1 ? "Spiel liefert" : "Spiele liefert"} die API aktuell keine Detaildaten.</>
            )}
          </p>
        </div>
      )}

      <section className="bg-white text-black rounded-2xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2">FCSG-Spiele importieren</h2>
        <p className="text-gray-600 mb-5">
          Lade alle bekannten FCSG-Spiele eines Monats aus API-Football – unabhängig vom Wettbewerb.
          Bereits importierte Spiele werden dabei mit den aktuellen offiziellen Daten aktualisiert.
        </p>

        <form
          action={importMatchesForMonth}
          className="grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end"
        >
          <div>
            <label htmlFor="year" className="block font-semibold mb-2">
              Jahr
            </label>
            <select
              id="year"
              name="year"
              defaultValue={currentYear}
              className="w-full border rounded-lg p-3"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="month" className="block font-semibold mb-2">
              Monat
            </label>
            <select
              id="month"
              name="month"
              defaultValue={currentMonth}
              className="w-full border rounded-lg p-3"
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <AdminSubmitButton
            idleText="Spiele importieren"
            pendingText="⏳ Import läuft…"
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-lg font-bold"
          />
        </form>
      </section>

      <section className="bg-white text-black rounded-2xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2">Matchdetails nachladen</h2>
        <p className="text-gray-600 mb-5">
          Prüft alle abgeschlossenen API-Spiele nochmals auf Ereignisse, Aufstellungen und Statistiken.
          Das ist besonders nach dem Import älterer Cup- oder Europaspiele hilfreich.
        </p>
        <form action={syncFinishedMatchDetails}>
          <AdminSubmitButton
            idleText="🔄 Matchdetails aller abgeschlossenen Spiele synchronisieren"
            pendingText="⏳ Matchdetails werden synchronisiert…"
            className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-lg font-bold"
          />
        </form>
      </section>

      <details className="bg-white text-black rounded-2xl mb-8 overflow-hidden group">
        <summary className="cursor-pointer list-none p-6 flex items-center justify-between gap-4 hover:bg-gray-50 transition">
          <div>
            <h2 className="text-2xl font-bold">Manuell ein Spiel hinzufügen</h2>
            <p className="text-gray-500 text-sm mt-1">
              Nur nötig, wenn ein Spiel nicht über API-Football importiert wird.
            </p>
          </div>
          <span className="text-2xl font-bold group-open:rotate-45 transition-transform">
            +
          </span>
        </summary>

        <div className="px-6 pb-6 border-t pt-5">
          <form action={createMatch} className="space-y-5">
            <div>
              <label htmlFor="teamId" className="block font-semibold mb-2">
                Gegner
              </label>
              <select
                id="teamId"
                name="teamId"
                required
                defaultValue=""
                className="w-full border rounded-lg p-3"
              >
                <option value="" disabled>
                  Gegner auswählen...
                </option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="kickoff" className="block font-semibold mb-2">
                Anpfiff
              </label>
              <input
                id="kickoff"
                name="kickoff"
                type="datetime-local"
                required
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label htmlFor="location" className="block font-semibold mb-2">
                Spielort
              </label>
              <select
                id="location"
                name="location"
                className="w-full border rounded-lg p-3"
                defaultValue="home"
              >
                <option value="home">Heimspiel</option>
                <option value="away">Auswärtsspiel</option>
              </select>
            </div>

            <AdminSubmitButton
              idleText="Spiel hinzufügen"
              pendingText="⏳ Spiel wird hinzugefügt…"
              className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-lg font-bold"
            />
          </form>
        </div>
      </details>

      <section className="bg-white text-black rounded-2xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold">Offene Spiele</h2>
            <p className="text-sm text-gray-500 mt-1">
              {openMatches.length} {openMatches.length === 1 ? "Spiel" : "Spiele"} offen
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Spiel anklicken, um Details zu bearbeiten
          </p>
        </div>

        {openMatches.length === 0 ? (
          <p className="text-gray-500">Keine offenen Spiele vorhanden.</p>
        ) : (
          <div className="space-y-8">
            {groupedOpenMatches.map((group) => (
              <div key={group.key}>
                <div className="mb-3 flex items-center justify-between gap-3 border-b pb-2">
                  <h3 className="text-lg font-bold text-green-900">{group.label}</h3>
                  <span className="text-xs font-semibold text-gray-500">
                    {group.matches.length} {group.matches.length === 1 ? "Spiel" : "Spiele"}
                  </span>
                </div>

                <div className="space-y-4">
                  {group.matches.map((match) => {
                    const statusInfo = getStatusInfo(match.live_status);
                    const isPostponed = match.live_status === "PST";
                    const isApiMatch = Boolean(match.api_fixture_id);

                    return (
                      <details
                        key={match.id}
                        className={`border rounded-xl overflow-hidden group ${
                          isPostponed ? "border-orange-300 bg-orange-50/40" : "bg-white"
                        }`}
                      >
                        <summary className="cursor-pointer list-none p-5 hover:bg-gray-50/70 transition">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h3 className="text-xl font-bold">
                                {match.is_home
                                  ? `FC St. Gallen – ${match.opponent}`
                                  : `${match.opponent} – FC St. Gallen`}
                              </h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                                <span>📅 {formatKickoff(match.kickoff)}</span>
                                <span>{match.is_home ? "🏠 Heimspiel" : "🚌 Auswärtsspiel"}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusInfo.badge}`}
                              >
                                {statusInfo.icon} {statusInfo.label}
                              </span>
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                                  isApiMatch
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {isApiMatch ? "🟣 API-Spiel" : "⚪ Manuell"}
                              </span>
                              <span className="text-gray-400 group-open:rotate-180 transition-transform">
                                ▼
                              </span>
                            </div>
                          </div>

                          {isPostponed && (
                            <div className="mt-4 rounded-lg bg-orange-100 text-orange-900 px-4 py-3 text-sm font-semibold">
                              ⚠️ Dieses Spiel wurde verschoben. Beim nächsten API-Sync wird ein neuer Termin automatisch übernommen, sobald er verfügbar ist.
                            </div>
                          )}
                        </summary>

                        <div className="border-t px-5 pb-5 pt-5 bg-white">
                          <div className="grid gap-6">
                            <div>
                              <h4 className="font-bold mb-3">Spiel bearbeiten</h4>

                              {isApiMatch && (
                                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                  <strong>Hinweis:</strong> Manuelle Änderungen an Gegner, Datum oder Spielort werden bei der nächsten API-Synchronisation wieder durch die offiziellen API-Daten ersetzt.
                                </div>
                              )}

                              <form action={updateMatch} className="space-y-4">
                                <input type="hidden" name="matchId" value={match.id} />

                                <div>
                                  <label className="block text-sm font-semibold mb-1">Gegner</label>
                                  <select
                                    name="opponent"
                                    defaultValue={match.opponent}
                                    required
                                    className="w-full border rounded-lg p-2"
                                  >
                                    {teams?.map((team) => (
                                      <option key={team.id} value={team.name}>
                                        {team.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold mb-1">Anpfiff</label>
                                  <input
                                    name="kickoff"
                                    type="datetime-local"
                                    defaultValue={formatInTimeZone(
                                      new Date(match.kickoff),
                                      "Europe/Zurich",
                                      "yyyy-MM-dd'T'HH:mm"
                                    )}
                                    required
                                    className="w-full border rounded-lg p-2"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold mb-1">Spielort</label>
                                  <select
                                    name="location"
                                    defaultValue={match.is_home ? "home" : "away"}
                                    className="w-full border rounded-lg p-2"
                                  >
                                    <option value="home">Heimspiel</option>
                                    <option value="away">Auswärtsspiel</option>
                                  </select>
                                </div>

                                <AdminSubmitButton
                                  idleText="Änderungen speichern"
                                  pendingText="⏳ Wird gespeichert…"
                                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-bold"
                                />
                              </form>
                            </div>

                            <div className="border-t pt-5">
                              <h4 className="font-bold mb-3">Live-Daten</h4>

                              {isApiMatch ? (
                                <>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <form action={syncMatchWithApi}>
                                      <input type="hidden" name="matchId" value={match.id} />
                                      <AdminSubmitButton
                                        idleText="🔄 Mit Live-API synchronisieren"
                                        pendingText="⏳ Synchronisiere…"
                                        className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg font-bold"
                                      />
                                    </form>

                                    {match.api_last_synced_at && (
                                      <span className="text-xs text-gray-500">
                                        ✅ Zuletzt synchronisiert: {formatInTimeZone(
                                          new Date(match.api_last_synced_at),
                                          "Europe/Zurich",
                                          "dd.MM.yyyy · HH:mm:ss"
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {match.live_status && (
                                    <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-4">
                                      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                                        <p>
                                          Status: <strong>{statusInfo.icon} {statusInfo.label}</strong>
                                          <span className="text-gray-400 ml-1">({match.live_status})</span>
                                        </p>

                                        {match.live_minute !== null && (
                                          <p>
                                            Minute: <strong>
                                              {match.live_minute}
                                              {match.live_extra ? `+${match.live_extra}` : ""}'
                                            </strong>
                                          </p>
                                        )}

                                        {match.live_home_score !== null &&
                                          match.live_away_score !== null && (
                                            <p>
                                              Live-Spielstand: <strong>
                                                {match.live_home_score} : {match.live_away_score}
                                              </strong>
                                            </p>
                                          )}
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  Dieses Spiel wurde manuell erstellt und besitzt keine API-Verknüpfung.
                                </p>
                              )}
                            </div>

                            <div className="border-t pt-5">
                              <h4 className="font-bold mb-3">Spiel manuell abschliessen</h4>
                              <p className="text-sm text-gray-500 mb-3">
                                Nur verwenden, wenn das automatische API-Ergebnis nicht korrekt übernommen wurde.
                              </p>

                              <form action={finishMatch} className="flex flex-wrap items-end gap-3">
                                <input type="hidden" name="matchId" value={match.id} />

                                <div>
                                  <label className="block text-sm font-semibold mb-1">FCSG Tore</label>
                                  <input
                                    name="fcsgScore"
                                    type="number"
                                    min="0"
                                    required
                                    className="w-24 border rounded-lg p-2"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold mb-1">Gegner Tore</label>
                                  <input
                                    name="opponentScore"
                                    type="number"
                                    min="0"
                                    required
                                    className="w-24 border rounded-lg p-2"
                                  />
                                </div>

                                <AdminSubmitButton
                                  idleText="Spiel abschliessen"
                                  pendingText="⏳ Wird abgeschlossen…"
                                  className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-bold"
                                />
                              </form>
                            </div>

                            <div className="border-t pt-5">
                              <DeleteMatchButton
                                matchId={match.id}
                                deleteAction={deleteMatch}
                              />
                            </div>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type AdminPageProps = {
  searchParams: Promise<ImportResult>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const importResult = await searchParams;

  return (
    <main className="min-h-screen bg-green-950 text-white p-4 sm:p-8">
      <Suspense fallback={<p>Admin wird geladen...</p>}>
        <AdminContent importResult={importResult} />
      </Suspense>
    </main>
  );
}
