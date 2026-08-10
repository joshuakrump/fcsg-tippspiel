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

    // Wenn ein Match läuft:
    // jede Minute Serverdaten neu holen
    if (hasLiveMatch) {
      intervalId = setInterval(() => {
        router.refresh();
      }, 60_000);
    }

    // Wenn noch kein Match läuft:
    // beim nächsten Anpfiff einmal refreshen
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