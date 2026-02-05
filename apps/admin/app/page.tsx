const conversations = [
  {
    id: "CASE-7F3Q",
    name: "סמיט ביז",
    status: "bot",
    summary: "בקשה להמשך ב-WhatsApp"
  },
  {
    id: "CASE-A9K2",
    name: "חיבור מסופי בדיקות",
    status: "human",
    summary: "נציג משתלט על השיחה"
  },
  {
    id: "CASE-J2P1",
    name: "שחרור חשבון",
    status: "bot",
    summary: "הבוט מבקש פרטים נוספים"
  }
];

export default function Page() {
  return (
    <main dir="rtl">
      <aside className="sidebar">
        <div className="brand">Rushingbot</div>
        <div className="nav-item">
          תיבת שיחות
          <span>12</span>
        </div>
        <div className="card">
          <strong>מצב בוט</strong>
          <small>פעיל ב-7 לוקיישנים</small>
        </div>
        <div className="card">
          <strong>העברות לנציג</strong>
          <small>3 פניות בטיפול</small>
        </div>
      </aside>

      <section className="panel">
        <h1>שיחות אחרונות</h1>
        {conversations.map((item) => (
          <div key={item.id} className="card">
            <strong>{item.name}</strong>
            <small>{item.id} · {item.summary}</small>
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
