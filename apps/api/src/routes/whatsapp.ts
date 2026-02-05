import { FastifyInstance } from "fastify";
import QRCode from "qrcode";
import { z } from "zod";
import { getOrCreateCaseCode } from "../services/conversations.js";

const requestSchema = z.object({
  conversationId: z.string().min(1),
  locationId: z.string().min(1),
  contactId: z.string().optional(),
  phoneE164: z.string().optional()
});

export async function registerWhatsappRoutes(app: FastifyInstance) {
  app.post("/api/whatsapp/qr", async (request, reply) => {
    const payload = requestSchema.parse(request.body);

    const caseCode = await getOrCreateCaseCode({
      conversationId: payload.conversationId,
      locationId: payload.locationId,
      contactId: payload.contactId
    });

    const messageText = `START ${caseCode}`;
    const encoded = encodeURIComponent(messageText);
    const waLink = payload.phoneE164
      ? `https://wa.me/${payload.phoneE164}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    const qrDataUrl = await QRCode.toDataURL(waLink, { width: 512, margin: 2 });

    return reply.send({
      caseCode,
      waLink,
      qrDataUrl,
      messageText
    });
  });
}
