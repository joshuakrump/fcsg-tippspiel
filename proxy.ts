import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Admin-Bereich benutzt unseren separaten Admin-Login
  // und soll NICHT vom normalen Supabase-Spielerlogin abgefangen werden.
if (
  pathname === "/admin-login" ||
  pathname === "/admin" ||
  pathname.startsWith("/admin/") ||
  pathname === "/api/live-sync"
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