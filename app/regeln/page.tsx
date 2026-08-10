import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";

export default function RegelnPage() {
  return (
    <main className="min-h-screen bg-green-950 text-white p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <AppHeader subtitle="Regeln, Punkte & Preise" />

        <Navigation />

        {/* Punktevergabe */}
        <section className="bg-white text-black rounded-2xl p-6 mb-6 shadow-xl">
          <h2 className="text-2xl font-black mb-4">
            Punktevergabe
          </h2>

          <div className="space-y-3">
            <p>
              <strong>+1 Punkt:</strong> Richtige Tendenz
              {" "}(Sieg, Unentschieden oder Niederlage)
            </p>

            <p>
              <strong>+2 Punkte:</strong> Richtige Tordifferenz
            </p>

            <p>
              <strong>+1 Punkt:</strong> Richtige Anzahl Heimtore
            </p>

            <p>
              <strong>+1 Punkt:</strong> Richtige Anzahl Auswärtstore
            </p>

            <p>
              <strong>+2 Bonuspunkte:</strong> Exaktes Resultat
            </p>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="font-black text-lg text-green-800">
                🏆 Maximal 7 Punkte pro Spiel
              </p>
            </div>
          </div>

          {/* Beispiel */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-5">
            <p className="font-bold mb-2">
              Beispiel
            </p>

            <p className="text-sm font-semibold">
              Endresultat:
            </p>

            <p className="text-sm mb-3">
              FC Zürich 1:2 FC St. Gallen
            </p>

            <div className="space-y-2 text-sm">
              <p>
                Tipp <strong>1:2</strong>
                {" → "}
                <strong>7 Punkte</strong>
              </p>

              <p>
                Tipp <strong>0:1</strong>
                {" → "}
                <strong>3 Punkte</strong>
                {" "}(Tendenz + Tordifferenz)
              </p>

              <p>
                Tipp <strong>1:3</strong>
                {" → "}
                <strong>2 Punkte</strong>
                {" "}(Tendenz + richtige Heimtore)
              </p>

              <p>
                Tipp <strong>1:1</strong>
                {" → "}
                <strong>1 Punkt</strong>
                {" "}(richtige Heimtore)
              </p>
            </div>
          </div>
        </section>

        {/* Tippregeln */}
        <section className="bg-white text-black rounded-2xl p-6 mb-6 shadow-xl">
          <h2 className="text-2xl font-black mb-4">
            Tippregeln
          </h2>

          <div className="space-y-3">
            <p>
              ⚽ Der Tipp kann bis zum offiziellen Anpfiff geändert werden.
            </p>

            <p>
              🔒 Ab Anpfiff wird der Tipp automatisch gesperrt.
            </p>

            <p>
              👀 Die Tipps der Mitspieler werden erst ab Anpfiff sichtbar.
            </p>

            <p>
              🏁 Für die Wertung zählt das reguläre Endresultat des Spiels.
            </p>

            <p>
              🏆 Die gesammelten Punkte aller Spiele werden für die Gesamtrangliste zusammengezählt.
            </p>
          </div>
        </section>

        {/* Preise */}
        <section className="bg-white text-black rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-black mb-4">
            Preise
          </h2>

          <p className="text-gray-600">
            Die Preise für die bestplatzierten Spieler werden noch festgelegt.
          </p>
        </section>
      </div>
    </main>
  );
}