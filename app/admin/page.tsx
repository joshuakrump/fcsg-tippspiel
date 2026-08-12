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

import { DeleteMatchButton } from "@/components/delete-match-button";
import { AdminNavigation } from "@/components/admin-navigation";

async function AdminContent() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin-login");
  }

  const supabase = createAdminClient();

  // Teams laden
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

  // Spiele laden
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

  const openMatches =
    matches?.filter((match) => !match.finished) ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Kopfbereich */}
      <div className="mb-10">
        <p className="text-green-300 text-sm font-semibold">
          FCSG TIPPSPIEL
        </p>

        <h1 className="text-4xl font-bold">
          Admin-Bereich
        </h1>

        <AdminNavigation />

        <div className="flex flex-wrap gap-3 mt-5">
          <a
            href="/"
            className="bg-white text-green-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Zurück zum Tippspiel
          </a>

          <form action={adminLogout}>
            <button
              type="submit"
              className="bg-white text-green-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Admin abmelden
            </button>
          </form>
        </div>
      </div>

      {/* Super-League Import */}
      <section className="bg-white text-black rounded-2xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2">
          Super-League-Spiele importieren
        </h2>

        <p className="text-gray-600 mb-5">
          Lade die FCSG-Spiele eines Monats automatisch aus API-Football.
        </p>

        <form
          action={importMatchesForMonth}
          className="grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end"
        >
          <div>
            <label
              htmlFor="year"
              className="block font-semibold mb-2"
            >
              Jahr
            </label>

            <select
              id="year"
              name="year"
              defaultValue="2026"
              className="w-full border rounded-lg p-3"
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="month"
              className="block font-semibold mb-2"
            >
              Monat
            </label>

            <select
              id="month"
              name="month"
              defaultValue="8"
              className="w-full border rounded-lg p-3"
            >
              <option value="1">Januar</option>
              <option value="2">Februar</option>
              <option value="3">März</option>
              <option value="4">April</option>
              <option value="5">Mai</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Dezember</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-lg font-bold"
          >
            Spiele importieren
          </button>
        </form>
      </section>

      {/* Neues Spiel */}
      <section className="bg-white text-black rounded-2xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-5">
          Neues Spiel
        </h2>

        <form action={createMatch} className="space-y-5">
          <div>
            <label
              htmlFor="teamId"
              className="block font-semibold mb-2"
            >
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
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="kickoff"
              className="block font-semibold mb-2"
            >
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
            <label
              htmlFor="location"
              className="block font-semibold mb-2"
            >
              Spielort
            </label>

            <select
              id="location"
              name="location"
              className="w-full border rounded-lg p-3"
              defaultValue="home"
            >
              <option value="home">
                Heimspiel
              </option>

              <option value="away">
                Auswärtsspiel
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-green-700 text-white px-5 py-3 rounded-lg font-bold"
          >
            Spiel hinzufügen
          </button>
        </form>
      </section>

      {/* Offene Spiele */}
      <section className="bg-white text-black rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-5">
          Offene Spiele
        </h2>

        {openMatches.length === 0 ? (
          <p className="text-gray-500">
            Keine offenen Spiele vorhanden.
          </p>
        ) : (
          <div className="space-y-6">
            {openMatches.map((match) => (
              <div
                key={match.id}
                className="border rounded-xl p-5"
              >
                <p className="text-sm text-gray-500 mb-1">
                  Spiel verwalten
                </p>

                <h3 className="text-xl font-bold mb-5">
                  {match.is_home
                    ? `FC St. Gallen – ${match.opponent}`
                    : `${match.opponent} – FC St. Gallen`}
                </h3>

                {/* Spiel bearbeiten */}
                <form
                  action={updateMatch}
                  className="space-y-4 border-b pb-5 mb-5"
                >
                  <input
                    type="hidden"
                    name="matchId"
                    value={match.id}
                  />

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Gegner
                    </label>

                   <select
  name="opponent"
  defaultValue={match.opponent}
  required
  className="w-full border rounded-lg p-2"
>
  {teams?.map((team) => (
    <option
      key={team.id}
      value={team.name}
    >
      {team.name}
    </option>
  ))}
</select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Anpfiff
                    </label>

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
                    <label className="block text-sm font-semibold mb-1">
                      Spielort
                    </label>

                    <select
                      name="location"
                      defaultValue={
                        match.is_home ? "home" : "away"
                      }
                      className="w-full border rounded-lg p-2"
                    >
                      <option value="home">
                        Heimspiel
                      </option>

                      <option value="away">
                        Auswärtsspiel
                      </option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-blue-700 text-white px-4 py-2 rounded-lg font-bold"
                  >
                    Änderungen speichern
                  </button>
                </form>

                {/* LIVE API */}
                <div className="border-b pb-5 mb-5">
                  <h4 className="font-bold mb-3">
                    Live-Daten
                  </h4>

                  {match.api_fixture_id ? (
                    <>
                      <form action={syncMatchWithApi}>
                        <input
                          type="hidden"
                          name="matchId"
                          value={match.id}
                        />

                        <button
                          type="submit"
                          className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg font-bold"
                        >
                          🔄 Mit Live-API synchronisieren
                        </button>
                      </form>

                      {/* Aktuelle API-Daten */}
                      {match.live_status && (
                        <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-4">
                          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                            <p>
                              Status:{" "}
                              <strong>
                                {match.live_status}
                              </strong>
                            </p>

                            {match.live_minute !== null && (
                              <p>
                                Minute:{" "}
                                <strong>
                                  {match.live_minute}
                                  {match.live_extra
                                    ? `+${match.live_extra}`
                                    : ""}
                                  '
                                </strong>
                              </p>
                            )}

                            {match.live_home_score !== null &&
                              match.live_away_score !== null && (
                                <p>
                                  Live-Spielstand:{" "}
                                  <strong>
                                    {match.live_home_score} :{" "}
                                    {match.live_away_score}
                                  </strong>
                                </p>
                              )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Dieses Spiel wurde nicht über API-Football importiert.
                    </p>
                  )}
                </div>

                {/* Spiel abschliessen */}
                <div className="mb-5">
                  <h4 className="font-bold mb-3">
                    Spiel manuell abschliessen
                  </h4>

                  <p className="text-sm text-gray-500 mb-3">
                    Nur verwenden, wenn das automatische API-Ergebnis nicht
                    korrekt übernommen wurde.
                  </p>

                  <form
                    action={finishMatch}
                    className="flex flex-wrap items-end gap-3"
                  >
                    <input
                      type="hidden"
                      name="matchId"
                      value={match.id}
                    />

                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        FCSG Tore
                      </label>

                      <input
                        name="fcsgScore"
                        type="number"
                        min="0"
                        required
                        className="w-24 border rounded-lg p-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        Gegner Tore
                      </label>

                      <input
                        name="opponentScore"
                        type="number"
                        min="0"
                        required
                        className="w-24 border rounded-lg p-2"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold"
                    >
                      Spiel abschliessen
                    </button>
                  </form>
                </div>

                {/* Löschen */}
                <DeleteMatchButton
                  matchId={match.id}
                  deleteAction={deleteMatch}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-green-950 text-white p-8">
      <Suspense fallback={<p>Admin wird geladen...</p>}>
        <AdminContent />
      </Suspense>
    </main>
  );
}
