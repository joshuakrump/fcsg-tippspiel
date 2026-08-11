import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";

export default function RegelnPage() {
  return (
    <AppShell>
      <AppHeader subtitle="Regeln, Punkte & Preise" />

      <Navigation />

      {/* Punktevergabe */}
      <section className="bg-white text-black rounded-3xl p-5 sm:p-7 mb-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-black">
            Punktevergabe
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            So sammelst du Punkte pro Spiel
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">
                Richtige Tendenz
              </span>

              <span className="bg-green-100 text-green-800 font-black px-3 py-1 rounded-full">
                +1
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Sieg, Unentschieden oder Niederlage korrekt
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">
                Richtige Tordifferenz
              </span>

              <span className="bg-green-100 text-green-800 font-black px-3 py-1 rounded-full">
                +2
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Die Differenz zwischen Heim- und Auswärtstoren stimmt
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">
                Richtige Heimtore
              </span>

              <span className="bg-green-100 text-green-800 font-black px-3 py-1 rounded-full">
                +1
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Anzahl Tore des Heimteams stimmt
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">
                Richtige Auswärtstore
              </span>

              <span className="bg-green-100 text-green-800 font-black px-3 py-1 rounded-full">
                +1
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Anzahl Tore des Auswärtsteams stimmt
            </p>
          </div>

          <div className="sm:col-span-2 bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-black">
                  Exaktes Resultat
                </span>

                <p className="text-sm text-green-800 mt-1">
                  Resultat vollständig richtig getippt
                </p>
              </div>

              <span className="bg-green-700 text-white font-black px-3 py-1 rounded-full">
                +2 Bonus
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-green-800 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-green-200 font-semibold">
              Maximum pro Spiel
            </p>

            <p className="text-xl sm:text-2xl font-black">
              🏆 7 Punkte
            </p>
          </div>

          <span className="text-3xl">
            ⚽
          </span>
        </div>

        {/* Beispiel */}
        <div className="mt-6">
          <h3 className="font-black text-lg mb-3">
            Beispiel
          </h3>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">
                Endresultat
              </p>

              <p className="font-black text-lg mt-1">
                FC Zürich 1 : 2 FC St. Gallen
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 bg-white rounded-xl px-3 py-3 border border-gray-100">
                <span>
                  Tipp <strong>1 : 2</strong>
                </span>

                <span className="font-black text-green-800">
                  7 Pkt.
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 bg-white rounded-xl px-3 py-3 border border-gray-100">
                <span>
                  Tipp <strong>0 : 1</strong>
                </span>

                <span className="font-black text-green-800">
                  3 Pkt.
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 bg-white rounded-xl px-3 py-3 border border-gray-100">
                <span>
                  Tipp <strong>1 : 3</strong>
                </span>

                <span className="font-black text-green-800">
                  2 Pkt.
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 bg-white rounded-xl px-3 py-3 border border-gray-100">
                <span>
                  Tipp <strong>1 : 1</strong>
                </span>

                <span className="font-black text-green-800">
                  1 Pkt.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tippregeln */}
      <section className="bg-white text-black rounded-3xl p-5 sm:p-7 mb-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-2xl sm:text-3xl font-black">
            Tippregeln
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Das Wichtigste rund um deine Tippabgabe
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <span className="text-xl shrink-0">
              ⚽
            </span>

            <p>
              Der Tipp kann bis zum offiziellen Anpfiff geändert werden.
            </p>
          </div>

          <div className="flex gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <span className="text-xl shrink-0">
              🔒
            </span>

            <p>
              Ab Anpfiff wird der Tipp automatisch gesperrt.
            </p>
          </div>

          <div className="flex gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <span className="text-xl shrink-0">
              👀
            </span>

            <p>
              Die Tipps der Mitspieler werden erst ab Anpfiff sichtbar.
            </p>
          </div>

          <div className="flex gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <span className="text-xl shrink-0">
              🏁
            </span>

            <p>
              Für die Wertung zählt das reguläre Endresultat des Spiels.
            </p>
          </div>

          <div className="flex gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <span className="text-xl shrink-0">
              🏆
            </span>

            <p>
              Die gesammelten Punkte aller Spiele werden für die Gesamtrangliste zusammengezählt.
            </p>
          </div>
        </div>
      </section>

      {/* Preise */}
      <section className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black">
              Preise
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Für die besten Tipper der Saison
            </p>
          </div>

          <span className="text-3xl">
            🎁
          </span>
        </div>

        <div className="mt-5 bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-5 text-center">
          <p className="font-bold">
            Preise folgen noch
          </p>

          <p className="text-gray-500 text-sm mt-1">
            Die Belohnungen für die bestplatzierten Spieler werden noch festgelegt.
          </p>
        </div>
      </section>
    </AppShell>
  );
}