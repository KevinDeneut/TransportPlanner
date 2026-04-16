import type { FastifyInstance } from "fastify";
import {
  CreateDriverSchema,
  UpdateDriverSchema,
  type ApiSuccess,
  type Driver as SharedDriver,
} from "@transport-planner/shared";
import { prisma } from "../../lib/prisma.js";
import { sendError, sendNotFound } from "../../lib/errors.js";
import type { Driver } from "@prisma/client";

function toSharedDriver(d: Driver): SharedDriver {
  return {
    id: d.id,
    name: d.name,
    licenseNumber: d.licenseNumber,
    isAvailable: d.isAvailable,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function driversRoutes(app: FastifyInstance): Promise<void> {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/drivers
  app.get("/", auth, async (_request, reply) => {
    const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
    const body: ApiSuccess<SharedDriver[]> = { success: true, data: drivers.map(toSharedDriver) };
    void reply.send(body);
  });

  // GET /api/drivers/:id
  app.get<{ Params: { id: string } }>("/:id", auth, async (request, reply) => {
    const driver = await prisma.driver.findUnique({ where: { id: request.params.id } });
    if (!driver) { sendNotFound(reply, "Chauffeur"); return; }
    void reply.send({ success: true, data: toSharedDriver(driver) });
  });

  // POST /api/drivers
  app.post("/", auth, async (request, reply) => {
    const result = CreateDriverSchema.safeParse(request.body);
    if (!result.success) {
      sendError(reply, 400, "Ongeldige invoer", result.error.flatten());
      return;
    }

    try {
      const driver = await prisma.driver.create({ data: result.data });
      app.io.emit("driver:updated", toSharedDriver(driver));
      void reply.status(201).send({ success: true, data: toSharedDriver(driver) });
    } catch {
      sendError(reply, 409, "Rijbewijsnummer bestaat al");
    }
  });

  // PATCH /api/drivers/:id
  app.patch<{ Params: { id: string } }>("/:id", auth, async (request, reply) => {
    const existing = await prisma.driver.findUnique({ where: { id: request.params.id } });
    if (!existing) { sendNotFound(reply, "Chauffeur"); return; }

    const result = UpdateDriverSchema.safeParse(request.body);
    if (!result.success) {
      sendError(reply, 400, "Ongeldige invoer", result.error.flatten());
      return;
    }

    const updated = await prisma.driver.update({ where: { id: request.params.id }, data: result.data });
    app.io.emit("driver:updated", toSharedDriver(updated));
    void reply.send({ success: true, data: toSharedDriver(updated) });
  });

  // DELETE /api/drivers/:id
  app.delete<{ Params: { id: string } }>("/:id", auth, async (request, reply) => {
    const existing = await prisma.driver.findUnique({ where: { id: request.params.id } });
    if (!existing) { sendNotFound(reply, "Chauffeur"); return; }

    await prisma.driver.delete({ where: { id: request.params.id } });
    void reply.send({ success: true, data: { id: request.params.id } });
  });
}
