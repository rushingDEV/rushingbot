import crypto from "node:crypto";
import { prisma } from "../db.js";
import { config } from "../config.js";

export function generatePublicKey(): string {
  return crypto.randomBytes(12).toString("hex");
}

export async function upsertLocation(params: {
  locationId: string;
  alias?: string | null;
  ghlApiKey?: string | null;
  botName?: string | null;
  systemPrompt?: string | null;
  openaiModel?: string | null;
  openaiTemperature?: number | null;
  supportEmail?: string | null;
  supportWhatsapp?: string | null;
}) {
  const existing = await prisma.location.findUnique({
    where: { id: params.locationId }
  });

  const publicKey = existing?.publicKey ?? generatePublicKey();

  const location = await prisma.location.upsert({
    where: { id: params.locationId },
    update: {
      alias: params.alias ?? undefined,
      ghlApiKey: params.ghlApiKey ?? undefined,
      botName: params.botName ?? undefined,
      systemPrompt: params.systemPrompt ?? undefined,
      openaiModel: params.openaiModel ?? undefined,
      openaiTemperature: params.openaiTemperature ?? undefined,
      supportEmail: params.supportEmail ?? undefined,
      supportWhatsapp: params.supportWhatsapp ?? undefined,
      publicKey
    },
    create: {
      id: params.locationId,
      alias: params.alias ?? null,
      ghlApiKey: params.ghlApiKey ?? null,
      botName: params.botName ?? "Rushingbot",
      systemPrompt: params.systemPrompt ?? null,
      openaiModel: params.openaiModel ?? "gpt-4.1-mini",
      openaiTemperature: params.openaiTemperature ?? 0.2,
      supportEmail: params.supportEmail ?? null,
      supportWhatsapp: params.supportWhatsapp ?? null,
      publicKey,
      agencyLocationId: config.MASTER_LOCATION_ID ?? null
    }
  });

  return location;
}

export async function updateLocationSettings(
  locationId: string,
  payload: {
    alias?: string;
    botEnabled?: boolean;
    botName?: string;
    systemPrompt?: string;
    openaiModel?: string;
    openaiTemperature?: number;
    handoffMode?: string;
    supportEmail?: string;
    supportWhatsapp?: string;
    themeColor?: string;
    demoEnabled?: boolean;
    ghlApiKey?: string;
  }
) {
  return prisma.location.update({
    where: { id: locationId },
    data: payload
  });
}

export async function listLocations() {
  return prisma.location.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function getLocationById(locationId: string) {
  return prisma.location.findUnique({
    where: { id: locationId }
  });
}

export async function getLocationByPublicKey(publicKey: string) {
  return prisma.location.findUnique({
    where: { publicKey }
  });
}
