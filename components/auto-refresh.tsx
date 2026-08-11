"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshProps = {
  nextKickoff: string | null;
  hasLiveMatch?: boolean;
};

export function AutoRefresh({
  nextKickoff,
  hasLiveMatch = false,
}: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let syncInProgress = false;

    const syncAndRefresh = async () => {
      if (syncInProgress) {
        return;
      }

      syncInProgress = true;

      try {
        await fetch("/api/live-sync", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
      } catch (error) {
        console.error("Live-Sync konnte nicht ausgeführt werden:", error);
      } finally {
        router.refresh();
        syncInProgress = false;
      }
    };

    // Wenn ein Match läuft:
    // sofort synchronisieren und danach jede Minute erneut versuchen.
    // Supabase sorgt serverseitig dafür, dass insgesamt höchstens
    // ein API-Football-Sync pro Minute ausgeführt wird.
    if (hasLiveMatch) {
      void syncAndRefresh();

      intervalId = setInterval(() => {
        void syncAndRefresh();
      }, 60_000);
    }

    // Wenn noch kein Match läuft:
    // beim nächsten Anpfiff einmal refreshen. Danach erkennt die Seite
    // das Live-Match und startet den obigen Sync-Mechanismus.
    if (!hasLiveMatch && nextKickoff) {
      const kickoffTime = new Date(nextKickoff).getTime();
      const now = Date.now();
      const delay = kickoffTime - now;

      if (delay > 0) {
        timeoutId = setTimeout(() => {
          router.refresh();
        }, delay + 1000);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [nextKickoff, hasLiveMatch, router]);

  return null;
}
