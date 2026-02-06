import { FastifyInstance } from "fastify";
import { getDashboardSummary } from "../services/messages.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard/summary", async () => {
    const summary = await getDashboardSummary();
    return { summary };
  });
}
