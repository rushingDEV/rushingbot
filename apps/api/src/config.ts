import { z } from "zod";
import "dotenv/config";

const configSchema = z.object({
  PORT: z.string().default("8080"),
  APP_BASE_URL: z.string().url().default("http://localhost:8080"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1),
  GHL_API_BASE: z.string().url().default("https://services.leadconnectorhq.com"),
  GHL_API_KEY: z.string().optional(),
  GHL_API_VERSION: z.string().default("2021-07-28"),
  GHL_WEBHOOK_SECRET: z.string().optional(),
  MASTER_LOCATION_ID: z.string().optional(),
  LOG_LEVEL: z.string().default("info")
});

export const config = configSchema.parse(process.env);
