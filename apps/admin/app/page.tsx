"use client";

import { useEffect, useMemo, useState } from "react";

type Location = {
  id: string;
  alias?: string | null;
  publicKey?: string | null;
  botName?: string;
  systemPrompt?: string | null;
  openaiModel?: string;
  openaiTemperature?: number;
  supportEmail?: string | null;
  supportWhatsapp?: string | null;
  botEnabled?: boolean;
  handoffMode?: string;
  themeColor?: string;
  demoEnabled?: boolean;
  embedCode?: string | null;
  ghlApiConfigured?: boolean;
};

type Conversation = {
  id: string;
  title?: string | null;
  status: string;
  channel?: string | null;
  source?: string | null;
  updatedAt: string;
  messages?: Array<{ text?: string | null }>;
};

type ChatMessage = {
  id: string;
  authorType: string;
  text?: string | null;
  senderName?: string | null;
  createdAt: string;
};

type Summary = {
  locations: number;
  totalConversations: number;
  openConversations: number;
  handoffConversations: number;
  closedConversations: number;
  totalMessages: number;
  last24hMessages: number;
};

type OpenAiIntegration = {
  configured: boolean;
  connected: boolean;
  models: string[];
  detail?: string;
};

type GhlIntegration = {
  configured: boolean;
  connected: boolean;
  detail?: string;
};

type LocationIntegrations = {
  openai: OpenAiIntegration;
  ghl: GhlIntegration;
  selectedModel?: string;
  temperature?: number;
};

type Notice = {
  kind: "ok" | "error" | "info";
  text: string;
};

type TabId = "studio" | "sandbox" | "inbox" | "analytics";
type FilterId = "all" | "open" | "handoff" | "closed";

const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";

const defaultSettings = {
  botName: "Rushingbot",
  systemPrompt: "",
  openaiModel: "gpt-4.1-mini",
  openaiTemperature: 0.2,
  supportEmail: "",
  supportWhatsapp: "",
  handoffMode: "on_human_reply",
  themeColor: "#2455ff",
  botEnabled: true,
  demoEnabled: true,
  ghlApiKey: ""
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "studio", label: "סטודיו בוט" },
  { id: "sandbox", label: "אזור התנסות" },
  { id: "inbox", label: "אינבוקס נציגים" },
  { id: "analytics", label: "ביצועים" }
];

const filters: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "הכל" },
  { id: "open", label: "פתוחות" },
  { id: "handoff", label: "אצל נציג" },
  { id: "closed", label: "סגורות" }
];

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusClass(status: string) {
  if (status === "closed") return "is-closed";
  if (status === "handoff") return "is-handoff";
  return "is-open";
}

