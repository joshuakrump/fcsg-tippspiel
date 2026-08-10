"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshProps = {
  nextKickoff?: string | null;
};

export function AutoRefresh({
  nextKickoff,
}: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    // Alle 30 Sekunden Daten neu laden.
    // So werden z.B. eingetragene Endresultate automatisch sichtbar.
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);

    // Zusätzlich möglichst genau beim nächsten Anpfiff aktualisieren.
    let kickoffTimer: ReturnType<typeof setTimeout> | undefined;

    if (nextKickoff) {
      const millisecondsUntilKickoff =
        new Date(nextKickoff).getTime() - Date.now();

      if (millisecondsUntilKickoff > 0) {
        kickoffTimer = setTimeout(() => {
          router.refresh();
        }, millisecondsUntilKickoff + 1000);
      }
    }

    return () => {
      clearInterval(interval);

      if (kickoffTimer) {
        clearTimeout(kickoffTimer);
      }
    };
  }, [nextKickoff, router]);

  return null;
}