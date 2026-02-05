import { FastifyInstance } from "fastify";

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
  var button = document.createElement('button');
  button.innerText = 'Rushingbot';
  button.style.position = 'fixed';
  button.style.bottom = '24px';
  button.style.right = '24px';
  button.style.zIndex = '9999';
  button.style.background = '#2f5bff';
  button.style.color = '#fff';
  button.style.border = 'none';
  button.style.padding = '12px 16px';
  button.style.borderRadius = '999px';
  button.style.boxShadow = '0 10px 24px rgba(15,23,42,0.2)';
  button.style.fontFamily = 'Arial, sans-serif';
  button.onclick = function(){
    alert('Rushingbot connected. Location: ' + locationKey);
  };
  document.body.appendChild(button);
})();`);
  });
}
