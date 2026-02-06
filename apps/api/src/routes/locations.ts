import crypto from "node:crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { generateBotReply } from "../services/bot.js";
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
  supportEmail: z.string().min(1).optional(),
  supportWhatsapp: z.string().min(1).optional()
});

const updateSchema = z.object({
  alias: z.string().min(1).optional(),
  botEnabled: z.boolean().optional(),
  botName: z.string().min(1).optional(),
  systemPrompt: z.string().optional(),
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

export async function registerLocationRoutes(app: FastifyInstance) {
  app.get("/api/locations", async () => {
    const locations = await listLocations();
    return {
      locations: locations.map((location: any) => ({
        ...location,
        ghlApiKey: location.ghlApiKey ? "***" : null,
        embedCode: location.publicKey
          ? `<script src=\"${config.APP_BASE_URL}/widget.js\" data-location-key=\"${location.publicKey}\"></script>`
          : null
      }))
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
      supportEmail: body.supportEmail,
      supportWhatsapp: body.supportWhatsapp
    });

    return reply.code(201).send({
      location: {
        ...location,
        ghlApiKey: location.ghlApiKey ? "***" : null,
        embedCode: location.publicKey
          ? `<script src=\"${config.APP_BASE_URL}/widget.js\" data-location-key=\"${location.publicKey}\"></script>`
          : null
      }
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
      location: {
        ...location,
        ghlApiKey: location.ghlApiKey ? "***" : null,
        embedCode: location.publicKey
          ? `<script src=\"${config.APP_BASE_URL}/widget.js\" data-location-key=\"${location.publicKey}\"></script>`
          : null
      },
      stats: {
        openConversations: conversations.filter((item: any) => item.status !== "closed").length,
        handoffConversations: conversations.filter((item: any) => item.status === "handoff").length
      }
    };
  });

  app.patch("/api/locations/:locationId", async (request, reply) => {
    const { locationId } = request.params as { locationId: string };
    const body = updateSchema.parse(request.body);

    const location = await updateLocationSettings(locationId, body);
    return {
      location: {
        ...location,
        ghlApiKey: location.ghlApiKey ? "***" : null,
        embedCode: location.publicKey
          ? `<script src=\"${config.APP_BASE_URL}/widget.js\" data-location-key=\"${location.publicKey}\"></script>`
          : null
      }
    };
  });

  app.get("/api/locations/:locationId/conversations", async (request) => {
    const { locationId } = request.params as { locationId: string };
    const conversations = await listConversationsByLocation(locationId);
    return { conversations };
  });

  app.post("/api/locations/:locationId/demo/message", async (request, reply) => {
    const { locationId } = request.params as { locationId: string };
    const body = demoMessageSchema.parse(request.body);

    const location = await getLocationById(locationId);
    if (!location) {
      return reply.code(404).send({ message: "Location not found" });
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
