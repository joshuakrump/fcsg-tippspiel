"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0)),
  );
}

export function PushNotifications() {
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);

    async function checkSubscription() {
      try {
        if (
          !("serviceWorker" in navigator) ||
          !("PushManager" in window) ||
          !("Notification" in window)
        ) {
          setSupported(false);
          return;
        }

        setSupported(true);

        const registration =
          await navigator.serviceWorker.register("/sw.js");

        const subscription =
          await registration.pushManager.getSubscription();

        setEnabled(Boolean(subscription));
      } catch (error) {
        console.error("Push-Setup konnte nicht geprüft werden:", error);
        setSupported(false);
      }
    }

    checkSubscription();
  }, []);

  async function enableNotifications() {
    try {
      setLoading(true);
      setMessage("");

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setMessage("Benachrichtigungen wurden nicht erlaubt.");
        return;
      }

      const registration =
        await navigator.serviceWorker.register("/sw.js");

      const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        throw new Error("VAPID Public Key fehlt.");
      }

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(publicKey),
        });
      }

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Du bist nicht eingeloggt.");
      }

      const json = subscription.toJSON();

      if (
        !json.endpoint ||
        !json.keys?.p256dh ||
        !json.keys?.auth
      ) {
        throw new Error(
          "Push-Subscription ist unvollständig.",
        );
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: user.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
          {
            onConflict: "endpoint",
          },
        );

      if (error) {
        throw error;
      }

      setEnabled(true);
      setMessage(
        "Live-Benachrichtigungen sind aktiviert.",
      );
    } catch (error) {
      console.error("Push-Aktivierung fehlgeschlagen:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Benachrichtigungen konnten nicht aktiviert werden.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || !supported) {
    return null;
  }

  return (
    <div className="rounded-xl border border-green-800/70 bg-green-900/40 p-4 backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">
            🔔 Live-Benachrichtigungen
          </p>

          <p className="mt-1 text-sm text-green-200">
            Tore und wichtige Spielereignisse direkt aufs Handy.
          </p>
        </div>

        <button
          type="button"
          onClick={enableNotifications}
          disabled={loading || enabled}
          className="
            rounded-lg
            bg-green-600
            px-4 py-2
            font-semibold
            text-white
            transition
            hover:bg-green-500
            disabled:cursor-default
            disabled:opacity-60
          "
        >
          {loading
            ? "Wird aktiviert..."
            : enabled
              ? "✓ Aktiviert"
              : "Aktivieren"}
        </button>
      </div>

      {message && (
        <p className="mt-3 text-sm text-green-200">
          {message}
        </p>
      )}
    </div>
  );
}