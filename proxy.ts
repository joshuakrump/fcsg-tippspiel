import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Der Live-Sync wird ausschliesslich vom externen Scheduler aufgerufen.
  // Ein normal eingeloggter Spieler darf den Endpoint nicht auslösen.
  if (pathname === "/api/live-sync") {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.next();
  }

  // Admin-Bereich benutzt unseren separaten Admin-Login
  // und soll NICHT vom normalen Supabase-Spielerlogin abgefangen werden.
  // Der Service Worker muss ebenfalls ohne aktive Spielersession erreichbar bleiben.
  if (
    pathname === "/admin-login" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  // Alle anderen Seiten verwenden weiterhin
  // die normale Supabase-Session.
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
