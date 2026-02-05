import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listLocations, upsertLocation } from "../services/locations.js";

const createSchema = z.object({
  locationId: z.string().min(1),
  alias: z.string().min(1).optional()
});

export async function registerLocationRoutes(app: FastifyInstance) {
  app.get("/api/locations", async () => {
    const locations = await listLocations();
    return { locations };
  });

  app.post("/api/locations", async (request, reply) => {
    const body = createSchema.parse(request.body);
    const location = await upsertLocation({
      locationId: body.locationId,
      alias: body.alias
    });

    return reply.code(201).send({ location });
  });
}
