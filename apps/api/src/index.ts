import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import { config } from "./config.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerGhlWebhookRoutes } from "./routes/ghlWebhook.js";
import { registerWhatsappRoutes } from "./routes/whatsapp.js";
import { registerLocationRoutes } from "./routes/locations.js";
import { registerWidgetRoutes } from "./routes/widget.js";
import { registerConversationRoutes } from "./routes/conversations.js";

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL
  }
});

await app.register(cors, { origin: true });
await app.register(formbody);

await registerHealthRoutes(app);
await registerGhlWebhookRoutes(app);
await registerWhatsappRoutes(app);
await registerLocationRoutes(app);
await registerWidgetRoutes(app);
await registerConversationRoutes(app);

app.get("/", async () => ({ name: "rushingbot-api" }));

const port = Number(config.PORT || 8080);
const host = "0.0.0.0";

app.listen({ port, host }).then(() => {
  app.log.info(`API listening on ${host}:${port}`);
});
