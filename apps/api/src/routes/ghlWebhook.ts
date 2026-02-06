import { FastifyInstance } from "fastify";
import { upsertConversation, saveMessage } from "../services/messages.js";

const pick = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== "object") return undefined;
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj as any);
};

const firstValue = (obj: unknown, paths: string[]): unknown => {
  for (const path of paths) {
    const value = pick(obj, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const toJsonValue = (value: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

export async function registerGhlWebhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/ghl", async (request, reply) => {
    const payload = request.body as Record<string, unknown>;

    const eventType = firstValue(payload, [
      "type",
      "event",
      "eventType",
      "name",
      "data.type",
      "data.event"
    ]) as string | undefined;

    const conversationId = firstValue(payload, [
      "conversationId",
      "data.conversationId",
      "conversation.id",
      "payload.conversation.id"
    ]) as string | undefined;

    const messageId = firstValue(payload, [
      "messageId",
      "data.messageId",
      "message.id",
      "payload.message.id"
    ]) as string | undefined;

    const locationId = firstValue(payload, [
      "locationId",
      "data.locationId",
      "location.id",
      "payload.location.id"
    ]) as string | undefined;

    const contactId = firstValue(payload, [
      "contactId",
      "data.contactId",
      "contact.id",
      "payload.contact.id"
    ]) as string | undefined;
    const contactName = firstValue(payload, [
      "contact.name",
      "data.contact.name",
      "payload.contact.name"
    ]) as string | undefined;

    const direction = (firstValue(payload, [
      "direction",
      "data.direction",
      "message.direction"
    ]) as string | undefined) ?? "unknown";

    const channel = (firstValue(payload, [
      "channel",
      "data.channel",
      "message.channel",
      "data.message.channel"
    ]) as string | undefined) ?? "unknown";

    const text = (firstValue(payload, [
      "body",
      "message.body",
      "message.text",
      "data.body",
      "data.message.body"
    ]) as string | undefined) ?? undefined;

    const userId = firstValue(payload, [
      "userId",
      "data.userId",
      "message.userId",
      "data.message.userId"
    ]) as string | undefined;

    const senderName = firstValue(payload, [
      "contact.name",
      "data.contact.name",
      "message.senderName",
      "data.message.senderName"
    ]) as string | undefined;

    const isHumanOutbound = Boolean(userId && direction.toLowerCase() === "outbound");

    if (conversationId && locationId) {
      await upsertConversation({
        id: conversationId,
        locationId,
        title: contactName ?? null,
        contactId,
        status: isHumanOutbound ? "handoff" : "open",
        assignedUserId: userId ?? null,
        channel,
        lastMessageAt: new Date()
      });
    }

    if (messageId && conversationId) {
      await saveMessage({
        id: messageId,
        conversationId,
        direction,
        channel,
        authorType: isHumanOutbound ? "human" : "customer",
        senderName: isHumanOutbound ? userId ?? "Agent" : senderName ?? "Customer",
        text: text ?? null,
        meta: toJsonValue({ eventType: eventType ?? null, payload })
      });
    }

    request.log.info({ eventType, conversationId, messageId, locationId }, "GHL webhook processed");

    return reply.code(200).send({ ok: true });
  });
}
