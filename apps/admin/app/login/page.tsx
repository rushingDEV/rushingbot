"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/");
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    setLoading(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.message || "התחברות נכשלה");
      return;
    }

    router.replace(nextPath);
    router.refresh();
  };

  return (
    <main className="login-shell" dir="rtl">
      <section className="login-card">
        <h1>כניסה לממשק הניהול</h1>
        <p>גישה לסוכנויות, שיחות נציגים, הגדרות בוט ודשבורד ביצועים.</p>

        <form onSubmit={onSubmit} className="login-form">
          <label>
            <span>שם משתמש</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="הכנס שם משתמש"
              required
            />
          </label>
          <label>
            <span>סיסמה</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="הכנס סיסמה"
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "מתחבר..." : "כניסה"}
          </button>
        </form>

        {error ? <div className="login-error">{error}</div> : null}
      </section>
    </main>
  );
}
