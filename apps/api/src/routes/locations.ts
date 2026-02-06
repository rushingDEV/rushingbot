import crypto from "node:crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { generateBotReply } from "../services/bot.js";
import { getGhlStatus, getOpenAiStatus } from "../services/integrations.js";
import {
  createDemoConversation,
  listConversationMessages,
  listConversationsByLocation,
  saveMessage
} from "../services/messages.js";
import {
  getLocationById,
  getLocationByPublicKey,
  listLocations,
  updateLocationSettings,
  upsertLocation
} from "../services/locations.js";

const createSchema = z.object({
  locationId: z.string().min(1),
  alias: z.string().min(1).optional(),
  ghlApiKey: z.string().min(1).optional(),
  botName: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  openaiModel: z.string().min(1).optional(),
  openaiTemperature: z.number().min(0).max(1).optional(),
  supportEmail: z.string().min(1).optional(),
  supportWhatsapp: z.string().min(1).optional()
});

const updateSchema = z.object({
  alias: z.string().min(1).optional(),
  botEnabled: z.boolean().optional(),
  botName: z.string().min(1).optional(),
  systemPrompt: z.string().optional(),
  openaiModel: z.string().min(1).optional(),
  openaiTemperature: z.number().min(0).max(1).optional(),
  handoffMode: z.string().min(1).optional(),
  supportEmail: z.string().optional(),
  supportWhatsapp: z.string().optional(),
  themeColor: z.string().optional(),
  demoEnabled: z.boolean().optional(),
  ghlApiKey: z.string().optional()
});

const demoMessageSchema = z.object({
  conversationId: z.string().min(1).optional(),
  text: z.string().min(1)
});

function maskApiKey(key?: string | null) {
  if (!key) return null;
  if (key.length <= 8) return "********";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function withLocationView(location: {
  [key: string]: unknown;
  publicKey?: string | null;
  ghlApiKey?: string | null;
}) {
  return {
    ...location,
    ghlApiKey: maskApiKey(location.ghlApiKey),
    ghlApiConfigured: Boolean(location.ghlApiKey),
    embedCode: location.publicKey
      ? `<script src=\"${config.APP_BASE_URL}/widget.js\" data-location-key=\"${location.publicKey}\"></script>`
      : null
  };
}

export async function registerLocationRoutes(app: FastifyInstance) {
  app.get("/api/locations", async () => {
    const locations = await listLocations();
    return {
      locations: locations.map((location: { [key: string]: unknown; publicKey?: string | null; ghlApiKey?: string | null }) =>
        withLocationView(location)
      )
    };
  });

  app.post("/api/locations", async (request, reply) => {
    const body = createSchema.parse(request.body);
    const location = await upsertLocation({
      locationId: body.locationId,
      alias: body.alias,
      ghlApiKey: body.ghlApiKey,
      botName: body.botName,
      systemPrompt: body.systemPrompt,
      openaiModel: body.openaiModel,
      openaiTemperature: body.openaiTemperature,
      supportEmail: body.supportEmail,
      supportWhatsapp: body.supportWhatsapp
    });

    return reply.code(201).send({
      location: withLocationView(location)
    });
  });

  app.get("/api/locations/:locationId", async (request, reply) => {
    const { locationId } = request.params as { locationId: string };
    const location = await getLocationById(locationId);
    if (!location) {
      return reply.code(404).send({ message: "Location not found" });
    }

    const conversations = await listConversationsByLocation(locationId, 10);

    return {
      location: withLocationView(location),
      stats: {
        openConversations: conversations.filter((item: { status: string }) => item.status !== "closed").length,
        handoffConversations: conversations.filter((item: { status: string }) => item.status === "handoff").length
      }
    };
  });

  app.patch("/api/locations/:locationId", async (request, reply) => {
    const { locationId } = request.params as { locationId: string };
    const body = updateSchema.parse(request.body);

    const location = await updateLocationSettings(locationId, body);
    return {
      location: withLocationView(location)
    };
  });

  app.get("/api/locations/:locationId/conversations", async (request) => {
    const { locationId } = request.params as { locationId: string };
    const conversations = await listConversationsByLocation(locationId);
    return { conversations };
  });

  app.get("/api/locations/:locationId/integrations", async (request, reply) => {
    const { locationId } = request.params as { locationId: string };
    const location = await getLocationById(locationId);
    if (!location) {
      return reply.code(404).send({ message: "Location not found" });
    }

    const [openai, ghl] = await Promise.all([
      getOpenAiStatus(),
      getGhlStatus(locationId, location.ghlApiKey)
    ]);

    return {
      openai,
      ghl,
      selectedModel: location.openaiModel,
      temperature: location.openaiTemperature
    };
  });

  app.get("/api/integrations/openai", async () => {
    const openai = await getOpenAiStatus();
    return { openai };
  });

  app.post("/api/locations/:locationId/demo/message", async (request, reply) => {
    const { locationId } = request.params as { locationId: string };
    const body = demoMessageSchema.parse(request.body);

    const location = await getLocationById(locationId);
    if (!location) {
      return reply.code(404).send({ message: "Location not found" });
    }
    if (!location.botEnabled || !location.demoEnabled) {
      return reply.code(403).send({ message: "Demo is disabled for this location" });
    }

    const conversation = body.conversationId
      ? { id: body.conversationId }
      : await createDemoConversation({
          locationId,
          title: `Demo ${location.alias ?? location.id}`
        });

    await saveMessage({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      direction: "inbound",
      channel: "web",
      authorType: "customer",
      senderName: "Client",
      text: body.text,
      meta: { source: "playground" }
    });

    const history = await listConversationMessages(conversation.id);
    let botReply = "מצטער, זמנית אין מענה. נציג יחזור בהקדם.";
    try {
      botReply = await generateBotReply({
        location,
        history,
        userMessage: body.text
      });
    } catch (error) {
      request.log.error({ error }, "Failed generating bot reply");
    }

    await saveMessage({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      direction: "outbound",
      channel: "web",
      authorType: "bot",
      senderName: location.botName,
      text: botReply,
      meta: { source: "playground" }
    });

    const messages = await listConversationMessages(conversation.id);

    return {
      conversationId: conversation.id,
      messages
    };
  });

  app.get("/api/widget/location/:publicKey", async (request, reply) => {
    const { publicKey } = request.params as { publicKey: string };
    const location = await getLocationByPublicKey(publicKey);
    if (!location) {
      return reply.code(404).send({ message: "Location not found" });
    }

    return {
      locationId: location.id,
      alias: location.alias,
      botName: location.botName,
      themeColor: location.themeColor
    };
  });
}
