import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";

const pointRules = [
  ["Richtige Tendenz", "Sieg, Unentschieden oder Niederlage korrekt", "+1"],
  ["Richtige Tordifferenz", "Die Differenz zwischen Heim- und Auswärtstoren stimmt", "+2"],
  ["Richtige Heimtore", "Anzahl Tore des Heimteams stimmt", "+1"],
  ["Richtige Auswärtstore", "Anzahl Tore des Auswärtsteams stimmt", "+1"],
];

const tipRules = [
  ["⚽", "Der Tipp kann bis zum offiziellen Anpfiff geändert werden."],
  ["🔒", "Ab Anpfiff wird der Tipp automatisch gesperrt."],
  ["👀", "Die Tipps der Mitspieler werden erst ab Anpfiff sichtbar."],
  ["🏁", "Für die Wertung zählt das reguläre Endresultat des Spiels."],
  ["🏆", "Die gesammelten Punkte aller Spiele werden für die Gesamtrangliste zusammengezählt."],
];

export default function RegelnPage() {
  return (
    <AppShell>
      <AppHeader subtitle="Regeln, Punkte & Preise" />
      <Navigation />

      <section className="bg-white text-black rounded-3xl p-5 sm:p-7 mb-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-black">Punktevergabe</h2>
          <p className="text-gray-500 text-sm mt-1">So sammelst du Punkte pro Spiel</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {pointRules.map(([title, text, points]) => (
            <div key={title} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{title}</span>
                <span className="bg-green-100 text-green-800 font-black px-3 py-1 rounded-full">{points}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{text}</p>
            </div>
          ))}

          <div className="sm:col-span-2 bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-black">Exaktes Resultat</span>
                <p className="text-sm text-green-800 mt-1">Resultat vollständig richtig getippt</p>
              </div>
              <span className="bg-green-700 text-white font-black px-3 py-1 rounded-full">+2 Bonus</span>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-green-800 text-white rounded-2xl p-4 sm:p-5">
          <p className="text-sm text-green-200 font-semibold">Maximum pro Spiel</p>
          <p className="text-xl sm:text-2xl font-black">7 Punkte</p>
        </div>

        <div className="mt-6">
          <h3 className="font-black text-lg mb-3">Beispiel</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">Endresultat</p>
            <p className="font-black text-lg mt-1 mb-4">FC Zürich 1 : 2 FC St. Gallen</p>
            <div className="space-y-2">
              {[["1 : 2", "7 Pkt."], ["0 : 1", "3 Pkt."], ["1 : 3", "2 Pkt."], ["1 : 1", "1 Pkt."]].map(([tip, points]) => (
                <div key={tip} className="flex items-center justify-between bg-white rounded-xl px-3 py-3 border border-gray-100">
                  <span>Tipp <strong>{tip}</strong></span>
                  <span className="font-black text-green-800">{points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white text-black rounded-3xl p-5 sm:p-7 mb-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-2xl sm:text-3xl font-black">Tippregeln</h2>
          <p className="text-gray-500 text-sm mt-1">Das Wichtigste rund um deine Tippabgabe</p>
        </div>
        <div className="space-y-3">
          {tipRules.map(([icon, text]) => (
            <div key={text} className="flex gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <span className="text-xl shrink-0">{icon}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white text-black rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black">Preis</h2>
          <p className="text-gray-500 text-sm mt-1">Der Sieger der Saison gewinnt</p>
        </div>
        <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="font-black text-lg">Nur Platz 1 erhält einen Preis</p>
          <p className="text-gray-700 mt-2">
            Der Gewinner bezahlt in der nächsten Saison keine Getränke im Stadion und erhält optional ein Trikot der neuen Saison nach Wahl.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
