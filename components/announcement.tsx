// Hinweis zum neuen Punktesystem und zur neuen Tabelle – wird bis und mit 17.11.2026 angezeigt.
const SHOW_UNTIL = new Date("2026-11-17T23:59:59+01:00");

export function Announcement() {
  if (new Date() > SHOW_UNTIL) return null;

  return (
    <section className="mb-8 bg-white text-black rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-green-400">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">📣</span>
        <div>
          <h2 className="text-xl sm:text-2xl font-black">Neu im Tippspiel</h2>
          <p className="text-gray-600 text-sm mt-1">
            Ein neues Punktesystem und die Tabelle der Super League.
          </p>
        </div>
      </div>

      <h3 className="font-black text-lg mt-5">⚽ Neues Punktesystem</h3>
      <p className="text-sm text-gray-600 mt-1">Der richtige Sieger zählt neu viel mehr. Die Regeln sind einfacher geworden:</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
          <p className="text-2xl font-black text-green-800">3</p>
          <p className="text-xs text-gray-600">Richtiger Sieger</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
          <p className="text-2xl font-black text-green-800">+1</p>
          <p className="text-xs text-gray-600">Richtige Tordifferenz</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
          <p className="text-2xl font-black text-green-800">+2</p>
          <p className="text-xs text-gray-600">Exaktes Resultat</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
          <p className="text-2xl font-black text-gray-700">0</p>
          <p className="text-xs text-gray-600">Falscher Sieger</p>
        </div>
      </div>

      <p className="text-sm text-gray-700 mt-4">
        Maximal gibt es <strong>6 Punkte</strong> pro Spiel. Alle bisherigen Spiele wurden nach den neuen Regeln
        neu berechnet – die Rangliste ist bereits aktualisiert.
      </p>

      <a
        href="/regeln"
        className="inline-flex items-center mt-4 bg-green-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 active:scale-95 transition"
      >
        Zu den Regeln <span className="ml-2">→</span>
      </a>

      <div className="border-t border-gray-200 mt-6 pt-5">
        <h3 className="font-black text-lg">📊 Neu: Tabelle der Super League</h3>
        <p className="text-sm text-gray-700 mt-1">
          Unter dem neuen Menüpunkt <strong>Tabelle</strong> siehst du jederzeit, wie es in der Liga aussieht.
          Der FC St. Gallen ist grün hervorgehoben.
        </p>
        <a
          href="/tabelle"
          className="inline-flex items-center mt-4 bg-green-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 active:scale-95 transition"
        >
          Zur Tabelle <span className="ml-2">→</span>
        </a>
      </div>
    </section>
  );
}
