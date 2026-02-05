import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export async function upsertConversation(params: {
  id: string;
  locationId: string;
  contactId?: string | null;
  status?: string;
  assignedUserId?: string | null;
  channel?: string | null;
  lastMessageAt?: Date;
}) {
  await prisma.conversation.upsert({
    where: { id: params.id },
    update: {
      contactId: params.contactId ?? undefined,
      status: params.status ?? undefined,
      assignedUserId: params.assignedUserId ?? undefined,
      channel: params.channel ?? undefined,
      lastMessageAt: params.lastMessageAt ?? undefined
    },
    create: {
      id: params.id,
      locationId: params.locationId,
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
  text?: string | null;
  mediaUrl?: string | null;
  meta?: Prisma.InputJsonValue | null;
}) {
  const metaValue =
    params.meta === undefined
      ? undefined
      : params.meta === null
      ? Prisma.JsonNull
      : (params.meta as Prisma.InputJsonValue);
  await prisma.message.upsert({
    where: { id: params.id },
    update: {
      direction: params.direction,
      channel: params.channel,
      authorType: params.authorType,
      text: params.text ?? null,
      mediaUrl: params.mediaUrl ?? null,
      meta: metaValue
    },
    create: {
      id: params.id,
      conversationId: params.conversationId,
      direction: params.direction,
      channel: params.channel,
      authorType: params.authorType,
      text: params.text ?? null,
      mediaUrl: params.mediaUrl ?? null,
      meta: metaValue
    }
  });
}
