import type { FastifyInstance } from "fastify";
import {
  CreateVehicleSchema,
  UpdateVehicleSchema,
  type ApiSuccess,
  type Vehicle as SharedVehicle,
} from "@transport-planner/shared";
import { prisma } from "../../lib/prisma.js";
import { sendError, sendNotFound } from "../../lib/errors.js";
import { createSapAdapter } from "../../adapters/sap/index.js";
import type { Vehicle, Order, Driver } from "@prisma/client";

type VehicleWithRelations = Vehicle & { orders: Order[]; driver: Driver | null };

function toSharedVehicle(v: VehicleWithRelations): SharedVehicle {
  const usedKarren = v.orders.reduce((sum, o) => sum + o.volumeKarren, 0);
  return {
    id: v.id,
    code: v.code,
    capacityKarren: v.capacityKarren,
    isLocked: v.isLocked,
    plannedDate: v.plannedDate?.toISOString() ?? null,
    driverId: v.driverId,
    driver: v.driver
      ? {
          id: v.driver.id,
          name: v.driver.name,
          licenseNumber: v.driver.licenseNumber,
          isAvailable: v.driver.isAvailable,
          createdAt: v.driver.createdAt.toISOString(),
          updatedAt: v.driver.updatedAt.toISOString(),
        }
      : null,
    orders: v.orders.map((o) => ({
      id: o.id,
      sapOrderId: o.sapOrderId,
      customerId: o.customerId,
      customerName: o.customerName,
      deliveryAddress: o.deliveryAddress,
      deliveryLat: o.deliveryLat,
      deliveryLng: o.deliveryLng,
      requestedDeliveryAt: o.requestedDeliveryAt?.toISOString() ?? null,
      volumeKarren: o.volumeKarren,
      status: o.status,
      notes: o.notes,
      vehicleId: o.vehicleId,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    usedKarren,
    availableKarren: v.capacityKarren - usedKarren,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

const includeRelations = { orders: true, driver: true } as const;

export async function vehiclesRoutes(app: FastifyInstance): Promise<void> {
  const auth = { preHandler: [app.authenticate] };
  const sap = createSapAdapter();

  // GET /api/vehicles
  app.get("/", auth, async (_request, reply) => {
    const vehicles = await prisma.vehicle.findMany({
      include: includeRelations,
      orderBy: { code: "asc" },
    });
    const body: ApiSuccess<SharedVehicle[]> = { success: true, data: vehicles.map(toSharedVehicle) };
    void reply.send(body);
  });

  // GET /api/vehicles/:id
  app.get<{ Params: { id: string } }>("/:id", auth, async (request, reply) => {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: request.params.id },
      include: includeRelations,
    });
    if (!vehicle) { sendNotFound(reply, "Voertuig"); return; }
    void reply.send({ success: true, data: toSharedVehicle(vehicle) });
  });

  // POST /api/vehicles
  app.post("/", { ...auth, preHandler: [...auth.preHandler] }, async (request, reply) => {
    const result = CreateVehicleSchema.safeParse(request.body);
    if (!result.success) {
      sendError(reply, 400, "Ongeldige invoer", result.error.flatten());
      return;
    }
    const { plannedDate, ...rest } = result.data;
    const vehicle = await prisma.vehicle.create({
      data: { ...rest, plannedDate: plannedDate ? new Date(plannedDate) : undefined },
      include: includeRelations,
    });
    app.io.emit("vehicle:updated", toSharedVehicle(vehicle));
    void reply.status(201).send({ success: true, data: toSharedVehicle(vehicle) });
  });

  // PATCH /api/vehicles/:id
  app.patch<{ Params: { id: string } }>("/:id", auth, async (request, reply) => {
    const existing = await prisma.vehicle.findUnique({ where: { id: request.params.id } });
    if (!existing) { sendNotFound(reply, "Voertuig"); return; }

    if (existing.isLocked) {
      sendError(reply, 409, "Voertuig is vergrendeld en kan niet meer gewijzigd worden");
      return;
    }

    const result = UpdateVehicleSchema.safeParse(request.body);
    if (!result.success) {
      sendError(reply, 400, "Ongeldige invoer", result.error.flatten());
      return;
    }

    const { plannedDate, ...rest } = result.data;
    const updated = await prisma.vehicle.update({
      where: { id: request.params.id },
      data: {
        ...rest,
        plannedDate:
          plannedDate === null ? null : plannedDate ? new Date(plannedDate) : undefined,
      },
      include: includeRelations,
    });

    app.io.emit("vehicle:updated", toSharedVehicle(updated));
    void reply.send({ success: true, data: toSharedVehicle(updated) });
  });

  // POST /api/vehicles/:id/finalize
  // Vergrendelt het voertuig en stuurt de route naar SAP
  app.post<{ Params: { id: string } }>("/:id/finalize", auth, async (request, reply) => {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: request.params.id },
      include: includeRelations,
    });
    if (!vehicle) { sendNotFound(reply, "Voertuig"); return; }

    if (!vehicle.driverId) {
      sendError(reply, 422, "Wijs eerst een chauffeur toe voor je finaliseert");
      return;
    }

    if (vehicle.orders.length === 0) {
      sendError(reply, 422, "Voertuig heeft geen orders");
      return;
    }

    // Vergrendel voertuig + zet orders op LOCKED
    const [finalizedVehicle] = await prisma.$transaction([
      prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { isLocked: true },
        include: includeRelations,
      }),
      prisma.order.updateMany({
        where: { vehicleId: vehicle.id },
        data: { status: "LOCKED" },
      }),
    ]);

    // Stuur naar SAP
    await sap.sendRoute({ vehicle: { ...finalizedVehicle, orders: vehicle.orders } });

    // Zet orders op SENT_TO_SAP
    await prisma.order.updateMany({
      where: { vehicleId: vehicle.id },
      data: { status: "SENT_TO_SAP" },
    });

    const result = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicle.id },
      include: includeRelations,
    });

    app.io.emit("vehicle:updated", toSharedVehicle(result));
    void reply.send({ success: true, data: toSharedVehicle(result) });
  });
}
