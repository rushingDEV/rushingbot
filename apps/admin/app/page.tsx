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

const modules: Array<{ id: ModuleId; label: string; hint: string; icon: string }> = [
  { id: "dashboard", label: "בית", hint: "סקירת ביצועים", icon: "🏠" },
  { id: "wizard", label: "Wizard", hint: "הקמה מהירה", icon: "🧭" },
  { id: "inbox", label: "Inbox", hint: "ניהול שיחות", icon: "💬" },
  { id: "playground", label: "Playground", hint: "בדיקת בוט", icon: "🧪" },
  { id: "widget", label: "Widget", hint: "עיצוב והטמעה", icon: "📱" }
];

const filters: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "הכל" },
  { id: "open", label: "פתוחות" },
  { id: "handoff", label: "אצל נציג" },
  { id: "closed", label: "סגורות" }
];

const wizardSteps = ["מיתוג וזהות", "מוח OpenAI", "ערוצים ו-Handoff", "הטמעה וחיבורים", "סיכום ופרסום"];

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

function statusLabel(status: string) {
  if (status === "handoff") return "אצל נציג";
  if (status === "closed") return "סגורה";
  return "פתוחה";
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
  const [search, setSearch] = useState("");
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
    const byStatus = filter === "all" ? conversations : conversations.filter((item) => item.status === filter);
    if (!search.trim()) return byStatus;
    const query = search.trim().toLowerCase();
    return byStatus.filter((item) => {
      const title = (item.title || item.id).toLowerCase();
      const snippet = (item.messages?.[0]?.text || "").toLowerCase();
      return title.includes(query) || snippet.includes(query);
    });
  }, [conversations, filter, search]);

  const models = useMemo(() => {
    const fromApi = integrations?.openai.models || ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"];
    if (fromApi.includes(settings.openaiModel)) return fromApi;
    return [settings.openaiModel, ...fromApi];
  }, [integrations?.openai.models, settings.openaiModel]);

  const widgetPreviewDoc = useMemo(() => {
    if (!selectedLocation?.publicKey || !apiBase) return "";
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{margin:0;height:100vh;background:linear-gradient(180deg,#f4f7ff,#eef2ff)}</style></head><body><script src="${apiBase}/widget.js" data-location-key="${selectedLocation.publicKey}"></script></body></html>`;
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
    setInfo("ok", "ההגדרות נשמרו");
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
    setInfo("ok", "הנציג הגיב בהצלחה");
  };

  const setConversationStatus = async (mode: "close" | "reopen" | "handoff") => {
    if (!apiBase || !selectedConversationId) return;
    const path = mode === "close" ? "close" : mode === "reopen" ? "reopen" : "handoff";
    const res = await fetch(`${apiBase}/api/conversations/${selectedConversationId}/${path}`, { method: "POST" });
    if (!res.ok) {
      setInfo("error", "שינוי סטטוס נכשל");
      return;
    }

    await Promise.all([loadSummary(), loadSelectedLocation(selectedLocationId), loadConversation(selectedConversationId)]);
    if (mode === "close") setInfo("ok", "השיחה נסגרה");
    if (mode === "reopen") setInfo("ok", "השיחה חזרה לבוט");
    if (mode === "handoff") setInfo("ok", "הנציג תפס את השיחה");
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

  const wizardSummary = [
    { label: "סוכנות", value: settings.alias || selectedLocation?.id || "-" },
    { label: "שם בוט", value: settings.botName || "-" },
    { label: "מודל", value: settings.openaiModel || "-" },
    { label: "OpenAI", value: integrations?.openai.connected ? "מחובר" : "לא מחובר" },
    { label: "GHL", value: integrations?.ghl.connected ? "מחובר" : "לא מחובר" }
  ];

  const renderWizardBody = () => {
    if (wizardStep === 1) {
      return (
        <div className="form-grid two-col">
          <label>
            <span>כינוי סוכנות</span>
            <input value={settings.alias} onChange={(event) => setSettings((prev) => ({ ...prev, alias: event.target.value }))} />
          </label>
          <label>
            <span>שם הבוט</span>
            <input value={settings.botName} onChange={(event) => setSettings((prev) => ({ ...prev, botName: event.target.value }))} />
          </label>
          <label>
            <span>צבע מותג</span>
            <input value={settings.themeColor} onChange={(event) => setSettings((prev) => ({ ...prev, themeColor: event.target.value }))} />
          </label>
          <label>
            <span>ערוץ WhatsApp לתמיכה</span>
            <input value={settings.supportWhatsapp} onChange={(event) => setSettings((prev) => ({ ...prev, supportWhatsapp: event.target.value }))} placeholder="972..." />
          </label>
        </div>
      );
    }

    if (wizardStep === 2) {
      return (
        <div className="form-grid">
          <label>
            <span>מודל OpenAI</span>
            <select value={settings.openaiModel} onChange={(event) => setSettings((prev) => ({ ...prev, openaiModel: event.target.value }))}>
              {models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </label>
          <label>
            <span>טמפרטורה ({Number(settings.openaiTemperature).toFixed(1)})</span>
            <input type="range" min={0} max={1} step={0.1} value={settings.openaiTemperature} onChange={(event) => setSettings((prev) => ({ ...prev, openaiTemperature: Number(event.target.value) }))} />
          </label>
          <label>
            <span>System Prompt</span>
            <textarea rows={8} value={settings.systemPrompt} onChange={(event) => setSettings((prev) => ({ ...prev, systemPrompt: event.target.value }))} placeholder="הנחיות לבוט בעברית" />
          </label>
        </div>
      );
    }

    if (wizardStep === 3) {
      return (
        <div className="form-grid two-col">
          <label>
            <span>GHL API Key</span>
            <input
              type="password"
              value={settings.ghlApiKey}
              onChange={(event) => setSettings((prev) => ({ ...prev, ghlApiKey: event.target.value }))}
              placeholder={selectedLocation?.ghlApiConfigured ? "קיים מפתח. הזן חדש לעדכון" : "הזן מפתח"}
            />
          </label>
          <label>
            <span>מצב Handoff</span>
            <select value={settings.handoffMode} onChange={(event) => setSettings((prev) => ({ ...prev, handoffMode: event.target.value }))}>
              <option value="on_human_reply">עצירה אוטומטית כשנציג מגיב</option>
              <option value="manual_only">עצירה ידנית בלבד</option>
            </select>
          </label>
          <label>
            <span>אימייל תמיכה</span>
            <input value={settings.supportEmail} onChange={(event) => setSettings((prev) => ({ ...prev, supportEmail: event.target.value }))} />
          </label>
          <div className="toggle-row">
            <label><input type="checkbox" checked={settings.botEnabled} onChange={(e) => setSettings((prev) => ({ ...prev, botEnabled: e.target.checked }))} /> בוט פעיל</label>
            <label><input type="checkbox" checked={settings.demoEnabled} onChange={(e) => setSettings((prev) => ({ ...prev, demoEnabled: e.target.checked }))} /> דמו פעיל</label>
          </div>
        </div>
      );
    }

    if (wizardStep === 4) {
      return (
        <div className="form-grid">
          <div className="integration-grid">
            <article className="integration-card">
              <span>OpenAI</span>
              <strong className={integrations?.openai.connected ? "status-ok" : "status-bad"}>{integrations?.openai.connected ? "מחובר" : "לא מחובר"}</strong>
              <small>{integrations?.openai.detail || "חיבור תקין"}</small>
            </article>
            <article className="integration-card">
              <span>GHL</span>
              <strong className={integrations?.ghl.connected ? "status-ok" : "status-bad"}>{integrations?.ghl.connected ? "מחובר" : "לא מחובר"}</strong>
              <small>{integrations?.ghl.detail || "חיבור תקין"}</small>
            </article>
          </div>
          <div className="code-box">
            <div className="code-head">
              <strong>קוד הטמעה</strong>
              <button type="button" className="btn-outline" onClick={() => copyToClipboard(selectedLocation?.embedCode || "", "קוד הטמעה")}>העתק</button>
            </div>
            <code>{selectedLocation?.embedCode || "אין קוד הטמעה עדיין"}</code>
          </div>
        </div>
      );
    }

    return (
      <div className="form-grid">
        <p className="summary-hint">אישור סופי לפני פרסום. אפשר לחזור לאחור ולעדכן שדות.</p>
        <ul className="summary-list">
          {wizardSummary.map((item) => (
            <li key={item.label}><span>{item.label}</span><strong>{item.value}</strong></li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <main className="cb-shell" dir="rtl">
      <aside className="cb-nav-rail" aria-label="ניווט ראשי">
        <div className="logo">RB</div>
        {modules.map((item) => (
          <button key={item.id} type="button" className={`rail-btn ${moduleId === item.id ? "active" : ""}`} onClick={() => setModuleId(item.id)} title={item.label}>
            <span>{item.icon}</span>
          </button>
        ))}
        <button type="button" className="rail-btn rail-logout" onClick={logout} title="התנתקות">↩</button>
      </aside>

      <aside className="cb-agency-panel">
        <div className="agency-header">
          <h2>Rushingbot OS</h2>
          <p>ניהול סוכנויות ובוטים</p>
        </div>

        <form className="new-agency-card" onSubmit={addAgency}>
          <h3>סוכנות חדשה</h3>
          <input value={addLocationId} onChange={(e) => setAddLocationId(e.target.value)} placeholder="Location ID" required />
          <input value={addAlias} onChange={(e) => setAddAlias(e.target.value)} placeholder="כינוי סוכנות" />
          <input type="password" value={addGhlApiKey} onChange={(e) => setAddGhlApiKey(e.target.value)} placeholder="GHL API Key (אופציונלי)" />
          <button type="submit" className="btn-primary">הוספת סוכנות</button>
        </form>

        <div className="agency-list-head">
          <strong>רשימת סוכנויות</strong>
          <button type="button" className="btn-soft" onClick={refreshAll}>רענון</button>
        </div>

        <div className="agency-list">
          {locations.length === 0 ? <div className="empty-block">אין סוכנויות. הוסף Location ID חדש.</div> : null}
          {locations.map((location) => (
            <button key={location.id} type="button" className={`agency-item ${selectedLocationId === location.id ? "active" : ""}`} onClick={() => setSelectedLocationId(location.id)}>
              <div className="agency-item-top">
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

      <section className="cb-main-panel">
        <header className="main-hero">
          <div>
            <h1>{selectedLocation?.alias || "בחר סוכנות"}</h1>
            <p>{selectedLocation?.id || "ניהול בוטים, שיחות נציגים והטמעה בפלטפורמה"}</p>
          </div>
          <div className="hero-actions">
            <button type="button" className="btn-outline" onClick={refreshAll}>רענון</button>
            <button type="button" className="btn-primary" onClick={() => setModuleId("wizard")}>פתיחת Wizard</button>
          </div>
        </header>

        <section className="metric-row">
          <article><strong>{summary?.locations || 0}</strong><span>סוכנויות</span></article>
          <article><strong>{summary?.openConversations || 0}</strong><span>שיחות פתוחות</span></article>
          <article><strong>{summary?.handoffConversations || 0}</strong><span>אצל נציג</span></article>
          <article><strong>{summary?.closedConversations || 0}</strong><span>נסגרו</span></article>
          <article><strong>{summary?.last24hMessages || 0}</strong><span>24 שעות</span></article>
          <article><strong>{selectedLocationStats?.handoffConversations || 0}</strong><span>Handoff בלוקיישן</span></article>
        </section>

        {notice ? <div className={`notice ${notice.kind}`}>{notice.text}</div> : null}
        {loading ? <div className="notice info">טוען נתונים...</div> : null}
        {!selectedLocation ? <div className="empty-block">יש לבחור סוכנות כדי להמשיך.</div> : null}

        {selectedLocation && moduleId === "dashboard" ? (
          <section className="dashboard-grid">
            <article className="panel-card panel-span-2">
              <div className="panel-head">
                <h3>חיבורים מרכזיים</h3>
                <span className="mini-badge tone-open">Live</span>
              </div>
              <div className="integration-grid">
                <article className="integration-card">
                  <span>OpenAI</span>
                  <strong className={integrations?.openai.connected ? "status-ok" : "status-bad"}>{integrations?.openai.connected ? "מחובר" : "לא מחובר"}</strong>
                  <small>{integrations?.openai.detail || "מודלים זמינים לבחירה"}</small>
                </article>
                <article className="integration-card">
                  <span>GHL</span>
                  <strong className={integrations?.ghl.connected ? "status-ok" : "status-bad"}>{integrations?.ghl.connected ? "מחובר" : "לא מחובר"}</strong>
                  <small>{integrations?.ghl.detail || "סנכרון לפי Location"}</small>
                </article>
              </div>
            </article>

            <article className="panel-card">
              <h3>פעולות מהירות</h3>
              <div className="quick-stack">
                <button type="button" className="btn-outline" onClick={() => setModuleId("inbox")}>מעבר לאינבוקס שיחות</button>
                <button type="button" className="btn-outline" onClick={() => setModuleId("playground")}>בדיקת בוט בלייב</button>
                <button type="button" className="btn-outline" onClick={() => setModuleId("widget")}>עיצוב Widget</button>
              </div>
            </article>

            <article className="panel-card panel-span-3">
              <div className="panel-head">
                <h3>שיחות אחרונות</h3>
                <button type="button" className="btn-soft" onClick={() => setModuleId("inbox")}>פתח Inbox</button>
              </div>
              <div className="conversation-table">
                {conversations.slice(0, 8).map((conv) => (
                  <button key={conv.id} type="button" className="conversation-row" onClick={() => { setModuleId("inbox"); setSelectedConversationId(conv.id); }}>
                    <span className={`mini-badge ${getStatusTone(conv.status)}`}>{statusLabel(conv.status)}</span>
                    <strong>{conv.title || conv.id}</strong>
                    <small>{conv.messages?.[0]?.text || "ללא הודעה"}</small>
                    <time>{formatDate(conv.updatedAt)}</time>
                  </button>
                ))}
                {conversations.length === 0 ? <div className="empty-block">אין שיחות להצגה עדיין.</div> : null}
              </div>
            </article>
          </section>
        ) : null}

        {selectedLocation && moduleId === "wizard" ? (
          <section className="wizard-modal-shell">
            <div className="wizard-modal">
              <aside className="wizard-stepper">
                <h3>Wizard הקמת בוט</h3>
                <p>השלמת שלבים והעלאה לפרודקשן.</p>
                {wizardSteps.map((step, index) => (
                  <button key={step} type="button" className={`wizard-step ${wizardStep === index + 1 ? "active" : ""}`} onClick={() => setWizardStep(index + 1)}>
                    <span>{index + 1}</span>
                    <strong>{step}</strong>
                  </button>
                ))}
              </aside>

              <div className="wizard-content">
                <header>
                  <h3>{wizardSteps[wizardStep - 1]}</h3>
                  <p>סוכנות: {selectedLocation.alias || selectedLocation.id}</p>
                </header>
                {renderWizardBody()}
                <footer className="wizard-actions">
                  <button type="button" className="btn-soft" disabled={wizardStep === 1} onClick={() => setWizardStep((value) => Math.max(1, value - 1))}>הקודם</button>
                  <button type="button" className="btn-outline" onClick={() => setModuleId("dashboard")}>סגירה</button>
                  {wizardStep < wizardSteps.length ? (
                    <button type="button" className="btn-primary" onClick={() => setWizardStep((value) => Math.min(wizardSteps.length, value + 1))}>הבא</button>
                  ) : (
                    <button type="button" className="btn-primary" onClick={saveSettings}>שמור ופרסם</button>
                  )}
                </footer>
              </div>

              <aside className="wizard-summary-col">
                <h4>Summary</h4>
                <ul>
                  {wizardSummary.map((item) => (
                    <li key={item.label}><span>{item.label}</span><strong>{item.value}</strong></li>
                  ))}
                </ul>
              </aside>
            </div>
          </section>
        ) : null}

        {selectedLocation && moduleId === "inbox" ? (
          <section className="inbox-layout">
            <aside className="inbox-col-list">
              <div className="inbox-toolbar">
                <h3>Conversations</h3>
                <button type="button" className="btn-soft" onClick={() => loadSelectedLocation(selectedLocation.id)}>רענון</button>
              </div>

              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש לפי שם או טקסט" />

              <div className="chip-row">
                {filters.map((item) => (
                  <button key={item.id} type="button" className={`chip ${filter === item.id ? "active" : ""}`} onClick={() => setFilter(item.id)}>{item.label}</button>
                ))}
              </div>

              <div className="inbox-list-scroll">
                {filteredConversations.map((conversation) => (
                  <button key={conversation.id} type="button" className={`conversation-item ${selectedConversationId === conversation.id ? "active" : ""}`} onClick={() => setSelectedConversationId(conversation.id)}>
                    <div className="conversation-item-head">
                      <strong>{conversation.title || conversation.id}</strong>
                      <span className={`mini-badge ${getStatusTone(conversation.status)}`}>{statusLabel(conversation.status)}</span>
                    </div>
                    <small>{conversation.channel || "web"} · {formatDate(conversation.updatedAt)}</small>
                    <small>{conversation.messages?.[0]?.text || "ללא הודעה"}</small>
                  </button>
                ))}
                {filteredConversations.length === 0 ? <div className="empty-block">אין שיחות בתצוגה הנוכחית.</div> : null}
              </div>
            </aside>

            <section className="inbox-col-thread">
              <header className="thread-header">
                <div>
                  <h3>{selectedConversation?.title || "בחר שיחה"}</h3>
                  <p>{selectedConversation?.id || ""}</p>
                </div>
                <div className="thread-actions">
                  {selectedConversation && selectedConversation.status !== "handoff" ? (
                    <button type="button" className="btn-outline" onClick={() => setConversationStatus("handoff")}>תפוס שיחה</button>
                  ) : null}
                  {selectedConversation && selectedConversation.status === "handoff" ? (
                    <button type="button" className="btn-outline" onClick={() => setConversationStatus("reopen")}>החזר לבוט</button>
                  ) : null}
                  {selectedConversation && selectedConversation.status !== "closed" ? (
                    <button type="button" className="btn-soft" onClick={() => setConversationStatus("close")}>סגור פניה</button>
                  ) : null}
                  {selectedConversation && selectedConversation.status === "closed" ? (
                    <button type="button" className="btn-soft" onClick={() => setConversationStatus("reopen")}>פתח מחדש</button>
                  ) : null}
                </div>
              </header>

              <div className="chat-feed">
                {conversationMessages.length === 0 ? <div className="empty-block">אין הודעות עדיין.</div> : null}
                {conversationMessages.map((message) => (
                  <article key={message.id} className={`bubble ${message.authorType === "human" ? "agent" : message.authorType === "bot" ? "bot" : "user"}`}>
                    <strong>{message.senderName || message.authorType}</strong>
                    <span>{message.text}</span>
                    <small>{formatDate(message.createdAt)}</small>
                  </article>
                ))}
              </div>

              <form className="composer" onSubmit={sendAgentReply}>
                <input value={agentReply} onChange={(event) => setAgentReply(event.target.value)} placeholder="הודעת נציג" />
                <button type="submit" className="btn-primary">שלח</button>
              </form>
            </section>

            <aside className="inbox-col-info">
              <h3>פרטי שיחה</h3>
              {selectedConversation ? (
                <ul className="info-list">
                  <li><span>סטטוס</span><strong>{statusLabel(selectedConversation.status)}</strong></li>
                  <li><span>ערוץ</span><strong>{selectedConversation.channel || "web"}</strong></li>
                  <li><span>מקור</span><strong>{selectedConversation.source || "-"}</strong></li>
                  <li><span>עודכן</span><strong>{formatDate(selectedConversation.updatedAt)}</strong></li>
                </ul>
              ) : (
                <div className="empty-block">בחר שיחה להצגת פרטים.</div>
              )}
            </aside>
          </section>
        ) : null}

        {selectedLocation && moduleId === "playground" ? (
          <section className="playground-grid">
            <article className="panel-card">
              <div className="panel-head">
                <h3>הדמיית בוט חיה</h3>
                <button type="button" className="btn-soft" onClick={() => { setDemoConversationId(null); setDemoMessages([]); }}>שיחה חדשה</button>
              </div>

              <div className="quick-stack inline">
                <button type="button" className="btn-outline" onClick={() => sendDemoMessage("יש לי תקלה בתשלום")}>תקלה בתשלום</button>
                <button type="button" className="btn-outline" onClick={() => sendDemoMessage("תעבירו אותי לנציג")}>העברה לנציג</button>
                <button type="button" className="btn-outline" onClick={() => sendDemoMessage("איך מחברים את המייל?")}>חיבור מייל</button>
              </div>

              <div className="chat-feed demo">
                {demoMessages.length === 0 ? <div className="empty-block">שלח הודעה כדי לבדוק תשובות אמיתיות מ-OpenAI.</div> : null}
                {demoMessages.map((message) => (
                  <article key={message.id} className={`bubble ${message.authorType === "bot" ? "bot" : message.authorType === "human" ? "agent" : "user"}`}>
                    <strong>{message.senderName || (message.authorType === "bot" ? settings.botName : "לקוח")}</strong>
                    <span>{message.text}</span>
                  </article>
                ))}
              </div>

              <form className="composer" onSubmit={(event) => { event.preventDefault(); sendDemoMessage(); }}>
                <input value={demoInput} onChange={(event) => setDemoInput(event.target.value)} placeholder="כתוב כאן הודעה לבדיקה" />
                <button type="submit" className="btn-primary">שלח</button>
              </form>
            </article>

            <article className="panel-card">
              <h3>תצוגת ווידג׳ט</h3>
              <div className="mobile-preview">
                <iframe title="Widget preview" srcDoc={widgetPreviewDoc} />
              </div>
            </article>
          </section>
        ) : null}

        {selectedLocation && moduleId === "widget" ? (
          <section className="widget-grid">
            <article className="panel-card">
              <h3>Widget Studio</h3>
              <p>עיצוב, מיתוג והטמעה לכל Location בצורה מבודדת.</p>

              <div className="form-grid two-col">
                <label>
                  <span>שם בוט</span>
                  <input value={settings.botName} onChange={(event) => setSettings((prev) => ({ ...prev, botName: event.target.value }))} />
                </label>
                <label>
                  <span>צבע Theme</span>
                  <input value={settings.themeColor} onChange={(event) => setSettings((prev) => ({ ...prev, themeColor: event.target.value }))} />
                </label>
              </div>

              <div className="code-box">
                <div className="code-head">
                  <strong>Snippet להטמעה</strong>
                  <button type="button" className="btn-outline" onClick={() => copyToClipboard(selectedLocation.embedCode || "", "Snippet")}>העתק</button>
                </div>
                <code>{selectedLocation.embedCode || "אין קוד הטמעה"}</code>
              </div>

              <div className="quick-stack inline">
                <button type="button" className="btn-primary" onClick={saveSettings}>שמור עיצוב</button>
                <button type="button" className="btn-outline" onClick={() => setModuleId("playground")}>בדיקה ב-Playground</button>
              </div>
            </article>

            <article className="panel-card">
              <h3>Live Widget</h3>
              <div className="mobile-preview tall">
                <iframe title="Widget studio preview" srcDoc={widgetPreviewDoc} />
              </div>
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}
