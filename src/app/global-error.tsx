"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "bold" }}>500</h1>
          <p style={{ marginTop: "1rem", fontSize: "1.25rem", color: "#666" }}>Something went wrong</p>
          <button
            onClick={reset}
            style={{ marginTop: "1.5rem", padding: "0.5rem 1.5rem", border: "1px solid #ccc", borderRadius: "0.375rem", cursor: "pointer", background: "#000", color: "#fff" }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
