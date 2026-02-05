export const CHANNELS = ["web", "whatsapp", "email", "instagram", "sms"] as const;
export type Channel = (typeof CHANNELS)[number];
