"use client";

import { useEffect, useMemo, useState } from "react";

type Location = {
  id: string;
  alias?: string | null;
  publicKey?: string | null;
  botName?: string;
  systemPrompt?: string | null;
  supportEmail?: string | null;
  supportWhatsapp?: string | null;
  botEnabled?: boolean;
  handoffMode?: string;
  themeColor?: string;
  demoEnabled?: boolean;
  embedCode?: string | null;
};

type Conversation = {
  id: string;
  title?: string | null;
  status: string;
  channel?: string | null;
  source?: string;
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

const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";

const emptySettings = {
  botName: "Rushingbot",
  systemPrompt: "",
  supportEmail: "",
  supportWhatsapp: "",
  handoffMode: "on_human_reply",
  themeColor: "#2f5bff",
  botEnabled: true,
  demoEnabled: true,
  ghlApiKey: ""
};

export default function Page() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [addLocationId, setAddLocationId] = useState("");
  const [addAlias, setAddAlias] = useState("");
  const [addGhlApiKey, setAddGhlApiKey] = useState("");
  const [settings, setSettings] = useState(emptySettings);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [agentReply, setAgentReply] = useState("");
  const [demoConversationId, setDemoConversationId] = useState<string | null>(null);
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([]);
  const [demoInput, setDemoInput] = useState("");
  const [status, setStatus] = useState<string>("");

  const selectedLocation = useMemo(
    () => locations.find((item) => item.id === selectedLocationId) || null,
    [locations, selectedLocationId]
  );

  const masterSnippet = useMemo(
    () => (apiBase ? `<script src=\"${apiBase}/widget.js\" data-location-key=\"LOCATION_PUBLIC_KEY\"></script>` : ""),
    [apiBase]
  );

  const selectedEmbedCode = useMemo(() => {
    if (!selectedLocation?.publicKey || !apiBase) return "";
    return `<script src=\"${apiBase}/widget.js\" data-location-key=\"${selectedLocation.publicKey}\"></script>`;
  }, [selectedLocation, apiBase]);

  const widgetPreviewDoc = useMemo(() => {
    if (!selectedLocation?.publicKey || !apiBase) return "";
    return `<!doctype html><html><head><meta charset=\"utf-8\" /><style>body{margin:0;height:100vh;background:linear-gradient(180deg,#edf2ff,#f8faff);font-family:Assistant,Arial,sans-serif}</style></head><body><script src=\"${apiBase}/widget.js\" data-location-key=\"${selectedLocation.publicKey}\"></script></body></html>`;
  }, [selectedLocation, apiBase]);

  const fetchLocations = async () => {
    if (!apiBase) return;
    const res = await fetch(`${apiBase}/api/locations`);
    const payload = await res.json();
    const nextLocations: Location[] = payload.locations ?? [];
    setLocations(nextLocations);

    if (!selectedLocationId && nextLocations.length > 0) {
      setSelectedLocationId(nextLocations[0].id);
    }
  };

  const fetchSummary = async () => {
    if (!apiBase) return;
    const res = await fetch(`${apiBase}/api/dashboard/summary`);
    const payload = await res.json();
    setSummary(payload.summary ?? null);
  };

  const fetchLocationDetails = async (locationId: string) => {
    if (!apiBase || !locationId) return;

    const [locationRes, conversationsRes] = await Promise.all([
      fetch(`${apiBase}/api/locations/${locationId}`),
      fetch(`${apiBase}/api/locations/${locationId}/conversations`)
    ]);

    const locationPayload = await locationRes.json();
    const conversationsPayload = await conversationsRes.json();

    const loadedLocation = locationPayload.location as Location;
    if (loadedLocation) {
      setSettings({
        botName: loadedLocation.botName || "Rushingbot",
        systemPrompt: loadedLocation.systemPrompt || "",
        supportEmail: loadedLocation.supportEmail || "",
        supportWhatsapp: loadedLocation.supportWhatsapp || "",
        handoffMode: loadedLocation.handoffMode || "on_human_reply",
        themeColor: loadedLocation.themeColor || "#2f5bff",
        botEnabled: loadedLocation.botEnabled ?? true,
        demoEnabled: loadedLocation.demoEnabled ?? true,
        ghlApiKey: ""
      });
      setLocations((prev) => prev.map((item) => (item.id === loadedLocation.id ? { ...item, ...loadedLocation } : item)));
    }

    const loadedConversations: Conversation[] = conversationsPayload.conversations ?? [];
    setConversations(loadedConversations);
    if (loadedConversations.length > 0) {
      setSelectedConversationId((prev) => prev || loadedConversations[0].id);
    } else {
      setSelectedConversationId("");
      setConversationMessages([]);
    }
  };

  const fetchConversationMessages = async (conversationId: string) => {
    if (!apiBase || !conversationId) return;
    const res = await fetch(`${apiBase}/api/conversations/${conversationId}/messages`);
    const payload = await res.json();
    setConversationMessages(payload.messages ?? []);
  };

  useEffect(() => {
    Promise.all([fetchLocations(), fetchSummary()]).catch(() => setStatus("שגיאה בטעינת סוכנויות"));
  }, []);

  useEffect(() => {
    if (!selectedLocationId) return;
    fetchLocationDetails(selectedLocationId).catch(() => setStatus("שגיאה בטעינת נתוני סוכנות"));
  }, [selectedLocationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    fetchConversationMessages(selectedConversationId).catch(() => setStatus("שגיאה בטעינת הודעות"));
  }, [selectedConversationId]);

  const addAgency = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiBase) {
      setStatus("חסר NEXT_PUBLIC_API_BASE");
      return;
    }

    const res = await fetch(`${apiBase}/api/locations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locationId: addLocationId, alias: addAlias, ghlApiKey: addGhlApiKey })
    });

    if (!res.ok) {
      setStatus("שמירת סוכנות נכשלה");
      return;
    }

    setAddLocationId("");
    setAddAlias("");
    setAddGhlApiKey("");
    setStatus("סוכנות נוספה");
    await Promise.all([fetchLocations(), fetchSummary()]);
    setSelectedLocationId(addLocationId || selectedLocationId);
  };

  const saveSettings = async () => {
    if (!apiBase || !selectedLocationId) return;

    const res = await fetch(`${apiBase}/api/locations/${selectedLocationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings)
    });

    if (!res.ok) {
      setStatus("שמירת הגדרות נכשלה");
      return;
    }

    setStatus("הגדרות נשמרו");
    await fetchLocationDetails(selectedLocationId);
  };

  const sendDemoMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiBase || !selectedLocationId || !demoInput.trim()) return;

    const res = await fetch(`${apiBase}/api/locations/${selectedLocationId}/demo/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: demoConversationId || undefined,
        text: demoInput.trim()
      })
    });

    if (!res.ok) {
      setStatus("שליחת הודעת דמו נכשלה");
      return;
    }

    const payload = await res.json();
    setDemoConversationId(payload.conversationId);
    setDemoMessages(payload.messages ?? []);
    setDemoInput("");
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
      setStatus("שליחת תגובת נציג נכשלה");
      return;
    }

    const payload = await res.json();
    setConversationMessages(payload.messages ?? []);
    setAgentReply("");
    await fetchLocationDetails(selectedLocationId);
  };

  const closeSelectedConversation = async () => {
    if (!apiBase || !selectedConversationId) return;
    const res = await fetch(`${apiBase}/api/conversations/${selectedConversationId}/close`, {
      method: "POST"
    });

    if (!res.ok) {
      setStatus("סגירת שיחה נכשלה");
      return;
    }

    setStatus("השיחה נסגרה");
    await Promise.all([fetchLocationDetails(selectedLocationId), fetchSummary()]);
    if (selectedConversationId) {
      setSelectedConversationId("");
      setConversationMessages([]);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <main dir="rtl" className="console-grid">
      <aside className="panel sidebar">
        <div className="panel-head">
          <h2>סוכנויות</h2>
          <button type="button" className="ghost" onClick={logout}>
            התנתקות
          </button>
        </div>
        <form className="form" onSubmit={addAgency}>
          <input
            value={addLocationId}
            onChange={(event) => setAddLocationId(event.target.value)}
            placeholder="Location ID"
            required
          />
          <input value={addAlias} onChange={(event) => setAddAlias(event.target.value)} placeholder="כינוי סוכנות" />
          <input
            value={addGhlApiKey}
            onChange={(event) => setAddGhlApiKey(event.target.value)}
            placeholder="GHL API Key (אופציונלי)"
          />
          <button type="submit">הוסף סוכנות</button>
        </form>

        <div className="master-snippet">
          <strong>קוד מאסטר</strong>
          <code>{masterSnippet || "הגדר NEXT_PUBLIC_API_BASE"}</code>
        </div>

        <div className="agency-list">
          {locations.map((location) => (
            <button
              type="button"
              key={location.id}
              className={`agency-item ${selectedLocationId === location.id ? "active" : ""}`}
              onClick={() => setSelectedLocationId(location.id)}
            >
              <strong>{location.alias || location.id}</strong>
              <small>{location.id}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="panel center">
        <h2>ניהול בוט לסוכנות</h2>

        <div className="kpis">
          <div className="kpi">
            <strong>{summary?.locations ?? 0}</strong>
            <small>סוכנויות</small>
          </div>
          <div className="kpi">
            <strong>{summary?.openConversations ?? 0}</strong>
            <small>שיחות פתוחות</small>
          </div>
          <div className="kpi">
            <strong>{summary?.handoffConversations ?? 0}</strong>
            <small>שיחות אצל נציג</small>
          </div>
          <div className="kpi">
            <strong>{summary?.last24hMessages ?? 0}</strong>
            <small>הודעות ב-24 שעות</small>
          </div>
        </div>

        {!selectedLocation ? (
          <div className="empty-state">
            <strong>אין סוכנות פעילה כרגע</strong>
            <p>כדי להתחיל: הוסף Location ID בצד ימין ואז בחר את הסוכנות מהרשימה.</p>
          </div>
        ) : null}

        {selectedLocation ? (
          <>
            <div className="section">
              <h3>הגדרות</h3>
              <div className="grid-two">
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
                <label>
                  <span>מצב Handoff</span>
                  <select
                    value={settings.handoffMode}
                    onChange={(event) => setSettings((prev) => ({ ...prev, handoffMode: event.target.value }))}
                  >
                    <option value="on_human_reply">עצירה כשנציג מגיב</option>
                    <option value="manual_only">עצירה ידנית בלבד</option>
                  </select>
                </label>
                <label>
                  <span>GHL API Key</span>
                  <input
                    type="password"
                    value={settings.ghlApiKey}
                    onChange={(event) => setSettings((prev) => ({ ...prev, ghlApiKey: event.target.value }))}
                    placeholder="השאר ריק כדי לא לעדכן"
                  />
                </label>
              </div>
              <label className="textarea-wrap">
                <span>Prompt מערכת</span>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(event) => setSettings((prev) => ({ ...prev, systemPrompt: event.target.value }))}
                  rows={5}
                />
              </label>
              <div className="toggle-row">
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
                <button type="button" onClick={saveSettings}>
                  שמור הגדרות
                </button>
              </div>
            </div>

            <div className="section">
              <h3>קוד הטמעה לסוכנות</h3>
              <code>{selectedEmbedCode || "אין public key לסוכנות זו"}</code>
            </div>

            <div className="section">
              <h3>הדמיית בוט</h3>
              <form className="demo-form" onSubmit={sendDemoMessage}>
                <input
                  value={demoInput}
                  onChange={(event) => setDemoInput(event.target.value)}
                  placeholder="כתוב כאן כדי לבדוק את הבוט"
                />
                <button type="submit">שלח לדמו</button>
              </form>
              <div className="messages demo-messages">
                {demoMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`bubble ${message.authorType === "bot" ? "bot" : "user"}`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
              <div className="widget-preview">
                <iframe title="Widget preview" srcDoc={widgetPreviewDoc} />
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section className="panel inbox">
        <h2>ניהול שיחות נציגים</h2>

        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={`conversation-item ${selectedConversationId === conversation.id ? "active" : ""}`}
              onClick={() => setSelectedConversationId(conversation.id)}
            >
              <strong>{conversation.title || conversation.id}</strong>
              <small>{conversation.status} · {conversation.channel || "web"}</small>
              <small>{conversation.messages?.[0]?.text || "אין הודעות עדיין"}</small>
            </button>
          ))}
        </div>

        <div className="messages">
          {conversationMessages.map((message) => (
            <div key={message.id} className={`bubble ${message.authorType === "human" ? "agent" : message.authorType === "bot" ? "bot" : "user"}`}>
              <strong>{message.senderName || message.authorType}</strong>
              <span>{message.text}</span>
            </div>
          ))}
        </div>

        <form className="agent-form" onSubmit={sendAgentReply}>
          <input
            value={agentReply}
            onChange={(event) => setAgentReply(event.target.value)}
            placeholder="תגובת נציג לשיחה"
          />
          <button type="submit">שלח</button>
          <button type="button" className="ghost" onClick={closeSelectedConversation}>
            סגור שיחה
          </button>
        </form>

        {status ? <p className="status">{status}</p> : null}
      </section>
    </main>
  );
}
