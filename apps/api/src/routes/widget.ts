import { FastifyInstance } from "fastify";

export async function registerWidgetRoutes(app: FastifyInstance) {
  app.get("/widget.js", async (request, reply) => {
    const origin = `${request.protocol}://${request.hostname}`;
    reply.header("content-type", "application/javascript; charset=utf-8");
    return reply.send(`(function(){
  var script = document.currentScript;
  var locationKey = script ? script.getAttribute('data-location-key') : null;
  if (!locationKey) {
    console.warn('[Rushingbot] Missing data-location-key');
    return;
  }

  var apiBase = ${JSON.stringify(origin)};
  var state = { locationId: null, conversationId: null };

  var root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.bottom = '24px';
  root.style.right = '24px';
  root.style.zIndex = '99999';
  root.style.fontFamily = 'Assistant, Arial, sans-serif';

  var button = document.createElement('button');
  button.innerText = 'צ׳אט שירות';
  button.style.border = 'none';
  button.style.background = '#2f5bff';
  button.style.color = '#fff';
  button.style.padding = '12px 16px';
  button.style.borderRadius = '999px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 12px 30px rgba(15,23,42,0.25)';

  var panel = document.createElement('div');
  panel.style.width = '340px';
  panel.style.height = '500px';
  panel.style.background = '#fff';
  panel.style.border = '1px solid #dbe2ff';
  panel.style.borderRadius = '16px';
  panel.style.boxShadow = '0 15px 35px rgba(15,23,42,0.18)';
  panel.style.display = 'none';
  panel.style.overflow = 'hidden';
  panel.style.marginTop = '10px';

  var header = document.createElement('div');
  header.style.padding = '12px 14px';
  header.style.background = '#2f5bff';
  header.style.color = 'white';
  header.style.fontWeight = '700';
  header.innerText = 'Rushingbot';

  var messages = document.createElement('div');
  messages.style.height = '390px';
  messages.style.overflow = 'auto';
  messages.style.padding = '12px';
  messages.style.display = 'grid';
  messages.style.gap = '8px';

  var composer = document.createElement('form');
  composer.style.display = 'flex';
  composer.style.gap = '8px';
  composer.style.padding = '10px';
  composer.style.borderTop = '1px solid #e4e7f0';

  var input = document.createElement('input');
  input.placeholder = 'איך אפשר לעזור?';
  input.style.flex = '1';
  input.style.border = '1px solid #d6dbeb';
  input.style.borderRadius = '999px';
  input.style.padding = '8px 12px';

  var send = document.createElement('button');
  send.type = 'submit';
  send.innerText = 'שליחה';
  send.style.border = 'none';
  send.style.borderRadius = '999px';
  send.style.padding = '8px 14px';
  send.style.background = '#2f5bff';
  send.style.color = '#fff';

  function push(text, role) {
    var bubble = document.createElement('div');
    bubble.innerText = text;
    bubble.style.padding = '8px 10px';
    bubble.style.borderRadius = '12px';
    bubble.style.maxWidth = '85%';
    bubble.style.whiteSpace = 'pre-wrap';
    if (role === 'bot') {
      bubble.style.background = '#eef2ff';
      bubble.style.justifySelf = 'start';
    } else {
      bubble.style.background = '#2f5bff';
      bubble.style.color = '#fff';
      bubble.style.justifySelf = 'end';
    }
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  async function bootstrap() {
    try {
      var info = await fetch(apiBase + '/api/widget/location/' + locationKey).then(function(r){ return r.json(); });
      state.locationId = info.locationId;
      if (info.botName) header.innerText = info.botName;
      if (info.themeColor) {
        header.style.background = info.themeColor;
        button.style.background = info.themeColor;
        send.style.background = info.themeColor;
      }
      push('שלום, אני כאן לעזור. אפשר לכתוב כל שאלה.', 'bot');
    } catch (err) {
      push('שגיאה בחיבור לבוט.', 'bot');
    }
  }

  composer.addEventListener('submit', async function(e){
    e.preventDefault();
    var text = input.value.trim();
    if (!text || !state.locationId) return;
    input.value = '';
    push(text, 'user');

    var payload = {
      conversationId: state.conversationId || undefined,
      text: text
    };

    try {
      var res = await fetch(apiBase + '/api/locations/' + state.locationId + '/demo/message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function(r){ return r.json(); });
      state.conversationId = res.conversationId;
      var last = res.messages && res.messages.length ? res.messages[res.messages.length - 1] : null;
      if (last && last.authorType === 'bot') {
        push(last.text || '', 'bot');
      }
    } catch (err) {
      push('לא הצלחתי לשלוח. נסה שוב.', 'bot');
    }
  });

  button.onclick = function(){
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };

  composer.appendChild(input);
  composer.appendChild(send);
  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(composer);
  root.appendChild(button);
  root.appendChild(panel);
  document.body.appendChild(root);

  bootstrap();
})();`);
  });
}
