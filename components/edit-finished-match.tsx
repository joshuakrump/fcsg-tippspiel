"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";

type EditFinishedMatchProps = {
  match: {
    id: number;
    opponent: string;
    kickoff: string;
    is_home: boolean;
    fcsg_score: number | null;
    opponent_score: number | null;
  };

  teams: {
    id: number;
    name: string;
    short_name: string;
    logo_path: string | null;
  }[];

  updateAction: (
    formData: FormData
  ) => void | Promise<void>;
};

export function EditFinishedMatch({
  match,
  teams,
  updateAction,
}: EditFinishedMatchProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="bg-blue-700 text-white px-4 py-2 rounded-lg font-bold"
      >
        {open ? "Bearbeiten schliessen" : "Bearbeiten"}
      </button>

      {open && (
        <form
          action={updateAction}
          className="space-y-4 border rounded-xl p-4 mt-4"
        >
          <input
            type="hidden"
            name="matchId"
            value={match.id}
          />

          {/* Gegner */}
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
              {teams.map((team) => (
                <option
                  key={team.id}
                  value={team.name}
                >
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Anpfiff */}
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

          {/* Spielort */}
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

          {/* Resultat */}
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">
                FCSG Tore
              </label>

              <input
                name="fcsgScore"
                type="number"
                min="0"
                defaultValue={
                  match.fcsg_score ?? 0
                }
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
                defaultValue={
                  match.opponent_score ?? 0
                }
                required
                className="w-24 border rounded-lg p-2"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold"
          >
            Änderungen speichern
          </button>
        </form>
      )}
    </div>
  );
}