"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MatchTipsProps = {
  matchId: number;
  kickoff: string;
  isHome: boolean;
  finished: boolean;
};

type VisibleTip = {
  id: number;
  user_id: string;
  fcsg_tip: number;
  opponent_tip: number;
  points: number | null;
  username: string;
};

export function MatchTips({
  matchId,
  kickoff,
  isHome,
  finished,
}: MatchTipsProps) {
  const [tips, setTips] = useState<VisibleTip[]>([]);
  const [loading, setLoading] = useState(true);

  const gameStarted = new Date() >= new Date(kickoff);

  useEffect(() => {
    async function loadTips() {
      if (!gameStarted) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { data: tipData, error: tipError } = await supabase
        .from("tips")
        .select("id, user_id, fcsg_tip, opponent_tip, points")
        .eq("match_id", matchId);

      if (tipError || !tipData) {
        setLoading(false);
        return;
      }

      const userIds = tipData.map((tip) => tip.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, is_hidden")
        .in("id", userIds);

      const visibleTips = tipData.flatMap((tip) => {
        const profile = profiles?.find(
          (profile) => profile.id === tip.user_id
        );

        if (profile?.is_hidden) {
          return [];
        }

        return [
          {
            ...tip,
            username: profile?.username ?? "Spieler",
          },
        ];
      });

      setTips(visibleTips);
      setLoading(false);
    }

    loadTips();
  }, [matchId, kickoff, gameStarted]);

  if (!gameStarted) {
    return (
      <div className="mt-5 border-t pt-4">
        <p className="text-sm text-gray-500">
          🔒 Die Tipps der anderen werden ab Anpfiff sichtbar.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="mt-4 text-sm text-gray-500">
        Tipps werden geladen...
      </p>
    );
  }

  return (
    <div className="mt-5 border-t pt-4">
      <p className="font-bold mb-3">
        Tipps der Mitspieler
      </p>

      {tips.length === 0 ? (
        <p className="text-sm text-gray-500">
          Für dieses Spiel wurden keine Tipps abgegeben.
        </p>
      ) : (
        <div className="space-y-2">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2"
            >
              <span>{tip.username}</span>

              <div className="flex items-center gap-4">
                <span className="font-bold">
                  {isHome
                    ? `${tip.fcsg_tip} : ${tip.opponent_tip}`
                    : `${tip.opponent_tip} : ${tip.fcsg_tip}`}
                </span>

                {finished && (
                  <span className="font-bold text-green-700 min-w-12 text-right">
                    +{tip.points ?? 0}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}