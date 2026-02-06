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

type ModuleId = "dashboard" | "wizard" | "inbox" | "playground" | "widget";
type FilterId = "all" | "open" | "handoff" | "closed";

const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";

const modules: Array<{ id: ModuleId; label: string; hint: string }> = [
  { id: "dashboard", label: "Dashboard", hint: "סקירה ומדדים" },
  { id: "wizard", label: "Wizard", hint: "הקמת בוט מהירה" },
  { id: "inbox", label: "Inbox", hint: "ניהול שיחות" },
  { id: "playground", label: "Playground", hint: "התנסות חיה" },
  { id: "widget", label: "Widget Studio", hint: "עיצוב והטמעה" }
];

const filters: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "הכל" },
  { id: "open", label: "פתוחות" },
  { id: "handoff", label: "אצל נציג" },
  { id: "closed", label: "סגורות" }
];

const wizardSteps = [
  "מיתוג וזהות",
  "מוח ה-AI",
  "ערוצים והעברה",
  "הטמעה ופרסום",
  "בדיקה וסיום"
];

const defaultSettings = {
  alias: "",
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

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusTone(status: string) {
  if (status === "closed") return "tone-closed";
  if (status === "handoff") return "tone-handoff";
  return "tone-open";
}

export default function Page() {
  const [moduleId, setModuleId] = useState<ModuleId>("dashboard");
  const [wizardStep, setWizardStep] = useState(1);
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

  const models = useMemo(() => {
    const fromApi = integrations?.openai.models || ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"];
    if (fromApi.includes(settings.openaiModel)) return fromApi;
    return [settings.openaiModel, ...fromApi];
  }, [integrations?.openai.models, settings.openaiModel]);

  const widgetPreviewDoc = useMemo(() => {
    if (!selectedLocation?.publicKey || !apiBase) return "";
    return `<!doctype html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><style>body{margin:0;height:100vh;background:#f0f4ff}</style></head><body><script src=\"${apiBase}/widget.js\" data-location-key=\"${selectedLocation.publicKey}\"></script></body></html>`;
  }, [selectedLocation, apiBase]);

  const setInfo = (kind: Notice["kind"], text: string) => setNotice({ kind, text });

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
      setLocations((prev) => prev.map((item) => (item.id === loadedLocation.id ? { ...item, ...loadedLocation } : item)));
      setSettings((prev) => ({
        ...prev,
        alias: loadedLocation.alias || "",
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
      current && nextConversations.some((item) => item.id === current) ? current : nextConversations[0].id
    );
  };

  const loadConversation = async (conversationId: string) => {
    if (!apiBase || !conversationId) return;
    const res = await fetch(`${apiBase}/api/conversations/${conversationId}/messages`);
    if (!res.ok) throw new Error("Failed loading conversation");
    const payload = await res.json();
    setConversationMessages(payload.messages || []);
  };

  const refreshAll = async () => {
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
    loadConversation(selectedConversationId).catch(() => setInfo("error", "שגיאה בטעינת ההודעות"));
  }, [selectedConversationId]);

  const addAgency = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiBase || !addLocationId.trim()) return;

    const locationId = addLocationId.trim();

    const res = await fetch(`${apiBase}/api/locations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locationId,
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
    setInfo("ok", "הסוכנות נוספה");

    await Promise.all([loadSummary(), loadLocations()]);
    setSelectedLocationId(locationId);
    setWizardStep(1);
    setModuleId("wizard");
  };

  const saveSettings = async () => {
    if (!apiBase || !selectedLocationId) return;

    const res = await fetch(`${apiBase}/api/locations/${selectedLocationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        alias: settings.alias || undefined,
        botName: settings.botName,
        systemPrompt: settings.systemPrompt,
        openaiModel: settings.openaiModel,
        openaiTemperature: Number(settings.openaiTemperature),
        supportEmail: settings.supportEmail || undefined,
        supportWhatsapp: settings.supportWhatsapp || undefined,
        handoffMode: settings.handoffMode,
        themeColor: settings.themeColor,
        botEnabled: settings.botEnabled,
        demoEnabled: settings.demoEnabled,
        ghlApiKey: settings.ghlApiKey || undefined
      })
    });

    if (!res.ok) {
      setInfo("error", "שמירת הגדרות נכשלה");
      return;
    }

    setSettings((prev) => ({ ...prev, ghlApiKey: "" }));
    setInfo("ok", "הגדרות נשמרו");
    await Promise.all([loadSummary(), loadSelectedLocation(selectedLocationId), loadLocations()]);
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

  const sendAgentReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiBase || !selectedConversationId || !agentReply.trim()) return;

    const res = await fetch(`${apiBase}/api/conversations/${selectedConversationId}/agent-message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: agentReply, senderName: "Agent Console" })
    });

    if (!res.ok) {
      setInfo("error", "שליחת תגובת נציג נכשלה");
      return;
    }

    const payload = await res.json();
    setConversationMessages(payload.messages || []);
    setAgentReply("");
    await Promise.all([loadSummary(), loadSelectedLocation(selectedLocationId)]);
    setInfo("ok", "תגובת נציג נשלחה");
  };

  const closeConversation = async () => {
    if (!apiBase || !selectedConversationId) return;
    const res = await fetch(`${apiBase}/api/conversations/${selectedConversationId}/close`, { method: "POST" });
    if (!res.ok) {
      setInfo("error", "סגירת שיחה נכשלה");
      return;
    }

    setSelectedConversationId("");
    setConversationMessages([]);
    await Promise.all([loadSummary(), loadSelectedLocation(selectedLocationId)]);
    setInfo("ok", "השיחה נסגרה");
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

  const stepContent = () => {
    if (!selectedLocation) {
      return <div className="empty-block">בחר סוכנות כדי להתחיל Wizard.</div>;
    }

    if (wizardStep === 1) {
      return (
        <div className="wizard-form-grid">
          <label>
            <span>כינוי סוכנות</span>
            <input
              value={settings.alias}
              onChange={(event) => setSettings((prev) => ({ ...prev, alias: event.target.value }))}
              placeholder="למשל: Agency Tel Aviv"
            />
          </label>
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
        </div>
      );
    }

    if (wizardStep === 2) {
      return (
        <div className="wizard-form-grid">
          <label>
            <span>מודל OpenAI</span>
            <select
              value={settings.openaiModel}
              onChange={(event) => setSettings((prev) => ({ ...prev, openaiModel: event.target.value }))}
            >
              {models.map((model) => (
                <option key={model} value={model}>{model}</option>
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
              onChange={(event) => setSettings((prev) => ({ ...prev, openaiTemperature: Number(event.target.value) }))}
            />
          </label>
          <label>
            <span>System Prompt</span>
            <textarea
              rows={6}
              value={settings.systemPrompt}
              onChange={(event) => setSettings((prev) => ({ ...prev, systemPrompt: event.target.value }))}
            />
          </label>
        </div>
      );
    }

    if (wizardStep === 3) {
      return (
        <div className="wizard-form-grid two-col">
          <label>
            <span>GHL API Key</span>
            <input
              type="password"
              value={settings.ghlApiKey}
              placeholder={selectedLocation.ghlApiConfigured ? "קיים מפתח. הזן חדש לעדכון" : "הזן מפתח"}
              onChange={(event) => setSettings((prev) => ({ ...prev, ghlApiKey: event.target.value }))}
            />
          </label>
          <label>
            <span>מצב Handoff</span>
            <select
              value={settings.handoffMode}
              onChange={(event) => setSettings((prev) => ({ ...prev, handoffMode: event.target.value }))}
            >
              <option value="on_human_reply">עצירה אוטומטית כשנציג עונה</option>
              <option value="manual_only">עצירה ידנית בלבד</option>
            </select>
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
      );
    }

    if (wizardStep === 4) {
      return (
        <div className="wizard-form-grid">
          <div className="integration-grid">
            <article className="integration-card">
              <span>OpenAI</span>
              <strong className={integrations?.openai.connected ? "status-ok" : "status-bad"}>
                {integrations?.openai.connected ? "מחובר" : "לא מחובר"}
              </strong>
              <small>{integrations?.openai.detail || "חיבור תקין"}</small>
            </article>
            <article className="integration-card">
              <span>GHL</span>
              <strong className={integrations?.ghl.connected ? "status-ok" : "status-bad"}>
                {integrations?.ghl.connected ? "מחובר" : "לא מחובר"}
              </strong>
              <small>{integrations?.ghl.detail || "חיבור תקין"}</small>
            </article>
          </div>
          <div className="toggle-line">
            <label>
              <input
                type="checkbox"
                checked={settings.botEnabled}
                onChange={(event) => setSettings((prev) => ({ ...prev, botEnabled: event.target.checked }))}
              />
              בוט פעיל
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.demoEnabled}
                onChange={(event) => setSettings((prev) => ({ ...prev, demoEnabled: event.target.checked }))}
              />
              דמו פעיל
            </label>
          </div>
          <div className="code-box">
            <div className="code-head">
              <strong>קוד הטמעה</strong>
              <button type="button" className="btn-outline" onClick={() => copyToClipboard(selectedLocation.embedCode || "", "קוד הטמעה")}>העתק</button>
            </div>
            <code>{selectedLocation.embedCode || "אין קוד הטמעה"}</code>
          </div>
        </div>
      );
    }

    return (
      <div className="wizard-summary">
        <h4>סיכום לפני פרסום</h4>
        <ul>
          <li>סוכנות: {settings.alias || selectedLocation.id}</li>
          <li>בוט: {settings.botName}</li>
          <li>מודל: {settings.openaiModel}</li>
          <li>OpenAI: {integrations?.openai.connected ? "מחובר" : "לא מחובר"}</li>
          <li>GHL: {integrations?.ghl.connected ? "מחובר" : "לא מחובר"}</li>
        </ul>
        <p>לחץ על "שמור ופרסם" כדי להחיל את כל ההגדרות ולסיים את ה־Wizard.</p>
      </div>
    );
  };

  return (
    <main dir="rtl" className="product-shell">
      <aside className="left-rail">
        <div className="brand-box">
          <div>
            <h1>Rushingbot OS</h1>
            <p>מערכת ניהול בוטים לסוכנויות</p>
          </div>
          <button type="button" className="btn-soft" onClick={logout}>התנתקות</button>
        </div>

        <div className="module-list">
          {modules.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`module-btn ${moduleId === item.id ? "active" : ""}`}
              onClick={() => setModuleId(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </div>

        <form className="quick-create" onSubmit={addAgency}>
          <h3>סוכנות חדשה</h3>
          <input value={addLocationId} onChange={(e) => setAddLocationId(e.target.value)} placeholder="Location ID" required />
          <input value={addAlias} onChange={(e) => setAddAlias(e.target.value)} placeholder="כינוי" />
          <input type="password" value={addGhlApiKey} onChange={(e) => setAddGhlApiKey(e.target.value)} placeholder="GHL API Key" />
          <button type="submit" className="btn-primary">צור</button>
        </form>

        <div className="agency-scroll">
          {locations.map((location) => (
            <button
              key={location.id}
              type="button"
              className={`agency-item ${selectedLocationId === location.id ? "active" : ""}`}
              onClick={() => setSelectedLocationId(location.id)}
            >
              <div className="agency-top">
                <strong>{location.alias || location.id}</strong>
                <span className={`mini-badge ${location.ghlApiConfigured ? "tone-open" : "tone-closed"}`}>
                  {location.ghlApiConfigured ? "GHL" : "No GHL"}
                </span>
              </div>
              <small>{location.id}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="main-area">
        <header className="top-head">
          <div>
            <h2>{selectedLocation?.alias || "בחר סוכנות"}</h2>
            <p>{selectedLocation?.id || "ללא סוכנות פעילה"}</p>
          </div>
          <div className="head-tools">
            <button type="button" className="btn-outline" onClick={refreshAll}>רענון</button>
            <div className="summary-strip">
              <article><strong>{summary?.locations || 0}</strong><span>סוכנויות</span></article>
              <article><strong>{summary?.openConversations || 0}</strong><span>פתוחות</span></article>
              <article><strong>{summary?.handoffConversations || 0}</strong><span>אצל נציג</span></article>
              <article><strong>{summary?.last24hMessages || 0}</strong><span>24h</span></article>
            </div>
          </div>
        </header>

        {notice ? <div className={`notice ${notice.kind}`}>{notice.text}</div> : null}
        {loading ? <div className="notice info">טוען...</div> : null}

        {!selectedLocation ? (
          <div className="empty-block">בחר סוכנות מהתפריט השמאלי כדי לעבוד עם המערכת.</div>
        ) : null}

        {selectedLocation && moduleId === "dashboard" ? (
          <div className="content-grid">
            <section className="panel-card">
              <h3>סטטוס מערכת</h3>
              <div className="integration-grid">
                <article className="integration-card">
                  <span>OpenAI</span>
                  <strong className={integrations?.openai.connected ? "status-ok" : "status-bad"}>
                    {integrations?.openai.connected ? "מחובר" : "לא מחובר"}
                  </strong>
                  <small>{integrations?.openai.detail || "גישה למודלים זמינה"}</small>
                </article>
                <article className="integration-card">
                  <span>GHL</span>
                  <strong className={integrations?.ghl.connected ? "status-ok" : "status-bad"}>
                    {integrations?.ghl.connected ? "מחובר" : "לא מחובר"}
                  </strong>
                  <small>{integrations?.ghl.detail || "חיבור תקין"}</small>
                </article>
              </div>
            </section>

            <section className="panel-card">
              <h3>שיחות אחרונות</h3>
              <div className="conversation-stack">
                {conversations.slice(0, 6).map((conv) => (
                  <button key={conv.id} type="button" className="conversation-item" onClick={() => { setModuleId("inbox"); setSelectedConversationId(conv.id); }}>
                    <div className="conversation-head">
                      <strong>{conv.title || conv.id}</strong>
                      <span className={`mini-badge ${getStatusTone(conv.status)}`}>{conv.status}</span>
                    </div>
                    <small>{conv.messages?.[0]?.text || "ללא הודעות"}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {selectedLocation && moduleId === "wizard" ? (
          <div className="wizard-shell">
            <aside className="wizard-side">
              <h3>Bot Setup Wizard</h3>
              <p>השלמת 5 שלבים והעלאה לפרודקשן.</p>
              <div className="wizard-steps">
                {wizardSteps.map((step, index) => (
                  <button
                    key={step}
                    type="button"
                    className={`step-btn ${wizardStep === index + 1 ? "active" : ""}`}
                    onClick={() => setWizardStep(index + 1)}
                  >
                    <span>{index + 1}</span>
                    <strong>{step}</strong>
                  </button>
                ))}
              </div>
            </aside>

            <section className="wizard-main">
              <header>
                <h3>{wizardSteps[wizardStep - 1]}</h3>
                <p>סוכנות: {selectedLocation.alias || selectedLocation.id}</p>
              </header>

              {stepContent()}

              <footer className="wizard-footer">
                <button type="button" className="btn-soft" disabled={wizardStep === 1} onClick={() => setWizardStep((s) => Math.max(1, s - 1))}>הקודם</button>
                {wizardStep < 5 ? (
                  <button type="button" className="btn-primary" onClick={() => setWizardStep((s) => Math.min(5, s + 1))}>הבא</button>
                ) : (
                  <button type="button" className="btn-primary" onClick={saveSettings}>שמור ופרסם</button>
                )}
              </footer>
            </section>
          </div>
        ) : null}

        {selectedLocation && moduleId === "inbox" ? (
          <div className="inbox-shell">
            <aside className="inbox-list">
              <div className="inbox-head">
                <h3>Conversations</h3>
                <button type="button" className="btn-soft" onClick={() => loadSelectedLocation(selectedLocation.id)}>רענון</button>
              </div>

              <div className="filter-row">
                {filters.map((item) => (
                  <button key={item.id} type="button" className={`chip ${filter === item.id ? "active" : ""}`} onClick={() => setFilter(item.id)}>{item.label}</button>
                ))}
              </div>

              <div className="conversation-stack">
                {filteredConversations.length === 0 ? <div className="empty-block">אין שיחות לתצוגה</div> : null}
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`conversation-item ${selectedConversationId === conversation.id ? "active" : ""}`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <div className="conversation-head">
                      <strong>{conversation.title || conversation.id}</strong>
                      <span className={`mini-badge ${getStatusTone(conversation.status)}`}>{conversation.status}</span>
                    </div>
                    <small>{conversation.channel || "web"} · {formatDate(conversation.updatedAt)}</small>
                    <small>{conversation.messages?.[0]?.text || "ללא טקסט"}</small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="inbox-thread">
              <div className="thread-head">
                <div>
                  <h3>{selectedConversation?.title || "בחר שיחה"}</h3>
                  <p>{selectedConversation?.id || ""}</p>
                </div>
                <button type="button" className="btn-outline" onClick={closeConversation} disabled={!selectedConversationId}>סגור שיחה</button>
              </div>

              <div className="chat-surface">
                {conversationMessages.length === 0 ? <div className="empty-block">אין הודעות עדיין</div> : null}
                {conversationMessages.map((message) => (
                  <article key={message.id} className={`bubble ${message.authorType === "human" ? "agent" : message.authorType === "bot" ? "bot" : "user"}`}>
                    <strong>{message.senderName || message.authorType}</strong>
                    <span>{message.text}</span>
                    <small>{formatDate(message.createdAt)}</small>
                  </article>
                ))}
              </div>

              <form className="composer" onSubmit={sendAgentReply}>
                <input value={agentReply} onChange={(event) => setAgentReply(event.target.value)} placeholder="תגובת נציג" />
                <button type="submit" className="btn-primary">שלח</button>
              </form>
            </section>
          </div>
        ) : null}

        {selectedLocation && moduleId === "playground" ? (
          <div className="content-grid two-col">
            <section className="panel-card">
              <div className="panel-head">
                <h3>התנסות חיה</h3>
                <button type="button" className="btn-soft" onClick={() => { setDemoConversationId(null); setDemoMessages([]); }}>שיחה חדשה</button>
              </div>

              <div className="quick-actions">
                <button type="button" className="btn-outline" onClick={() => sendDemoMessage("יש לי תקלה בתשלום")}>תקלה בתשלום</button>
                <button type="button" className="btn-outline" onClick={() => sendDemoMessage("תעביר אותי לנציג")}>העברה לנציג</button>
                <button type="button" className="btn-outline" onClick={() => sendDemoMessage("איך יוצרים משתמש חדש?")}>שאלת תמיכה</button>
              </div>

              <div className="chat-surface">
                {demoMessages.length === 0 ? <div className="empty-block">התחל לשלוח הודעה לבדיקה.</div> : null}
                {demoMessages.map((message) => (
                  <article key={message.id} className={`bubble ${message.authorType === "bot" ? "bot" : "user"}`}>
                    <strong>{message.senderName || (message.authorType === "bot" ? settings.botName : "לקוח")}</strong>
                    <span>{message.text}</span>
                  </article>
                ))}
              </div>

              <form className="composer" onSubmit={(event) => { event.preventDefault(); sendDemoMessage(); }}>
                <input value={demoInput} onChange={(event) => setDemoInput(event.target.value)} placeholder="כתוב הודעה" />
                <button type="submit" className="btn-primary">שלח</button>
              </form>
            </section>

            <section className="panel-card">
              <h3>תצוגת Widget</h3>
              <div className="widget-preview-frame">
                <iframe title="Widget preview" srcDoc={widgetPreviewDoc} />
              </div>
            </section>
          </div>
        ) : null}

        {selectedLocation && moduleId === "widget" ? (
          <div className="content-grid two-col">
            <section className="panel-card">
              <h3>Widget Studio</h3>
              <p>גרסה חדשה עם ניווט Home / Tasks / Messages / Help.</p>

              <div className="code-box">
                <div className="code-head">
                  <strong>Snippet להטמעה</strong>
                  <button type="button" className="btn-outline" onClick={() => copyToClipboard(selectedLocation.embedCode || "", "Snippet")}>העתק</button>
                </div>
                <code>{selectedLocation.embedCode || "אין קוד"}</code>
              </div>

              <ul className="feature-list">
                <li>Home עם כרטיסי פעולה מהירים</li>
                <li>Tasks עם checklist מובנה</li>
                <li>Messages עם רשימת שיחות</li>
                <li>Help עם חיפוש ותגיות נפוצות</li>
                <li>Chat רציף עם תשובות AI אמיתיות</li>
              </ul>
            </section>

            <section className="panel-card">
              <h3>Live Preview</h3>
              <div className="widget-preview-frame tall">
                <iframe title="Widget studio preview" srcDoc={widgetPreviewDoc} />
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
