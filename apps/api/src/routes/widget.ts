import { FastifyInstance } from "fastify";
import { config } from "../config.js";

export async function registerWidgetRoutes(app: FastifyInstance) {
  app.get("/widget.js", async (_request, reply) => {
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
  var pollTimer = null;

  var state = {
    locationId: null,
    conversationId: sessionStorage.getItem(storageKey) || '',
    conversationStatus: 'open',
    tab: 'home',
    open: false,
    loading: false,
    sending: false,
    botName: 'Rushingbot',
    alias: '',
    theme: '#2455ff',
    messages: [],
    unread: 0,
    seenMessageCount: 0,
    notice: ''
  };

  var root = document.createElement('div');
  root.className = 'rbx-root';
  root.innerHTML = '' +
    '<style>' +
      '.rbx-root{position:fixed;bottom:18px;right:18px;z-index:2147483000;font-family:Heebo,Assistant,Arial,sans-serif;direction:rtl;color:#0f1f3d}' +
      '.rbx-stack{display:grid;gap:10px;justify-items:end}' +
      '.rbx-nudge{max-width:290px;border:1px solid #d9e3f5;border-radius:14px;background:#fff;box-shadow:0 16px 38px rgba(17,34,74,.18);padding:10px 12px;font-size:13px;color:#4e5e7d;opacity:0;transform:translateY(8px);pointer-events:none;transition:.25s ease}' +
      '.rbx-nudge.show{opacity:1;transform:translateY(0)}' +
      '.rbx-launch{position:relative;width:58px;height:58px;border:none;border-radius:999px;background:var(--rbx-theme,#2455ff);box-shadow:0 14px 34px rgba(13,27,52,.3);color:#fff;font-size:25px;cursor:pointer;display:grid;place-items:center}' +
      '.rbx-launch-badge{position:absolute;top:-4px;left:-2px;min-width:20px;height:20px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;display:none;place-items:center;padding:0 6px;border:2px solid #fff}' +
      '.rbx-panel{width:396px;max-width:calc(100vw - 20px);height:760px;max-height:calc(100vh - 30px);border:1px solid #d6e0f4;border-radius:28px;background:#fff;box-shadow:0 28px 62px rgba(13,27,52,.25);display:grid;grid-template-rows:auto 1fr auto;overflow:hidden;opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:.26s ease}' +
      '.rbx-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}' +
      '.rbx-head{padding:16px 16px 14px;background:linear-gradient(180deg,var(--rbx-theme,#2455ff),#133370);color:#fff;display:grid;gap:10px}' +
      '.rbx-head-top{display:flex;align-items:center;justify-content:space-between}' +
      '.rbx-avatar-row{display:flex;gap:6px}' +
      '.rbx-avatar-row span{width:27px;height:27px;border-radius:999px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:13px}' +
      '.rbx-close{width:30px;height:30px;border:none;border-radius:999px;background:rgba(255,255,255,.2);color:#fff;cursor:pointer}' +
      '.rbx-head h3{margin:0;font-size:26px;line-height:1.12;letter-spacing:-.2px}' +
      '.rbx-head p{margin:0;color:rgba(255,255,255,.87);font-size:14px}' +
      '.rbx-main{overflow:auto;background:#f5f8ff;padding:12px}' +
      '.rbx-card{border:1px solid #dce6f6;border-radius:16px;background:#fff;padding:14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;transition:.16s ease}' +
      '.rbx-card:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(22,46,90,.08)}' +
      '.rbx-card strong{font-size:21px;color:#102445}' +
      '.rbx-card small{display:block;color:#647490;font-size:13px;margin-top:3px}' +
      '.rbx-icon{width:30px;height:30px;border-radius:999px;background:#edf3ff;color:#2b4f9d;display:grid;place-items:center}' +
      '.rbx-section{border:1px solid #dce6f6;border-radius:16px;background:#fff;padding:12px;margin-bottom:10px}' +
      '.rbx-section h4{margin:0 0 9px;font-size:22px}' +
      '.rbx-chip-wrap{display:flex;flex-wrap:wrap;gap:8px}' +
      '.rbx-chip{border:1px solid #dbe5f6;border-radius:999px;background:#fff;padding:7px 12px;cursor:pointer;font-size:14px;color:#193f94}' +
      '.rbx-chip:hover{background:#eef3ff}' +
      '.rbx-task{border:1px solid #e0e8f7;border-radius:14px;background:#fff;padding:11px;margin-bottom:9px}' +
      '.rbx-task-head{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700}' +
      '.rbx-step{width:25px;height:25px;border-radius:999px;background:#edf3ff;color:#2a4f99;display:grid;place-items:center;font-weight:700;font-size:12px}' +
      '.rbx-task p{margin:8px 0 0;color:#5f6e8a;font-size:14px}' +
      '.rbx-pill{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:999px;background:#edf3ff;color:#2a4f99;font-size:11px}' +
      '.rbx-msg-item{border-bottom:1px solid #edf2fa;padding:9px 0;display:grid;gap:4px}' +
      '.rbx-msg-item:last-child{border-bottom:none}' +
      '.rbx-msg-item strong{font-size:16px}' +
      '.rbx-msg-item small{color:#64738e}' +
      '.rbx-chat-wrap{display:grid;grid-template-rows:auto 1fr auto;gap:8px;height:100%}' +
      '.rbx-chat-status{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #dbe5f6;border-radius:12px;padding:8px 10px;font-size:12px;color:#4f5f7d}' +
      '.rbx-chat{border:1px solid #dbe5f6;border-radius:16px;background:#fff;padding:11px;overflow:auto;display:grid;gap:8px;min-height:290px}' +
      '.rbx-bubble{max-width:86%;border-radius:12px;padding:8px 10px;white-space:pre-wrap;line-height:1.35;display:grid;gap:3px}' +
      '.rbx-bubble.bot{justify-self:start;background:#ecf2ff;color:#163b96}' +
      '.rbx-bubble.user{justify-self:end;background:var(--rbx-theme,#2455ff);color:#fff}' +
      '.rbx-bubble.human{justify-self:start;background:#e7f8ef;color:#0a694d;border:1px solid #bfe8d4}' +
      '.rbx-bubble small{font-size:11px;opacity:.82}' +
      '.rbx-compose{display:grid;grid-template-columns:1fr auto;gap:8px}' +
      '.rbx-compose input{border:1px solid #d8e2f4;border-radius:999px;padding:10px 14px;font-size:15px}' +
      '.rbx-send{border:none;border-radius:999px;padding:10px 16px;background:var(--rbx-theme,#2455ff);color:#fff;cursor:pointer}' +
      '.rbx-send:disabled{opacity:.65;cursor:not-allowed}' +
      '.rbx-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #dfe8f8;background:#fff}' +
      '.rbx-nav button{position:relative;border:none;background:#fff;padding:10px 4px;display:grid;gap:3px;place-items:center;color:#64738e;font-size:12px;cursor:pointer}' +
      '.rbx-nav button.active{color:#193f95;font-weight:700}' +
      '.rbx-nav-badge{position:absolute;top:7px;left:31%;min-width:16px;height:16px;border-radius:999px;background:#ef4444;color:#fff;font-size:10px;display:none;place-items:center;padding:0 4px}' +
      '.rbx-empty{border:1px dashed #c9d7f0;border-radius:12px;background:#f8fbff;color:#5d6d89;padding:12px;text-align:center}' +
      '.rbx-loading{display:grid;place-items:center;height:100%;color:#5f6d87}' +
      '@media(max-width:640px){.rbx-root{bottom:8px;right:8px}.rbx-panel{width:calc(100vw - 16px);height:calc(100vh - 16px)}.rbx-head h3{font-size:23px}}' +
    '</style>' +
    '<div class="rbx-stack">' +
      '<div class="rbx-nudge" id="rbx-nudge">יש לנו עדכונים חדשים בשבילך</div>' +
      '<button class="rbx-launch" aria-label="Open support">⌄<span class="rbx-launch-badge" id="rbx-launch-badge">0</span></button>' +
      '<section class="rbx-panel" aria-live="polite">' +
        '<header class="rbx-head">' +
          '<div class="rbx-head-top">' +
            '<button class="rbx-close" data-action="close">✕</button>' +
            '<div class="rbx-avatar-row"><span>👩🏽</span><span>👨🏻</span><span>👩🏼</span></div>' +
          '</div>' +
          '<div><h3 id="rbx-title">שלום, איך אפשר לעזור?</h3><p id="rbx-sub">שירות לקוחות רציף בכל הערוצים</p></div>' +
        '</header>' +
        '<main class="rbx-main" id="rbx-main"></main>' +
        '<nav class="rbx-nav">' +
          '<button data-tab="home">🏠<span>בית</span></button>' +
          '<button data-tab="tasks">✅<span>משימות</span></button>' +
          '<button data-tab="messages">💬<span>Messages</span><span class="rbx-nav-badge" id="rbx-nav-badge">0</span></button>' +
          '<button data-tab="help">❔<span>עזרה</span></button>' +
        '</nav>' +
      '</section>' +
    '</div>';

  document.body.appendChild(root);

  var panel = root.querySelector('.rbx-panel');
  var launch = root.querySelector('.rbx-launch');
  var launchBadge = root.querySelector('#rbx-launch-badge');
  var nudge = root.querySelector('#rbx-nudge');
  var main = root.querySelector('#rbx-main');
  var title = root.querySelector('#rbx-title');
  var sub = root.querySelector('#rbx-sub');
  var navBadge = root.querySelector('#rbx-nav-badge');

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function nowText() {
    var d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  function setTheme() {
    root.style.setProperty('--rbx-theme', state.theme || '#2455ff');
  }

  function setUnread(count) {
    state.unread = Math.max(0, count || 0);
    var text = state.unread > 99 ? '99+' : String(state.unread);
    if (launchBadge) {
      launchBadge.textContent = text;
      launchBadge.style.display = state.unread > 0 ? 'grid' : 'none';
    }
    if (navBadge) {
      navBadge.textContent = text;
      navBadge.style.display = state.unread > 0 ? 'grid' : 'none';
    }
  }

  function showNudge(text) {
    if (!nudge) return;
    nudge.textContent = text;
    nudge.classList.add('show');
    setTimeout(function(){
      nudge.classList.remove('show');
    }, 2600);
  }

  function setActiveNav() {
    var buttons = root.querySelectorAll('.rbx-nav button');
    buttons.forEach(function(btn){
      if (btn.getAttribute('data-tab') === state.tab) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function renderHome() {
    main.innerHTML = '' +
      '<section class="rbx-card" data-action="open-chat"><div><strong>כתבו לנו</strong><small>צוות השירות זמין בצ׳אט</small></div><span class="rbx-icon">➤</span></section>' +
      '<section class="rbx-card" data-tab-jump="tasks"><div><strong>צ׳קליסט התחברות</strong><small>השלמת הקמה ב-10 דקות</small></div><span class="rbx-icon">✓</span></section>' +
      '<section class="rbx-card" data-tab-jump="help"><div><strong>חיפוש עזרה</strong><small>מאמרים ותשובות מהירות</small></div><span class="rbx-icon">🔎</span></section>' +
      '<section class="rbx-section"><h4>אפשר לעזור גם בנושא:</h4><div class="rbx-chip-wrap">' +
        '<button class="rbx-chip" data-quick="יש לי תקלה בחיוב">תקלה בחיוב</button>' +
        '<button class="rbx-chip" data-quick="תעבירו אותי לנציג">העברה לנציג</button>' +
        '<button class="rbx-chip" data-quick="איך מחברים GHL?">חיבור GHL</button>' +
        '<button class="rbx-chip" data-quick="אני רוצה לעבור לוואטסאפ">מעבר לוואטסאפ</button>' +
      '</div></section>';
  }

  function renderTasks() {
    main.innerHTML = '' +
      '<section class="rbx-section"><h4>Checklist</h4><small class="rbx-pill">כ-10 דקות</small></section>' +
      '<article class="rbx-task"><div class="rbx-task-head"><span class="rbx-step">1</span><span>יצירת בוט לסוכנות</span></div><p>בחירת Location והגדרות בסיס.</p></article>' +
      '<article class="rbx-task"><div class="rbx-task-head"><span class="rbx-step">2</span><span>הוספת מקורות ידע</span></div><p>PDF, FAQ ודפי אתר רלוונטיים.</p></article>' +
      '<article class="rbx-task"><div class="rbx-task-head"><span class="rbx-step">3</span><span>חיבור ערוצים</span></div><p>אימייל ו-WhatsApp לרצף שיחה.</p></article>' +
      '<article class="rbx-task"><div class="rbx-task-head"><span class="rbx-step">4</span><span>בדיקת handoff</span></div><p>ווידוא העברה לנציג וחזרה לבוט.</p></article>';
  }

  function renderMessages() {
    var recent = state.messages.slice(-8).reverse();
    if (recent.length === 0) {
      main.innerHTML = '' +
        '<section class="rbx-section"><h4>Messages</h4><div class="rbx-empty">אין עדיין הודעות. לחץ "כתבו לנו" כדי להתחיל.</div></section>' +
        '<section class="rbx-card" data-action="open-chat"><div><strong>Send us a message</strong><small>פתיחת שיחה חדשה</small></div><span class="rbx-icon">➤</span></section>';
      return;
    }

    var items = recent.map(function(item){
      var who = item.authorType === 'bot' ? state.botName : item.authorType === 'human' ? 'נציג' : (item.senderName || 'לקוח');
      return '<div class="rbx-msg-item"><strong>' + esc(who) + '</strong><small>' + esc(item.text || '') + '</small></div>';
    }).join('');

    main.innerHTML = '' +
      '<section class="rbx-section"><h4>Messages</h4>' + items + '</section>' +
      '<section class="rbx-card" data-action="open-chat"><div><strong>המשך שיחה</strong><small>מעבר לצ׳אט הפעיל</small></div><span class="rbx-icon">➤</span></section>';
  }

  function renderHelp() {
    main.innerHTML = '' +
      '<section class="rbx-section"><h4>מרכז עזרה</h4><div class="rbx-chip-wrap">' +
        '<button class="rbx-chip" data-quick="איך מחברים את הבוט לאתר?">הטמעת ווידג׳ט</button>' +
        '<button class="rbx-chip" data-quick="איך מעבירים שיחה לנציג?">ניהול handoff</button>' +
        '<button class="rbx-chip" data-quick="איך מגדירים מייל תמיכה?">הגדרת אימייל</button>' +
        '<button class="rbx-chip" data-quick="איך בוחרים מודל OpenAI?">בחירת מודל</button>' +
      '</div></section>' +
      '<section class="rbx-card" data-action="open-chat"><div><strong>לא מצאת תשובה?</strong><small>שלח הודעה ונעזור מיד</small></div><span class="rbx-icon">💬</span></section>';
  }

  function renderChat() {
    var bubbles = state.messages.map(function(item){
      var kind = item.authorType === 'bot' ? 'bot' : item.authorType === 'human' ? 'human' : 'user';
      var who = item.authorType === 'bot' ? state.botName : item.authorType === 'human' ? 'Agent Console' : (item.senderName || 'Client');
      return '<article class="rbx-bubble ' + kind + '"><strong>' + esc(who) + '</strong><span>' + esc(item.text || '') + '</span><small>' + nowText() + '</small></article>';
    }).join('');

    if (!bubbles) {
      bubbles = '<article class="rbx-bubble bot"><strong>' + esc(state.botName) + '</strong><span>שלום, איך אפשר לעזור היום?</span></article>';
    }

    var handoffText = state.conversationStatus === 'handoff'
      ? '<span class="rbx-pill">נציג מחובר לשיחה</span>'
      : '<span class="rbx-pill">מענה אוטומטי פעיל</span>';

    main.innerHTML = '' +
      '<section class="rbx-chat-wrap">' +
        '<div class="rbx-chat-status"><span>' + handoffText + '</span><span>' + (state.notice ? esc(state.notice) : '') + '</span></div>' +
        '<div class="rbx-chat" id="rbx-chat">' + bubbles + '</div>' +
        '<form class="rbx-compose" id="rbx-compose">' +
          '<input id="rbx-input" placeholder="כתוב הודעה..." autocomplete="off" />' +
          '<button class="rbx-send" type="submit" ' + (state.sending ? 'disabled' : '') + '>' + (state.sending ? 'שולח...' : 'שלח') + '</button>' +
        '</form>' +
      '</section>';

    var chat = main.querySelector('#rbx-chat');
    if (chat) chat.scrollTop = chat.scrollHeight;
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

  async function syncConversation() {
    if (!state.conversationId) return;

    try {
      var response = await fetch(apiBase + '/api/conversations/' + state.conversationId + '/messages');
      if (!response.ok) return;
      var payload = await response.json();
      var nextMessages = payload.messages || [];
      var previousCount = state.messages.length;

      state.messages = nextMessages;
      state.conversationStatus = payload.conversation && payload.conversation.status ? payload.conversation.status : 'open';

      if (nextMessages.length > previousCount) {
        var delta = nextMessages.length - previousCount;
        if (!state.open || state.tab !== 'chat') {
          setUnread(state.unread + delta);
          showNudge('יש הודעות חדשות בשיחה');
        }
      }

      state.seenMessageCount = nextMessages.length;
      render();
    } catch (error) {
      // silent polling failure
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(syncConversation, 3500);
  }

  async function sendMessage(text) {
    if (!text || !state.locationId || state.sending) return;
    state.sending = true;

    state.messages.push({ authorType: 'customer', text: text, senderName: 'Client' });
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
        state.notice = failed.message || 'אירעה שגיאה, נסה שוב.';
        state.messages.push({ authorType: 'bot', text: state.notice });
        state.sending = false;
        render();
        return;
      }

      var payload = await response.json();
      state.conversationId = payload.conversationId || state.conversationId;
      if (state.conversationId) sessionStorage.setItem(storageKey, state.conversationId);
      state.messages = payload.messages || state.messages;
      state.notice = '';
      state.sending = false;
      render();
    } catch (error) {
      state.notice = 'לא הצלחתי לשלוח כרגע. נסה שוב בעוד רגע.';
      state.messages.push({ authorType: 'bot', text: state.notice });
      state.sending = false;
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

      if (title) title.textContent = 'שלום, איך אפשר לעזור?';
      if (sub) sub.textContent = 'שירות לקוחות רציף בכל הערוצים';
      setTheme();

      await syncConversation();
      state.loading = false;
      render();
      startPolling();

      if (!state.conversationId) {
        showNudge('יש לנו תשובות מהירות שמוכנות עבורך');
      }
    } catch (error) {
      state.loading = false;
      state.tab = 'chat';
      state.messages = [{ authorType: 'bot', text: 'שגיאה בחיבור למערכת. נסה שוב מאוחר יותר.' }];
      render();
    }
  }

  launch.addEventListener('click', function(){
    state.open = !state.open;
    if (state.open) {
      panel.classList.add('open');
      setUnread(0);
      if (state.tab === 'messages') {
        state.tab = 'chat';
      }
      render();
    } else {
      panel.classList.remove('open');
    }
  });

  root.addEventListener('click', function(event){
    var target = event.target;
    if (!(target instanceof HTMLElement)) return;

    var closeBtn = target.closest('[data-action="close"]');
    if (closeBtn) {
      state.open = false;
      panel.classList.remove('open');
      return;
    }

    var action = target.closest('[data-action]');
    if (action) {
      var actionName = action.getAttribute('data-action');
      if (actionName === 'open-chat') {
        state.tab = 'chat';
        setUnread(0);
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
      if (state.tab === 'messages') {
        state.tab = 'chat';
      }
      setUnread(0);
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
