import { prisma } from "../db.js";
import crypto from "node:crypto";

export async function upsertConversation(params: {
  id: string;
  locationId: string;
  title?: string | null;
  contactId?: string | null;
  status?: string;
  assignedUserId?: string | null;
  channel?: string | null;
  lastMessageAt?: Date;
}) {
  await prisma.conversation.upsert({
    where: { id: params.id },
    update: {
      title: params.title ?? undefined,
      contactId: params.contactId ?? undefined,
      status: params.status ?? undefined,
      assignedUserId: params.assignedUserId ?? undefined,
      channel: params.channel ?? undefined,
      lastMessageAt: params.lastMessageAt ?? undefined
    },
    create: {
      id: params.id,
      locationId: params.locationId,
      title: params.title ?? null,
      contactId: params.contactId ?? null,
      status: params.status ?? "open",
      assignedUserId: params.assignedUserId ?? null,
      channel: params.channel ?? null,
      lastMessageAt: params.lastMessageAt ?? null
    }
  });
}

export async function saveMessage(params: {
  id: string;
  conversationId: string;
  direction: string;
  channel: string;
  authorType: string;
  senderName?: string | null;
  text?: string | null;
  mediaUrl?: string | null;
  meta?: unknown;
}) {
  const metaValue = params.meta === undefined ? undefined : params.meta;
  await prisma.message.upsert({
    where: { id: params.id },
    update: {
      direction: params.direction,
      channel: params.channel,
      authorType: params.authorType,
      senderName: params.senderName ?? null,
      text: params.text ?? null,
      mediaUrl: params.mediaUrl ?? null,
      meta: metaValue as any
    },
    create: {
      id: params.id,
      conversationId: params.conversationId,
      direction: params.direction,
      channel: params.channel,
      authorType: params.authorType,
      senderName: params.senderName ?? null,
      text: params.text ?? null,
      mediaUrl: params.mediaUrl ?? null,
      meta: metaValue as any
    }
  });
}

export async function listConversationsByLocation(locationId: string, take = 30) {
  return prisma.conversation.findMany({
    where: { locationId },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
}

export async function getConversation(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId }
  });
}

export async function listConversationMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" }
  });
}

export async function createAgentMessage(params: {
  conversationId: string;
  text: string;
  senderName?: string;
}) {
  const messageId = crypto.randomUUID();
  await saveMessage({
    id: messageId,
    conversationId: params.conversationId,
    direction: "outbound",
    channel: "web",
    authorType: "human",
    senderName: params.senderName ?? "Agent",
    text: params.text,
    meta: { source: "admin_console" }
  });

  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: {
      status: "handoff",
      assignedUserId: params.senderName ?? "agent_console",
      lastMessageAt: new Date()
    }
  });
}

export async function closeConversation(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "closed" }
  });
}

export async function createDemoConversation(params: {
  locationId: string;
  title: string;
}) {
  return prisma.conversation.create({
    data: {
      id: crypto.randomUUID(),
      locationId: params.locationId,
      title: params.title,
      status: "open",
      channel: "web",
      source: "playground",
      isDemo: true,
      lastMessageAt: new Date()
    }
  });
}
