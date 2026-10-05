import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { AdminNavigation } from "@/components/admin-navigation";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { updateTicketUrl } from "./actions";

const FALLBACK_TICKET_URL = "https://www.fcsg.ch/tickets";

function formatKickoff(kickoff: string) {
  return formatInTimeZone(
    new Date(kickoff),
    "Europe/Zurich",
    "dd.MM.yyyy · HH:mm"
  );
}

export default async function AdminTicketsPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin-login");

  const supabase = createAdminClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, opponent, kickoff, is_home, finished, ticket_url, competition_name")
    .eq("is_home", true)
    .eq("finished", false)
    .order("kickoff", { ascending: true });

  if (error) {
    return (
      <main className="max-w-4xl mx-auto p-6 text-white">
        <p className="text-red-300">Heimspiele konnten nicht geladen werden: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 text-white">
      <div className="mb-10">
        <p className="text-green-300 text-sm font-semibold">FCSG TIPPSPIEL</p>
        <h1 className="text-4xl font-bold">Ticket-Links</h1>
        <p className="text-green-100 mt-2">
          Direkte Ticketlinks für kommende Heimspiele verwalten.
        </p>
      </div>

      <AdminNavigation />

      <section className="bg-white text-black rounded-2xl p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Kommende Heimspiele</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Ist kein Direktlink hinterlegt, führt der Ticketbutton automatisch zum offiziellen FCSG-Ticketshop.
          </p>
        </div>

        {!matches || matches.length === 0 ? (
          <p className="text-gray-500">Aktuell sind keine offenen Heimspiele vorhanden.</p>
        ) : (
          <div className="space-y-5">
            {matches.map((match) => (
              <article key={match.id} className="border rounded-2xl p-5 bg-gray-50">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-black text-lg">FC St. Gallen – {match.opponent}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      📅 {formatKickoff(match.kickoff)}
                      {match.competition_name ? ` · ${match.competition_name}` : ""}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      match.ticket_url
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {match.ticket_url ? "Direktlink aktiv" : "Fallback aktiv"}
                  </span>
                </div>

                <form action={updateTicketUrl} className="space-y-3">
                  <input type="hidden" name="matchId" value={match.id} />

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Direkter Ticketlink für dieses Spiel
                    </label>
                    <input
                      type="url"
                      name="ticketUrl"
                      defaultValue={match.ticket_url ?? ""}
                      placeholder="https://…"
                      className="w-full border rounded-lg p-3 bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leer lassen = <span className="font-semibold">{FALLBACK_TICKET_URL}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <AdminSubmitButton
                      idleText="Ticketlink speichern"
                      pendingText="⏳ Wird gespeichert…"
                      className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-bold"
                    />

                    <a
                      href={match.ticket_url || FALLBACK_TICKET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-green-800 underline underline-offset-4"
                    >
                      Link testen ↗
                    </a>
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
