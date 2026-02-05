import { prisma } from "../db.js";
import { generateCaseCode } from "./caseCodes.js";

export async function getOrCreateCaseCode(params: {
  conversationId: string;
  locationId: string;
  contactId?: string | null;
}): Promise<string> {
  const existing = await prisma.conversation.findUnique({
    where: { id: params.conversationId }
  });

  if (existing?.caseCode) {
    return existing.caseCode;
  }

  const caseCode = generateCaseCode();

  await prisma.conversation.upsert({
    where: { id: params.conversationId },
    update: { caseCode },
    create: {
      id: params.conversationId,
      locationId: params.locationId,
      contactId: params.contactId ?? null,
      caseCode
    }
  });

  return caseCode;
}
