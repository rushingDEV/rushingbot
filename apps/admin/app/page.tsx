"use client";

import { useEffect, useMemo, useState } from "react";

type Location = {
  id: string;
  alias?: string | null;
  publicKey?: string | null;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function Page() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [alias, setAlias] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const masterScript = useMemo(() => {
    if (!apiBase) return "";
    return `<script src=\"${apiBase}/widget.js\"></script>`;
  }, [apiBase]);

  const embedSnippet = (publicKey?: string | null) => {
    if (!apiBase || !publicKey) return "";
    return `<script src=\"${apiBase}/widget.js\" data-location-key=\"${publicKey}\"></script>`;
  };

  useEffect(() => {
    if (!apiBase) return;
    fetch(`${apiBase}/api/locations`)
      .then((res) => res.json())
      .then((data) => setLocations(data.locations ?? []))
      .catch(() => setStatus("שגיאה בטעינת לוקיישנים"));
  }, [apiBase]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    if (!apiBase) {
      setStatus("חסר NEXT_PUBLIC_API_BASE");
      return;
    }
    const res = await fetch(`${apiBase}/api/locations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locationId, alias })
    });

    if (!res.ok) {
      setStatus("שגיאה בשמירת לוקיישן");
      return;
    }
    const data = await res.json();
    setLocations((prev) => [data.location, ...prev.filter((item) => item.id !== data.location.id)]);
    setLocationId("");
    setAlias("");
    setStatus("לוקיישן נשמר");
  };

  return (
    <main dir="rtl">
      <aside className="sidebar">
        <div className="brand">Rushingbot</div>
        <div className="nav-item">
          תיבת שיחות
          <span>12</span>
        </div>
        <div className="card">
          <strong>קוד מאסטר</strong>
          <small>יש לשתול את הסקריפט בכל לוקיישן</small>
          <code className="code">{masterScript || "הגדר NEXT_PUBLIC_API_BASE"}</code>
        </div>
        <div className="card">
          <strong>הוספת לוקיישן</strong>
          <form className="form" onSubmit={onSubmit}>
            <input
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              placeholder="Location ID"
              required
            />
            <input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              placeholder="כינוי לוקיישן"
            />
            <button type="submit">שמירה</button>
          </form>
          {status ? <small>{status}</small> : null}
        </div>
      </aside>

      <section className="panel">
        <h1>לוקיישנים מחוברים</h1>
        {locations.length === 0 ? <small>אין לוקיישנים עדיין</small> : null}
        {locations.map((item) => (
          <div key={item.id} className="card">
            <strong>{item.alias ?? item.id}</strong>
            <small>{item.id}</small>
            <code className="code">{embedSnippet(item.publicKey) || "מפתח לא זמין"}</code>
          </div>
        ))}
      </section>

      <section className="thread">
        <div className="thread-header">
          <strong>CASE-7F3Q · SUMIT Biz</strong>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>
            הבוט עונה · WhatsApp מוכן
          </div>
        </div>
        <div className="thread-body">
          <div className="bubble bot">
            היי! אני כאן לעזור. איך אפשר להמשיך?
          </div>
          <div className="bubble bot">
            אפשר להמשיך ב-WhatsApp עם הקוד CASE-7F3Q.
          </div>
          <div className="bubble agent">
            הבנתי, אמשיך לעזור כאן.
          </div>
        </div>
        <div className="thread-input">
          <input placeholder="כתוב תגובה..." />
          <button>שליחה</button>
        </div>
      </section>
    </main>
  );
}
