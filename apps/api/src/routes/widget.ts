import { FastifyInstance } from "fastify";
import { config } from "../config.js";

export async function registerWidgetRoutes(app: FastifyInstance) {
  app.get("/widget.js", async (request, reply) => {
    reply.header("content-type", "application/javascript; charset=utf-8");

    return reply.send(`(function(){
  var script = document.currentScript;
  var locationKey = script ? script.getAttribute('data-location-key') : null;
  if (!locationKey) {
    console.warn('[Rushingbot] Missing data-location-key');
    return;
  }

  var apiBase = ${JSON.stringify(config.APP_BASE_URL)};
  var storageKey = 'rushingbot_conv_' + locationKey;
  var state = {
    locationId: null,
    conversationId: sessionStorage.getItem(storageKey) || '',
    tab: 'home',
    botName: 'Rushingbot',
    alias: '',
    theme: '#2455ff',
    messages: [],
    loading: false
  };

  var root = document.createElement('div');
  root.className = 'rbx-root';
  root.innerHTML = '' +
    '<style>' +
      '.rbx-root{position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:Heebo,Assistant,Arial,sans-serif;color:#0d1b34}' +
      '.rbx-launch{width:56px;height:56px;border:none;border-radius:999px;background:var(--rbx-theme,#2455ff);box-shadow:0 14px 34px rgba(13,27,52,.3);color:#fff;font-size:26px;cursor:pointer}' +
      '.rbx-panel{width:390px;max-width:calc(100vw - 24px);height:760px;max-height:calc(100vh - 34px);border:1px solid #d5dff2;border-radius:28px;background:#fff;box-shadow:0 24px 54px rgba(13,27,52,.24);display:none;overflow:hidden}' +
      '.rbx-panel.open{display:grid;grid-template-rows:auto 1fr auto}' +
      '.rbx-head{padding:16px 18px;background:linear-gradient(180deg,var(--rbx-theme,#2455ff),#132f66);color:#fff;display:grid;gap:12px}' +
      '.rbx-head-top{display:flex;align-items:center;justify-content:space-between;gap:10px}' +
      '.rbx-avatars{display:flex;gap:6px}' +
      '.rbx-avatars span{width:28px;height:28px;border-radius:999px;background:rgba(255,255,255,.22);display:inline-grid;place-items:center;font-size:14px}' +
      '.rbx-close{width:30px;height:30px;border:none;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;cursor:pointer}' +
      '.rbx-head h3{margin:0;font-size:32px;line-height:1.1;letter-spacing:-.4px}' +
      '.rbx-head p{margin:0;color:rgba(255,255,255,.86);font-size:15px}' +
      '.rbx-main{overflow:auto;background:#f6f8fd;padding:14px 14px 18px}' +
      '.rbx-card{border:1px solid #dde5f5;border-radius:16px;background:#fff;padding:14px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer}' +
      '.rbx-card strong{font-size:18px}' +
      '.rbx-card small{display:block;color:#62718e;font-size:13px;margin-top:3px}' +
      '.rbx-icon{width:28px;height:28px;border-radius:999px;background:#edf2ff;color:#2a4a98;display:grid;place-items:center}' +
      '.rbx-section{border:1px solid #dde5f5;border-radius:16px;background:#fff;padding:14px;margin-bottom:10px}' +
      '.rbx-section h4{margin:0 0 8px;font-size:24px}' +
      '.rbx-chip-wrap{display:flex;flex-wrap:wrap;gap:8px}' +
      '.rbx-chip{border:1px solid #dde5f5;border-radius:999px;background:#fff;padding:8px 12px;cursor:pointer;font-size:14px}' +
      '.rbx-task{border:1px solid #e0e7f6;border-radius:14px;background:#fff;padding:12px;margin-bottom:10px}' +
      '.rbx-task-head{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px}' +
      '.rbx-step{width:26px;height:26px;border-radius:999px;background:#eef3ff;color:#2c4e99;display:grid;place-items:center;font-weight:700}' +
      '.rbx-task p{margin:8px 0 0;color:#5e6c86;font-size:14px}' +
      '.rbx-msg-item{border-bottom:1px solid #edf2fb;padding:10px 0;display:grid;gap:4px}' +
      '.rbx-msg-item:last-child{border-bottom:none}' +
      '.rbx-msg-item strong{font-size:16px}' +
      '.rbx-msg-item small{color:#64728d}' +
      '.rbx-chat-wrap{display:grid;grid-template-rows:1fr auto;height:100%}' +
      '.rbx-chat{border:1px solid #dbe4f5;border-radius:16px;background:#fff;padding:12px;overflow:auto;display:grid;gap:8px;min-height:280px}' +
      '.rbx-bubble{max-width:86%;border-radius:12px;padding:8px 10px;white-space:pre-wrap;line-height:1.34;display:grid;gap:3px}' +
      '.rbx-bubble.bot{justify-self:start;background:#ebf1ff;color:#173a93}' +
      '.rbx-bubble.user{justify-self:end;background:var(--rbx-theme,#2455ff);color:#fff}' +
      '.rbx-bubble small{font-size:11px;opacity:.8}' +
      '.rbx-compose{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}' +
      '.rbx-compose input{border:1px solid #d8e2f3;border-radius:999px;padding:10px 14px;font-size:15px}' +
      '.rbx-send{border:none;border-radius:999px;padding:10px 16px;background:var(--rbx-theme,#2455ff);color:#fff;cursor:pointer}' +
      '.rbx-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #e0e8f7;background:#fff}' +
      '.rbx-nav button{border:none;background:#fff;padding:11px 4px;display:grid;gap:2px;place-items:center;color:#5f6e89;font-size:12px;cursor:pointer}' +
      '.rbx-nav button.active{color:#173f9d;font-weight:700}' +
      '.rbx-pill{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:999px;background:#edf2ff;color:#2a4b99;font-size:11px}' +
      '.rbx-empty{border:1px dashed #cad7f0;border-radius:12px;background:#f8fbff;color:#5f6d87;padding:12px;text-align:center}' +
      '.rbx-loading{display:grid;place-items:center;height:100%;color:#5f6d87}' +
      '@media(max-width:640px){.rbx-root{bottom:8px;right:8px}.rbx-panel{width:calc(100vw - 16px);height:calc(100vh - 16px)}}' +
    '</style>' +
    '<button class="rbx-launch" aria-label="Open support">⌄</button>' +
    '<section class="rbx-panel" dir="rtl" aria-live="polite">' +
      '<header class="rbx-head">' +
        '<div class="rbx-head-top">' +
          '<button class="rbx-close" data-action="close">✕</button>' +
          '<div class="rbx-avatars"><span>👩🏽</span><span>👨🏻</span><span>👩🏼</span></div>' +
        '</div>' +
        '<div><h3 id="rbx-title">שלום, איך אפשר לעזור?</h3><p id="rbx-sub">שירות לקוחות חכם 24/7</p></div>' +
      '</header>' +
      '<main class="rbx-main" id="rbx-main"></main>' +
      '<nav class="rbx-nav">' +
        '<button data-tab="home">🏠<span>Home</span></button>' +
        '<button data-tab="tasks">✅<span>Tasks</span></button>' +
        '<button data-tab="messages">💬<span>Messages</span></button>' +
        '<button data-tab="help">❔<span>Help</span></button>' +
      '</nav>' +
    '</section>';

  document.body.appendChild(root);

  var panel = root.querySelector('.rbx-panel');
  var launch = root.querySelector('.rbx-launch');
  var main = root.querySelector('#rbx-main');
  var title = root.querySelector('#rbx-title');
  var sub = root.querySelector('#rbx-sub');

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function nowText() {
    var date = new Date();
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
  }

  function setTheme() {
    root.style.setProperty('--rbx-theme', state.theme || '#2455ff');
  }

  function setActiveNav() {
    var buttons = root.querySelectorAll('.rbx-nav button');
    buttons.forEach(function(btn){
      if (btn.getAttribute('data-tab') === state.tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function renderHome() {
    main.innerHTML = '' +
      '<section class="rbx-card" data-action="open-chat">' +
        '<div><strong>כתבו לנו</strong><small>שירות מהיר בצ׳אט</small></div><span class="rbx-icon">➤</span>' +
      '</section>' +
      '<section class="rbx-card" data-tab-jump="tasks">' +
        '<div><strong>צ׳קליסט התחברות</strong><small>השלמת הקמה ב-10 דקות</small></div><span class="rbx-icon">✓</span>' +
      '</section>' +
      '<section class="rbx-card" data-tab-jump="help">' +
        '<div><strong>חיפוש עזרה</strong><small>מאמרים והסברים מהירים</small></div><span class="rbx-icon">🔎</span>' +
      '</section>' +
      '<section class="rbx-section"><h4>אפשר לעזור לך גם ב...</h4>' +
        '<div class="rbx-chip-wrap">' +
          '<button class="rbx-chip" data-quick="יש לי תקלה בחיוב">תקלה בחיוב</button>' +
          '<button class="rbx-chip" data-quick="איך מעבירים לנציג?">העברה לנציג</button>' +
          '<button class="rbx-chip" data-quick="איך מחברים GHL?">חיבור GHL</button>' +
          '<button class="rbx-chip" data-quick="אני רוצה לדבר בוואטסאפ">מעבר לוואטסאפ</button>' +
        '</div>' +
      '</section>';
  }

  function renderTasks() {
    main.innerHTML = '' +
      '<section class="rbx-section">' +
        '<h4>Getting Started Checklist</h4>' +
        '<small class="rbx-pill">כ-10 דקות</small>' +
      '</section>' +
      '<article class="rbx-task"><div class="rbx-task-head"><span class="rbx-step">1</span><span>חיבור סוכנות</span></div><p>הגדרת Location ID ויצירת בוט ראשון.</p></article>' +
      '<article class="rbx-task"><div class="rbx-task-head"><span class="rbx-step">2</span><span>הוספת מקורות ידע</span></div><p>PDF, דפי נחיתה, שאלות נפוצות ותשובות.</p></article>' +
      '<article class="rbx-task"><div class="rbx-task-head"><span class="rbx-step">3</span><span>חיבור ערוצים</span></div><p>אימייל ו-WhatsApp לרצף שיחה אחיד.</p></article>' +
      '<article class="rbx-task"><div class="rbx-task-head"><span class="rbx-step">4</span><span>בדיקת אינבוקס</span></div><p>וידוא handoff לנציגים וסגירת פניות.</p></article>';
  }

  function renderMessages() {
    var recent = state.messages.slice(-6).reverse();
    if (recent.length === 0) {
      main.innerHTML = '' +
        '<section class="rbx-section">' +
          '<h4>Messages</h4>' +
          '<div class="rbx-empty">עדיין אין שיחות פעילות. לחץ "Send us a message" כדי להתחיל.</div>' +
        '</section>' +
        '<section class="rbx-card" data-action="open-chat"><div><strong>Send us a message</strong><small>התחלת שיחה חדשה</small></div><span class="rbx-icon">➤</span></section>';
      return;
    }

    var listHtml = recent.map(function(item){
      var who = item.authorType === 'bot' ? state.botName : (item.senderName || 'לקוח');
      return '<div class="rbx-msg-item"><strong>' + esc(who) + '</strong><small>' + esc(item.text || '') + '</small></div>';
    }).join('');

    main.innerHTML = '' +
      '<section class="rbx-section">' +
        '<h4>Messages</h4>' +
        listHtml +
      '</section>' +
      '<section class="rbx-card" data-action="open-chat"><div><strong>המשך שיחה</strong><small>מעבר לצ׳אט הפעיל</small></div><span class="rbx-icon">➤</span></section>';
  }

  function renderHelp() {
    main.innerHTML = '' +
      '<section class="rbx-section">' +
        '<h4>Help Center</h4>' +
        '<div class="rbx-chip-wrap">' +
          '<button class="rbx-chip" data-quick="איך מחברים את הבוט לאתר?">הטמעת ווידג׳ט</button>' +
          '<button class="rbx-chip" data-quick="איך מעבירים שיחה לנציג?">ניהול handoff</button>' +
          '<button class="rbx-chip" data-quick="איך מגדירים מייל תמיכה?">הגדרת אימייל</button>' +
          '<button class="rbx-chip" data-quick="איך בוחרים מודל OpenAI?">בחירת מודל</button>' +
        '</div>' +
      '</section>' +
      '<section class="rbx-card" data-action="open-chat"><div><strong>לא מצאת תשובה?</strong><small>כתוב לנו ונענה מיד</small></div><span class="rbx-icon">💬</span></section>';
  }

  function renderChat() {
    var bubbles = state.messages.map(function(item){
      var kind = item.authorType === 'bot' ? 'bot' : 'user';
      var who = item.authorType === 'bot' ? state.botName : (item.senderName || 'לקוח');
      return '<article class="rbx-bubble ' + kind + '"><strong>' + esc(who) + '</strong><span>' + esc(item.text || '') + '</span><small>' + nowText() + '</small></article>';
    }).join('');

    if (!bubbles) {
      bubbles = '<article class="rbx-bubble bot"><strong>' + esc(state.botName) + '</strong><span>שלום, איך אפשר לעזור היום?</span></article>';
    }

    main.innerHTML = '' +
      '<section class="rbx-chat-wrap">' +
        '<div class="rbx-chat" id="rbx-chat">' + bubbles + '</div>' +
        '<form class="rbx-compose" id="rbx-compose">' +
          '<input id="rbx-input" placeholder="כתוב הודעה..." autocomplete="off" />' +
          '<button class="rbx-send" type="submit">שלח</button>' +
        '</form>' +
      '</section>';

    var chat = main.querySelector('#rbx-chat');
    if (chat) {
      chat.scrollTop = chat.scrollHeight;
    }
  }

  function render() {
    setActiveNav();
    if (state.loading) {
      main.innerHTML = '<div class="rbx-loading">טוען...</div>';
      return;
    }

    if (state.tab === 'home') renderHome();
    else if (state.tab === 'tasks') renderTasks();
    else if (state.tab === 'messages') renderMessages();
    else if (state.tab === 'help') renderHelp();
    else renderChat();
  }

  async function loadConversation() {
    if (!state.conversationId) return;
    try {
      var response = await fetch(apiBase + '/api/conversations/' + state.conversationId + '/messages');
      if (!response.ok) {
        state.conversationId = '';
        sessionStorage.removeItem(storageKey);
        return;
      }
      var payload = await response.json();
      state.messages = payload.messages || [];
    } catch (error) {
      state.conversationId = '';
      sessionStorage.removeItem(storageKey);
    }
  }

  async function sendMessage(text) {
    if (!text || !state.locationId) return;

    state.messages.push({ authorType: 'customer', text: text, senderName: 'לקוח' });
    render();

    try {
      var response = await fetch(apiBase + '/api/locations/' + state.locationId + '/demo/message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conversationId: state.conversationId || undefined,
          text: text
        })
      });

      if (!response.ok) {
        var failed = await response.json().catch(function(){ return {}; });
        state.messages.push({ authorType: 'bot', text: failed.message || 'אירעה שגיאה, נסה שוב.' });
        render();
        return;
      }

      var payload = await response.json();
      state.conversationId = payload.conversationId || state.conversationId;
      if (state.conversationId) {
        sessionStorage.setItem(storageKey, state.conversationId);
      }
      state.messages = payload.messages || state.messages;
      render();
    } catch (error) {
      state.messages.push({ authorType: 'bot', text: 'לא הצלחתי לשלוח כרגע. נסה שוב בעוד רגע.' });
      render();
    }
  }

  async function bootstrap() {
    state.loading = true;
    render();

    try {
      var response = await fetch(apiBase + '/api/widget/location/' + locationKey);
      if (!response.ok) throw new Error('location not found');
      var location = await response.json();
      state.locationId = location.locationId;
      state.botName = location.botName || state.botName;
      state.alias = location.alias || '';
      state.theme = location.themeColor || state.theme;

      title.textContent = 'שלום ' + (state.alias || '') + ', איך אפשר לעזור?';
      sub.textContent = 'שירות לקוחות רציף בכל הערוצים';
      setTheme();
      await loadConversation();
    } catch (error) {
      state.messages = [{ authorType: 'bot', text: 'שגיאה בחיבור למערכת. נסה שוב מאוחר יותר.' }];
      state.tab = 'chat';
    }

    state.loading = false;
    render();
  }

  launch.addEventListener('click', function(){
    panel.classList.toggle('open');
  });

  root.addEventListener('click', function(event){
    var target = event.target;
    if (!(target instanceof HTMLElement)) return;

    var closeBtn = target.closest('[data-action="close"]');
    if (closeBtn) {
      panel.classList.remove('open');
      return;
    }

    var action = target.closest('[data-action]');
    if (action) {
      var actionName = action.getAttribute('data-action');
      if (actionName === 'open-chat') {
        state.tab = 'chat';
        render();
      }
      return;
    }

    var quick = target.closest('[data-quick]');
    if (quick) {
      state.tab = 'chat';
      render();
      sendMessage(quick.getAttribute('data-quick') || '');
      return;
    }

    var jump = target.closest('[data-tab-jump]');
    if (jump) {
      state.tab = jump.getAttribute('data-tab-jump') || 'home';
      render();
      return;
    }

    var navTab = target.closest('[data-tab]');
    if (navTab) {
      state.tab = navTab.getAttribute('data-tab') || 'home';
      render();
    }
  });

  root.addEventListener('submit', function(event){
    var form = event.target;
    if (!(form instanceof HTMLElement)) return;
    if (form.id !== 'rbx-compose') return;
    event.preventDefault();

    var input = main.querySelector('#rbx-input');
    if (!(input instanceof HTMLInputElement)) return;
    var value = input.value.trim();
    if (!value) return;
    input.value = '';
    sendMessage(value);
  });

  bootstrap();
})();`);
  });
}
