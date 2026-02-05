import crypto from "node:crypto";
import { prisma } from "../db.js";
import { config } from "../config.js";

export function generatePublicKey(): string {
  return crypto.randomBytes(12).toString("hex");
}

export async function upsertLocation(params: {
  locationId: string;
  alias?: string | null;
}) {
  const existing = await prisma.location.findUnique({
    where: { id: params.locationId }
  });

  const publicKey = existing?.publicKey ?? generatePublicKey();

  const location = await prisma.location.upsert({
    where: { id: params.locationId },
    update: {
      alias: params.alias ?? undefined,
      publicKey
    },
    create: {
      id: params.locationId,
      alias: params.alias ?? null,
      publicKey,
      agencyLocationId: config.MASTER_LOCATION_ID ?? null
    }
  });

  return location;
}

export async function listLocations() {
  return prisma.location.findMany({
    orderBy: { createdAt: "desc" }
  });
}
