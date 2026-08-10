export const instant = false;

export default async function ApiTestPage() {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>API-Test</h1>
        <p>❌ API_FOOTBALL_KEY wurde nicht gefunden.</p>
      </main>
    );
  }

  try {
    const response = await fetch(
      "https://v3.football.api-sports.io/fixtures?team=1011&league=207&season=2026&from=2026-08-01&to=2026-08-31",
      {
        headers: {
          "x-apisports-key": apiKey,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return (
      <main style={{ padding: "30px" }}>
        <h1>FC St. Gallen API-Test</h1>

        <p>
          HTTP Status: <strong>{response.status}</strong>
        </p>

        <pre
          style={{
            background: "#f3f4f6",
            color: "#111",
            padding: "20px",
            borderRadius: "10px",
            marginTop: "20px",
            overflow: "auto",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </main>
    );
  } catch (error) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>FC St. Gallen API-Test</h1>

        <p>❌ Verbindung fehlgeschlagen.</p>

        <pre>{String(error)}</pre>
      </main>
    );
  }
}