export default function Page() {
  const [tab, setTab] = useState<TabId>("studio");
  const [filter, setFilter] = useState<FilterId>("all");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedLocationStats, setSelectedLocationStats] = useState<{
    openConversations: number;
    handoffConversations: number;
  } | null>(null);

  const [addLocationId, setAddLocationId] = useState("");
  const [addAlias, setAddAlias] = useState("");
  const [addGhlApiKey, setAddGhlApiKey] = useState("");

  const [settings, setSettings] = useState(defaultSettings);
  const [integrations, setIntegrations] = useState<LocationIntegrations | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [agentReply, setAgentReply] = useState("");

  const [demoConversationId, setDemoConversationId] = useState<string | null>(null);
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([]);
  const [demoInput, setDemoInput] = useState("");

  const selectedLocation = useMemo(
    () => locations.find((item) => item.id === selectedLocationId) || null,
    [locations, selectedLocationId]
  );

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    if (filter === "all") return conversations;
    return conversations.filter((item) => item.status === filter);
  }, [conversations, filter]);

  const openAiModels = useMemo(() => {
    const models = integrations?.openai.models || ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"];
    if (models.includes(settings.openaiModel)) return models;
    return [settings.openaiModel, ...models];
  }, [integrations?.openai.models, settings.openaiModel]);

  const widgetPreviewDoc = useMemo(() => {
    if (!selectedLocation?.publicKey || !apiBase) return "";
    return `<!doctype html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><style>body{margin:0;height:100vh;background:#f2f6ff;font-family:Arial,sans-serif}</style></head><body><script src=\"${apiBase}/widget.js\" data-location-key=\"${selectedLocation.publicKey}\"></script></body></html>`;
  }, [selectedLocation, apiBase]);

  const setInfo = (kind: Notice["kind"], text: string) => {
    setNotice({ kind, text });
  };

  const loadSummary = async () => {
    if (!apiBase) return;
    const res = await fetch(`${apiBase}/api/dashboard/summary`);
    const payload = await res.json();
    setSummary(payload.summary || null);
  };

  const loadLocations = async () => {
    if (!apiBase) return;
    const res = await fetch(`${apiBase}/api/locations`);
    const payload = await res.json();
    const nextLocations: Location[] = payload.locations || [];
    setLocations(nextLocations);

    if (!selectedLocationId && nextLocations.length > 0) {
      setSelectedLocationId(nextLocations[0].id);
    }
  };

  const loadSelectedLocation = async (locationId: string) => {
    if (!apiBase || !locationId) return;

    const [locationRes, convRes, integrationRes] = await Promise.all([
      fetch(`${apiBase}/api/locations/${locationId}`),
      fetch(`${apiBase}/api/locations/${locationId}/conversations`),
      fetch(`${apiBase}/api/locations/${locationId}/integrations`)
    ]);

    if (!locationRes.ok) {
      throw new Error("Failed loading location");
    }

    const locationPayload = await locationRes.json();
    const convPayload = await convRes.json().catch(() => ({ conversations: [] }));
    const integrationPayload = await integrationRes.json().catch(() => ({}));

    const loadedLocation = locationPayload.location as Location;
    if (loadedLocation) {
      setLocations((prev) =>
        prev.map((item) => (item.id === loadedLocation.id ? { ...item, ...loadedLocation } : item))
      );

      setSettings((prev) => ({
        ...prev,
        botName: loadedLocation.botName || "Rushingbot",
        systemPrompt: loadedLocation.systemPrompt || "",
        openaiModel: loadedLocation.openaiModel || integrationPayload.selectedModel || "gpt-4.1-mini",
        openaiTemperature:
          typeof loadedLocation.openaiTemperature === "number"
            ? loadedLocation.openaiTemperature
            : typeof integrationPayload.temperature === "number"
            ? integrationPayload.temperature
            : 0.2,
        supportEmail: loadedLocation.supportEmail || "",
        supportWhatsapp: loadedLocation.supportWhatsapp || "",
        handoffMode: loadedLocation.handoffMode || "on_human_reply",
        themeColor: loadedLocation.themeColor || "#2455ff",
        botEnabled: loadedLocation.botEnabled ?? true,
        demoEnabled: loadedLocation.demoEnabled ?? true,
        ghlApiKey: ""
      }));
    }

    const nextConversations: Conversation[] = convPayload.conversations || [];
    setConversations(nextConversations);
    setIntegrations(integrationPayload as LocationIntegrations);
    setSelectedLocationStats(locationPayload.stats || null);

    if (nextConversations.length === 0) {
      setSelectedConversationId("");
      setConversationMessages([]);
      return;
    }

    setSelectedConversationId((current) =>
      current && nextConversations.some((item) => item.id === current)
        ? current
        : nextConversations[0].id
    );
  };

  const loadConversation = async (conversationId: string) => {
    if (!apiBase || !conversationId) return;
    const res = await fetch(`${apiBase}/api/conversations/${conversationId}/messages`);
    if (!res.ok) throw new Error("Failed loading conversation");
    const payload = await res.json();
    setConversationMessages(payload.messages || []);
  };

  const refreshWorkspace = async () => {
    if (!selectedLocationId) return;
    setLoading(true);
    try {
      await Promise.all([loadSummary(), loadLocations(), loadSelectedLocation(selectedLocationId)]);
      setInfo("ok", "הנתונים עודכנו");
    } catch {
      setInfo("error", "רענון נכשל");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!apiBase) {
      setInfo("error", "חסר NEXT_PUBLIC_API_BASE ב-Admin");
      return;
    }

    setLoading(true);
    Promise.all([loadSummary(), loadLocations()])
      .catch(() => setInfo("error", "שגיאה בטעינת נתונים"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedLocationId) return;
    setLoading(true);
    loadSelectedLocation(selectedLocationId)
      .catch(() => setInfo("error", "שגיאה בטעינת הסוכנות"))
      .finally(() => setLoading(false));
  }, [selectedLocationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    loadConversation(selectedConversationId).catch(() => setInfo("error", "שגיאה בטעינת השיחה"));
  }, [selectedConversationId]);

  const addAgency = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiBase || !addLocationId.trim()) return;

    const newLocationId = addLocationId.trim();

    const res = await fetch(`${apiBase}/api/locations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locationId: newLocationId,
        alias: addAlias.trim() || undefined,
        ghlApiKey: addGhlApiKey.trim() || undefined
      })
    });

    if (!res.ok) {
      setInfo("error", "יצירת סוכנות נכשלה");
      return;
    }

    setAddLocationId("");
    setAddAlias("");
    setAddGhlApiKey("");
    setInfo("ok", "סוכנות נוספה בהצלחה");

    await Promise.all([loadSummary(), loadLocations()]);
    setSelectedLocationId(newLocationId);
  };

  const saveSettings = async () => {
    if (!apiBase || !selectedLocationId) return;

    const payload = {
      ...settings,
      openaiTemperature: Number(settings.openaiTemperature)
    };

    const res = await fetch(`${apiBase}/api/locations/${selectedLocationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setInfo("error", "שמירת הגדרות נכשלה");
      return;
    }

    setSettings((prev) => ({ ...prev, ghlApiKey: "" }));
    setInfo("ok", "הגדרות נשמרו");
    await Promise.all([loadSummary(), loadSelectedLocation(selectedLocationId)]);
  };

  const sendDemoMessage = async (text?: string) => {
    if (!apiBase || !selectedLocationId) return;

    const message = (text || demoInput).trim();
    if (!message) return;

    setDemoInput("");

    const res = await fetch(`${apiBase}/api/locations/${selectedLocationId}/demo/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: demoConversationId || undefined,
        text: message
      })
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setInfo("error", payload.message || "שליחת הודעת דמו נכשלה");
      return;
    }

    const payload = await res.json();
    setDemoConversationId(payload.conversationId || null);
    setDemoMessages(payload.messages || []);

    await loadSummary();
  };

  const resetDemo = () => {
    setDemoConversationId(null);
    setDemoMessages([]);
    setInfo("info", "נפתחה הדמיה חדשה");
  };

  const sendAgentReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiBase || !selectedConversationId || !agentReply.trim()) return;

    const res = await fetch(`${apiBase}/api/conversations/${selectedConversationId}/agent-message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: agentReply,
        senderName: "Agent Console"
      })
    });

    if (!res.ok) {
      setInfo("error", "שליחת תגובת נציג נכשלה");
      return;
    }

    const payload = await res.json();
    setConversationMessages(payload.messages || []);
    setAgentReply("");

    await Promise.all([loadSummary(), loadSelectedLocation(selectedLocationId)]);
    setInfo("ok", "הודעת נציג נשלחה");
  };

  const closeConversation = async () => {
    if (!apiBase || !selectedConversationId) return;

    const res = await fetch(`${apiBase}/api/conversations/${selectedConversationId}/close`, {
      method: "POST"
    });

    if (!res.ok) {
      setInfo("error", "סגירת השיחה נכשלה");
      return;
    }

    setInfo("ok", "השיחה נסגרה");
    setSelectedConversationId("");
    setConversationMessages([]);
    await Promise.all([loadSummary(), loadSelectedLocation(selectedLocationId)]);
  };

  const copyToClipboard = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setInfo("ok", `${label} הועתק`);
    } catch {
      setInfo("error", `לא ניתן להעתיק ${label}`);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <main dir="rtl" className="console-shell">
      <aside className="agency-rail panel-surface">
        <div className="rail-head">
          <div>
            <h1>Rushingbot Admin</h1>
            <p>ניהול סוכנויות, מודלי AI ושיחות שירות</p>
          </div>
          <button type="button" className="btn btn-soft" onClick={logout}>
            התנתקות
          </button>
        </div>

        <form className="create-form" onSubmit={addAgency}>
          <h3>הוספת סוכנות</h3>
          <input
            value={addLocationId}
            onChange={(event) => setAddLocationId(event.target.value)}
            placeholder="Location ID"
            required
          />
          <input
            value={addAlias}
            onChange={(event) => setAddAlias(event.target.value)}
            placeholder="כינוי פנימי"
          />
          <input
            type="password"
            value={addGhlApiKey}
            onChange={(event) => setAddGhlApiKey(event.target.value)}
            placeholder="GHL API Key (לא חובה כרגע)"
          />
          <button type="submit" className="btn btn-primary">
            צור סוכנות
          </button>
        </form>

        <div className="agency-list">
          {locations.length === 0 ? (
            <div className="empty-card">אין סוכנויות עדיין</div>
          ) : (
            locations.map((location) => (
              <button
                key={location.id}
                type="button"
                className={`agency-item ${selectedLocationId === location.id ? "active" : ""}`}
                onClick={() => setSelectedLocationId(location.id)}
              >
                <div className="agency-title-row">
                  <strong>{location.alias || "ללא כינוי"}</strong>
                  <span className={`pill ${location.ghlApiConfigured ? "is-open" : "is-closed"}`}>
                    {location.ghlApiConfigured ? "GHL" : "ללא GHL"}
                  </span>
                </div>
                <small>{location.id}</small>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="workspace panel-surface">
        <header className="workspace-head">
          <div>
            <h2>{selectedLocation?.alias || "בחר סוכנות"}</h2>
            <p>{selectedLocation?.id || "אין סוכנות פעילה"}</p>
          </div>

          <div className="head-actions">
            <button type="button" className="btn btn-outline" onClick={refreshWorkspace}>
              רענון מלא
            </button>
            <div className="mini-kpis">
              <div>
                <strong>{summary?.openConversations || 0}</strong>
                <span>פתוחות</span>
              </div>
              <div>
                <strong>{summary?.handoffConversations || 0}</strong>
                <span>אצל נציג</span>
              </div>
              <div>
                <strong>{summary?.last24hMessages || 0}</strong>
                <span>הודעות 24h</span>
              </div>
            </div>
          </div>
        </header>

        <nav className="tab-row" aria-label="Main tabs">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tab ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {notice ? <div className={`notice ${notice.kind}`}>{notice.text}</div> : null}
        {loading ? <div className="notice info">טוען נתונים...</div> : null}

        {!selectedLocation ? (
          <section className="content-grid">
            <article className="card-panel empty-card large">
              בחר סוכנות מהצד או צור סוכנות חדשה כדי להתחיל ניהול מלא.
            </article>
          </section>
        ) : null}

        {selectedLocation && tab === "studio" ? (
          <section className="content-grid">
            <article className="card-panel">
              <div className="card-head">
                <h3>סטטוס חיבורים</h3>
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => loadSelectedLocation(selectedLocation.id)}
                >
                  בדיקה מחדש
                </button>
              </div>

              <div className="integration-grid">
                <div className="integration-card">
                  <span>OpenAI</span>
                  <strong className={integrations?.openai.connected ? "tone-ok" : "tone-bad"}>
                    {integrations?.openai.connected ? "מחובר" : "לא מחובר"}
                  </strong>
                  <small>{integrations?.openai.detail || "גישה למודלים זמינה"}</small>
                </div>

                <div className="integration-card">
                  <span>GHL</span>
                  <strong className={integrations?.ghl.connected ? "tone-ok" : "tone-bad"}>
                    {integrations?.ghl.connected ? "מחובר" : "לא מחובר"}
                  </strong>
                  <small>{integrations?.ghl.detail || "החיבור תקין"}</small>
                </div>
              </div>
            </article>

            <article className="card-panel">
              <h3>הגדרות בוט</h3>
              <div className="form-grid two">
                <label>
                  <span>שם בוט</span>
                  <input
                    value={settings.botName}
                    onChange={(event) => setSettings((prev) => ({ ...prev, botName: event.target.value }))}
                  />
                </label>

                <label>
                  <span>צבע מותג</span>
                  <input
                    value={settings.themeColor}
                    onChange={(event) => setSettings((prev) => ({ ...prev, themeColor: event.target.value }))}
                  />
                </label>

                <label>
                  <span>מודל OpenAI</span>
                  <select
                    value={settings.openaiModel}
                    onChange={(event) => setSettings((prev) => ({ ...prev, openaiModel: event.target.value }))}
                  >
                    {openAiModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>טמפרטורה ({Number(settings.openaiTemperature).toFixed(1)})</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={settings.openaiTemperature}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, openaiTemperature: Number(event.target.value) }))
                    }
                  />
                </label>

                <label>
                  <span>מצב Handoff</span>
                  <select
                    value={settings.handoffMode}
                    onChange={(event) => setSettings((prev) => ({ ...prev, handoffMode: event.target.value }))}
                  >
                    <option value="on_human_reply">עצירה אוטומטית כשנציג מגיב</option>
                    <option value="manual_only">עצירה ידנית בלבד</option>
                  </select>
                </label>

                <label>
                  <span>GHL API Key</span>
                  <input
                    type="password"
                    placeholder={selectedLocation.ghlApiConfigured ? "קיים מפתח. הדבק חדש לעדכון" : "הזן מפתח"}
                    value={settings.ghlApiKey}
                    onChange={(event) => setSettings((prev) => ({ ...prev, ghlApiKey: event.target.value }))}
                  />
                </label>

                <label>
                  <span>אימייל תמיכה</span>
                  <input
                    value={settings.supportEmail}
                    onChange={(event) => setSettings((prev) => ({ ...prev, supportEmail: event.target.value }))}
                  />
                </label>

                <label>
                  <span>WhatsApp תמיכה</span>
                  <input
                    value={settings.supportWhatsapp}
                    onChange={(event) => setSettings((prev) => ({ ...prev, supportWhatsapp: event.target.value }))}
                  />
                </label>
              </div>

              <div className="toggle-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.botEnabled}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, botEnabled: event.target.checked }))
                    }
                  />
                  בוט פעיל
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.demoEnabled}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, demoEnabled: event.target.checked }))
                    }
                  />
                  דמו פעיל
                </label>
              </div>

              <label>
                <span>Prompt מערכת</span>
                <textarea
                  rows={5}
                  value={settings.systemPrompt}
                  onChange={(event) => setSettings((prev) => ({ ...prev, systemPrompt: event.target.value }))}
                />
              </label>

              <div className="action-row">
                <button type="button" className="btn btn-primary" onClick={saveSettings}>
                  שמור הגדרות
                </button>
              </div>
            </article>

            <article className="card-panel">
              <div className="card-head">
                <h3>קוד הטמעה לסוכנות</h3>
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => copyToClipboard(selectedLocation.embedCode || "", "קוד הטמעה")}
                >
                  העתק קוד
                </button>
              </div>
              <code>{selectedLocation.embedCode || "אין קוד הטמעה"}</code>
              <div className="widget-preview">
                <iframe title="Widget preview" srcDoc={widgetPreviewDoc} />
              </div>
            </article>
          </section>
        ) : null}

        {selectedLocation && tab === "sandbox" ? (
          <section className="content-grid two-col">
            <article className="card-panel">
              <div className="card-head">
                <h3>הדמיית בוט חיה</h3>
                <button type="button" className="btn btn-soft" onClick={resetDemo}>
                  שיחה חדשה
                </button>
              </div>

              <div className="quick-row">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => sendDemoMessage("יש לי תקלה בחיבור לחשבון")}
                >
                  בדיקת תקלה
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => sendDemoMessage("איך מעבירים את השיחה לנציג?")}
                >
                  בדיקת העברה לנציג
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => sendDemoMessage("מהן שעות התמיכה?")}
                >
                  בדיקת FAQ
                </button>
              </div>

              <div className="chat-surface">
                {demoMessages.length === 0 ? (
                  <div className="empty-card">עדיין לא בוצעה שיחת דמו. שלח הודעה כדי להתחיל.</div>
                ) : (
                  demoMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`bubble ${
                        message.authorType === "bot"
                          ? "bot"
                          : message.authorType === "human"
                          ? "agent"
                          : "user"
                      }`}
                    >
                      <strong>
                        {message.senderName ||
                          (message.authorType === "bot"
                            ? settings.botName
                            : message.authorType === "human"
                            ? "נציג"
                            : "לקוח")}
                      </strong>
                      <span>{message.text}</span>
                    </div>
                  ))
                )}
              </div>

              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendDemoMessage();
                }}
              >
                <input
                  value={demoInput}
                  onChange={(event) => setDemoInput(event.target.value)}
                  placeholder="כתוב הודעה לבדיקה מול הבוט"
                />
                <button type="submit" className="btn btn-primary">
                  שלח
                </button>
              </form>

              <small className="meta-line">Conversation ID: {demoConversationId || "--"}</small>
            </article>

            <article className="card-panel">
              <h3>תצוגת ווידג׳ט</h3>
              <div className="widget-preview tall">
                <iframe title="Widget live" srcDoc={widgetPreviewDoc} />
              </div>
              <div className="integration-hints">
                <p>
                  מצב OpenAI: <strong>{integrations?.openai.connected ? "מחובר" : "לא מחובר"}</strong>
                </p>
                <p>
                  מצב GHL: <strong>{integrations?.ghl.connected ? "מחובר" : "לא מחובר"}</strong>
                </p>
              </div>
            </article>
          </section>
        ) : null}

        {selectedLocation && tab === "inbox" ? (
          <section className="content-grid two-col">
            <article className="card-panel">
              <div className="card-head">
                <h3>רשימת שיחות</h3>
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => loadSelectedLocation(selectedLocation.id)}
                >
                  רענון שיחות
                </button>
              </div>

              <div className="filter-row">
                {filters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`chip ${filter === item.id ? "active" : ""}`}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="conversation-list">
                {filteredConversations.length === 0 ? (
                  <div className="empty-card">אין שיחות להצגה בפילטר הנוכחי</div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`conversation-item ${
                        selectedConversationId === conversation.id ? "active" : ""
                      }`}
                      onClick={() => setSelectedConversationId(conversation.id)}
                    >
                      <div className="conversation-title-row">
                        <strong>{conversation.title || conversation.id}</strong>
                        <span className={`pill ${statusClass(conversation.status)}`}>{conversation.status}</span>
                      </div>
                      <small>
                        {conversation.channel || "web"} · {formatDate(conversation.updatedAt)}
                      </small>
                      <small>{conversation.messages?.[0]?.text || "ללא הודעות אחרונות"}</small>
                    </button>
                  ))
                )}
              </div>
            </article>

            <article className="card-panel">
              <div className="card-head">
                <h3>ניהול שיחה</h3>
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={closeConversation}
                  disabled={!selectedConversationId}
                >
                  סגור שיחה
                </button>
              </div>

              {!selectedConversation ? (
                <div className="empty-card">בחר שיחה כדי לראות הודעות ולהגיב כלקוח/נציג.</div>
              ) : (
                <>
                  <div className="conversation-meta">
                    <span>מזהה: {selectedConversation.id}</span>
                    <span className={`pill ${statusClass(selectedConversation.status)}`}>{selectedConversation.status}</span>
                  </div>

                  <div className="chat-surface">
                    {conversationMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`bubble ${
                          message.authorType === "human"
                            ? "agent"
                            : message.authorType === "bot"
                            ? "bot"
                            : "user"
                        }`}
                      >
                        <strong>{message.senderName || message.authorType}</strong>
                        <span>{message.text}</span>
                        <small>{formatDate(message.createdAt)}</small>
                      </div>
                    ))}
                  </div>

                  <form className="composer" onSubmit={sendAgentReply}>
                    <input
                      value={agentReply}
                      onChange={(event) => setAgentReply(event.target.value)}
                      placeholder="כתוב תגובת נציג"
                    />
                    <button type="submit" className="btn btn-primary">
                      שלח תגובה
                    </button>
                  </form>
                </>
              )}
            </article>
          </section>
        ) : null}

        {selectedLocation && tab === "analytics" ? (
          <section className="content-grid">
            <article className="card-panel">
              <h3>מדדי מערכת</h3>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <strong>{summary?.locations || 0}</strong>
                  <span>סוכנויות</span>
                </div>
                <div className="kpi-card">
                  <strong>{summary?.totalConversations || 0}</strong>
                  <span>שיחות כוללות</span>
                </div>
                <div className="kpi-card">
                  <strong>{summary?.openConversations || 0}</strong>
                  <span>שיחות פתוחות</span>
                </div>
                <div className="kpi-card">
                  <strong>{summary?.handoffConversations || 0}</strong>
                  <span>הועברו לנציג</span>
                </div>
                <div className="kpi-card">
                  <strong>{summary?.closedConversations || 0}</strong>
                  <span>שיחות סגורות</span>
                </div>
                <div className="kpi-card">
                  <strong>{summary?.last24hMessages || 0}</strong>
                  <span>הודעות ב-24 שעות</span>
                </div>
              </div>
            </article>

            <article className="card-panel">
              <h3>מצב הסוכנות הנבחרת</h3>
              <div className="kpi-grid two">
                <div className="kpi-card">
                  <strong>{selectedLocationStats?.openConversations || 0}</strong>
                  <span>פתוחות כרגע</span>
                </div>
                <div className="kpi-card">
                  <strong>{selectedLocationStats?.handoffConversations || 0}</strong>
                  <span>ממתינות לנציג</span>
                </div>
              </div>

              <div className="distribution">
                <div>
                  <label>פתוחות</label>
                  <progress max={Math.max(conversations.length, 1)} value={selectedLocationStats?.openConversations || 0} />
                </div>
                <div>
                  <label>אצל נציג</label>
                  <progress max={Math.max(conversations.length, 1)} value={selectedLocationStats?.handoffConversations || 0} />
                </div>
                <div>
                  <label>סגורות</label>
                  <progress
                    max={Math.max(conversations.length, 1)}
                    value={conversations.filter((item) => item.status === "closed").length}
                  />
                </div>
              </div>
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}
