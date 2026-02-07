import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  closeConversation,
  createAgentMessage,
  getConversation,
  handoffConversation,
  listConversationMessages,
  reopenConversation
} from "../services/messages.js";

const sendMessageSchema = z.object({
  text: z.string().min(1),
  senderName: z.string().min(1).optional()
});

export async function registerConversationRoutes(app: FastifyInstance) {
  app.get("/api/conversations/:conversationId/messages", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };

    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return reply.code(404).send({ message: "Conversation not found" });
    }

    const messages = await listConversationMessages(conversationId);
    return { conversation, messages };
  });

  app.post("/api/conversations/:conversationId/agent-message", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const body = sendMessageSchema.parse(request.body);

    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return reply.code(404).send({ message: "Conversation not found" });
    }

    await createAgentMessage({
      conversationId,
      text: body.text,
      senderName: body.senderName
    });

    const messages = await listConversationMessages(conversationId);
    return { ok: true, messages };
  });

  app.post("/api/conversations/:conversationId/close", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };

    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return reply.code(404).send({ message: "Conversation not found" });
    }

    await closeConversation(conversationId);
    return { ok: true };
  });

  app.post("/api/conversations/:conversationId/reopen", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };

    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return reply.code(404).send({ message: "Conversation not found" });
    }

    await reopenConversation(conversationId);
    return { ok: true };
  });

  app.post("/api/conversations/:conversationId/handoff", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };

    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return reply.code(404).send({ message: "Conversation not found" });
    }

    await handoffConversation(conversationId);
    return { ok: true };
  });
}
