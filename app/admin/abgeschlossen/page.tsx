import { Suspense } from "react";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";

import {
  deleteMatch,
  adminLogout,
  updateFinishedMatch,
} from "../actions";

import { DeleteMatchButton } from "@/components/delete-match-button";
import { AdminNavigation } from "@/components/admin-navigation";
import { EditFinishedMatch } from "@/components/edit-finished-match";


async function FinishedMatchesContent() {
  // Prüfen, ob Admin eingeloggt ist
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin-login");
  }

  const supabase = createAdminClient();


  // Abgeschlossene Spiele laden
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("finished", true)
    .order("kickoff", { ascending: false });

  if (error) {
    return (
      <p className="text-red-300">
        Abgeschlossene Spiele konnten nicht geladen werden:
        {" "}
        {error.message}
      </p>
    );
  }


  // Benutzerprofile laden
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username");


  // Alle Tipps laden
  const { data: tips } = await supabase
    .from("tips")
    .select(`
      id,
      match_id,
      user_id,
      fcsg_tip,
      opponent_tip,
      points
    `);


  return (
    <div className="max-w-4xl mx-auto">

      {/* =========================
          KOPFBEREICH
      ========================== */}

      <div className="mb-10">
        <p className="text-green-300 text-sm font-semibold">
          FCSG TIPPSPIEL
        </p>

        <h1 className="text-4xl font-bold">
          Admin-Bereich
        </h1>

        <div className="flex flex-wrap gap-3 mt-5">

          {/* Zurück */}
          <a
            href="/"
            className="bg-white text-green-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Zurück zum Tippspiel
          </a>


          {/* Admin Logout */}
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


      {/* =========================
          ADMIN NAVIGATION
      ========================== */}

      <AdminNavigation />


      {/* =========================
          ABGESCHLOSSENE SPIELE
      ========================== */}

      <section className="bg-white text-black rounded-2xl p-6">

        <h2 className="text-2xl font-bold mb-5">
          Abgeschlossene Spiele
        </h2>


        {!matches || matches.length === 0 ? (

          <p className="text-gray-500">
            Noch keine abgeschlossenen Spiele vorhanden.
          </p>

        ) : (

          <div className="space-y-6">

            {matches.map((match) => {

              // Nur Tipps dieses Spiels
              const matchTips =
                tips?.filter(
                  (tip) => tip.match_id === match.id
                ) ?? [];


              return (
                <div
                  key={match.id}
                  className="border rounded-xl p-5"
                >

                  {/* =========================
                      DATUM
                  ========================== */}

                  <p className="text-sm text-gray-500">
                    {new Date(
                      match.kickoff
                    ).toLocaleString("de-CH")}
                  </p>


                  {/* =========================
                      SPIEL
                  ========================== */}

                  <h3 className="text-xl font-bold mt-1">
                    {match.is_home
                      ? `FC St. Gallen – ${match.opponent}`
                      : `${match.opponent} – FC St. Gallen`}
                  </h3>


                  {/* =========================
                      ENDSTAND
                  ========================== */}

                  <div className="bg-gray-100 rounded-xl p-4 mt-4 mb-5 text-center">

                    <p className="text-sm text-gray-500 mb-1">
                      Endstand
                    </p>

                    <p className="text-3xl font-bold">
                      {match.is_home
                        ? `${match.fcsg_score} : ${match.opponent_score}`
                        : `${match.opponent_score} : ${match.fcsg_score}`}
                    </p>

                  </div>


                  {/* =========================
                      ABGEGEBENE TIPPS
                  ========================== */}

                  <div className="bg-gray-50 rounded-xl p-4 mb-5">

                    <h4 className="font-bold mb-3">
                      Abgegebene Tipps
                    </h4>


                    {matchTips.length === 0 ? (

                      <p className="text-sm text-gray-500">
                        Für dieses Spiel wurden keine Tipps abgegeben.
                      </p>

                    ) : (

                      <div className="space-y-2">

                        {matchTips.map((tip) => {

                          // Benutzer zum Tipp suchen
                          const profile = profiles?.find(
                            (profile) =>
                              profile.id === tip.user_id
                          );

                          const username =
                            profile?.username ?? "Spieler";


                          // Tipp korrekt nach Heim / Auswärts anzeigen
                          const displayedTip = match.is_home
                            ? `${tip.fcsg_tip} : ${tip.opponent_tip}`
                            : `${tip.opponent_tip} : ${tip.fcsg_tip}`;


                          return (
                            <div
                              key={tip.id}
                              className="grid grid-cols-[1fr_auto_auto] gap-4 items-center border-b border-gray-200 last:border-0 pb-2 last:pb-0"
                            >

                              {/* Benutzer */}
                              <span className="font-medium">
                                {username}
                              </span>


                              {/* Tipp */}
                              <span className="font-bold">
                                {displayedTip}
                              </span>


                              {/* Punkte */}
                              <span className="font-bold text-green-700 min-w-16 text-right">
                                {tip.points ?? 0} Pkt.
                              </span>

                            </div>
                          );
                        })}

                      </div>

                    )}

                  </div>


                  {/* =========================
                      ADMIN AKTIONEN
                  ========================== */}

                  <div className="flex flex-wrap gap-3 items-start">

                    {/* Bearbeiten */}
                    <EditFinishedMatch
                      match={match}
                      updateAction={updateFinishedMatch}
                    />


                    {/* Löschen */}
                    <DeleteMatchButton
                      matchId={match.id}
                      deleteAction={deleteMatch}
                    />

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </section>

    </div>
  );
}


export default function FinishedMatchesPage() {
  return (
    <main className="min-h-screen bg-green-950 text-white p-6 md:p-8">

      <Suspense
        fallback={
          <p>
            Abgeschlossene Spiele werden geladen...
          </p>
        }
      >

        <FinishedMatchesContent />

      </Suspense>

    </main>
  );
}