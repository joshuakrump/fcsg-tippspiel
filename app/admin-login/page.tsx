import { Suspense } from "react";
import { adminLogin } from "./actions";

type AdminLoginContentProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function AdminLoginContent({
  searchParams,
}: AdminLoginContentProps) {
  const params = await searchParams;

  return (
    <div className="w-full max-w-sm bg-white text-black rounded-2xl p-8">
      <h1 className="text-3xl font-bold mb-2">
        Admin
      </h1>

      <p className="text-gray-500 mb-8">
        FCSG Tippspiel Verwaltung
      </p>

      {params.error === "login" && (
        <p className="bg-red-100 text-red-700 rounded-lg p-3 mb-5">
          Benutzername oder Passwort ist falsch.
        </p>
      )}

      {params.error === "config" && (
        <p className="bg-red-100 text-red-700 rounded-lg p-3 mb-5">
          Admin-Zugang ist noch nicht korrekt konfiguriert.
        </p>
      )}

      <form action={adminLogin} className="space-y-5">
        <div>
          <label
            htmlFor="username"
            className="block font-semibold mb-2"
          >
            Benutzername
          </label>

          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            className="w-full border rounded-lg p-3"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block font-semibold mb-2"
          >
            Passwort
          </label>

          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full border rounded-lg p-3"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-700 text-white rounded-lg p-3 font-bold"
        >
          Admin Login
        </button>
      </form>

      <a
        href="/"
        className="block text-center text-sm text-gray-500 underline mt-6"
      >
        Zurück zum Tippspiel
      </a>
    </div>
  );
}

export default function AdminLoginPage({
  searchParams,
}: AdminLoginContentProps) {
  return (
    <main className="min-h-screen bg-green-950 text-white flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="text-white">
            Admin Login wird geladen...
          </div>
        }
      >
        <AdminLoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}