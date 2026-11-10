import { Suspense } from "react";
import { connection } from "next/server";
import { Navigation } from "@/components/navigation";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { FCSG_TEAM_ID, getSuperLeagueStandings, type StandingRow } from "@/lib/standings";

function formatUpdate(value: string | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleString("de-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="py-2 pl-2 pr-1 w-8 text-center">#</th>
            <th className="py-2 px-2">Team</th>
            <th className="py-2 px-1 text-center" title="Spiele">Sp</th>
            <th className="py-2 px-1 text-center hidden sm:table-cell" title="Siege">S</th>
            <th className="py-2 px-1 text-center hidden sm:table-cell" title="Unentschieden">U</th>
            <th className="py-2 px-1 text-center hidden sm:table-cell" title="Niederlagen">N</th>
            <th className="py-2 px-1 text-center hidden sm:table-cell">Tore</th>
            <th className="py-2 px-1 text-center" title="Tordifferenz">TD</th>
            <th className="py-2 pl-1 pr-2 text-center">Pkt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isFcsg = row.team.id === FCSG_TEAM_ID;
            return (
              <tr
                key={row.team.id}
                className={`border-b border-gray-100 last:border-0 ${
                  isFcsg ? "bg-green-500/20 font-black" : ""
                }`}
              >
                <td
                  className={`py-2.5 pl-2 pr-1 text-center font-bold ${
                    isFcsg ? "border-l-4 border-green-600" : "border-l-4 border-transparent"
                  }`}
                >
                  {row.rank}
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {row.team.logo && (
                      <img src={row.team.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                    )}
                    <span className="truncate">{row.team.name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-1 text-center">{row.all.played}</td>
                <td className="py-2.5 px-1 text-center hidden sm:table-cell">{row.all.win}</td>
                <td className="py-2.5 px-1 text-center hidden sm:table-cell">{row.all.draw}</td>
                <td className="py-2.5 px-1 text-center hidden sm:table-cell">{row.all.lose}</td>
                <td className="py-2.5 px-1 text-center hidden sm:table-cell whitespace-nowrap">
                  {row.all.goals.for}:{row.all.goals.against}
                </td>
                <td className="py-2.5 px-1 text-center">
                  {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                </td>
                <td className="py-2.5 pl-1 pr-2 text-center font-black">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function TabelleContent() {
  await connection();
  const standings = await getSuperLeagueStandings();
  const lastUpdate = standings.ok ? formatUpdate(standings.groups[0]?.[0]?.update) : null;

  return !standings.ok ? (
        <div className="bg-white text-black rounded-3xl p-6 shadow-2xl">
          <p className="font-semibold">Die Tabelle konnte gerade nicht geladen werden.</p>
          <p className="text-sm text-gray-500 mt-1">Bitte versuche es später noch einmal.</p>
        </div>
  ) : (
        <div className="space-y-6">
          {standings.groups.map((rows, index) => (
            <section key={index} className="bg-white text-black rounded-3xl p-4 sm:p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4 px-1">
                {standings.leagueLogo && (
                  <img src={standings.leagueLogo} alt="" className="w-8 h-8 object-contain" />
                )}
                <div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    {standings.groups.length > 1 ? rows[0]?.group ?? standings.leagueName : standings.leagueName}
                  </h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Saison {standings.season}/{String(standings.season + 1).slice(-2)}
                    {lastUpdate && ` · Stand ${lastUpdate}`}
                  </p>
                </div>
              </div>
              <StandingsTable rows={rows} />
            </section>
          ))}
        </div>
  );
}

export default function TabellePage() {
  return (
    <AppShell>
      <AppHeader subtitle="Tabelle der Super League" />
      <Navigation />
      <Suspense fallback={<p className="text-green-200">Tabelle wird geladen...</p>}>
        <TabelleContent />
      </Suspense>
    </AppShell>
  );
}
