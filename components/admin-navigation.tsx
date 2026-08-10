import Link from "next/link";

export function AdminNavigation() {
  return (
    <nav className="grid grid-cols-2 gap-3 mb-8">
      <Link
        href="/admin"
        className="bg-white text-green-900 text-center px-4 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
      >
        Aktiv & geplant
      </Link>

      <Link
        href="/admin/abgeschlossen"
        className="bg-white text-green-900 text-center px-4 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
      >
        Abgeschlossen
      </Link>
    </nav>
  );
}