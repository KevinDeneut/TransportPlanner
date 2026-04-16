import type { FastifyInstance } from "fastify";
import {
  CreateOrderSchema,
  UpdateOrderSchema,
  type ApiSuccess,
  type Order as SharedOrder,
} from "@transport-planner/shared";
import { prisma } from "../../lib/prisma.js";
import { sendError, sendNotFound } from "../../lib/errors.js";
import type { Order, Vehicle, Driver } from "@prisma/client";

type OrderWithVehicle = Order & { vehicle: (Vehicle & { driver: Driver | null }) | null };

function toSharedOrder(o: OrderWithVehicle): SharedOrder {
  return {
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
  };
}

export async function ordersRoutes(app: FastifyInstance): Promise<void> {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/orders
  app.get("/", auth, async (_request, reply) => {
    const orders = await prisma.order.findMany({
      include: { vehicle: { include: { driver: true } } },
      orderBy: { createdAt: "desc" },
    });

    const body: ApiSuccess<SharedOrder[]> = {
      success: true,
      data: orders.map(toSharedOrder),
    };
    void reply.send(body);
  });

  // GET /api/orders/:id
  app.get<{ Params: { id: string } }>("/:id", auth, async (request, reply) => {
    const order = await prisma.order.findUnique({
      where: { id: request.params.id },
      include: { vehicle: { include: { driver: true } } },
    });

    if (!order) { sendNotFound(reply, "Order"); return; }

    void reply.send({ success: true, data: toSharedOrder(order) });
  });

  // POST /api/orders
  app.post("/", auth, async (request, reply) => {
    const result = CreateOrderSchema.safeParse(request.body);
    if (!result.success) {
      sendError(reply, 400, "Ongeldige invoer", result.error.flatten());
      return;
    }

    const { requestedDeliveryAt, ...rest } = result.data;
    const order = await prisma.order.create({
      data: {
        ...rest,
        requestedDeliveryAt: requestedDeliveryAt ? new Date(requestedDeliveryAt) : undefined,
        sapRawPayload: request.body as object,
      },
      include: { vehicle: { include: { driver: true } } },
    });

    app.io.emit("order:created", toSharedOrder(order));
    void reply.status(201).send({ success: true, data: toSharedOrder(order) });
  });

  // PATCH /api/orders/:id
  app.patch<{ Params: { id: string } }>("/:id", auth, async (request, reply) => {
    const existing = await prisma.order.findUnique({ where: { id: request.params.id } });
    if (!existing) { sendNotFound(reply, "Order"); return; }

    if (existing.status === "LOCKED" || existing.status === "SENT_TO_SAP") {
      sendError(reply, 409, "Order is vergrendeld en kan niet meer gewijzigd worden");
      return;
    }

    const result = UpdateOrderSchema.safeParse(request.body);
    if (!result.success) {
      sendError(reply, 400, "Ongeldige invoer", result.error.flatten());
      return;
    }

    const { vehicleId, requestedDeliveryAt, ...rest } = result.data;

    // Bepaal nieuwe status op basis van vehicleId
    let status = existing.status;
    if (vehicleId !== undefined) {
      status = vehicleId === null ? "PENDING" : "ASSIGNED";
    }

    const updated = await prisma.order.update({
      where: { id: request.params.id },
      data: {
        ...rest,
        vehicleId,
        status,
        requestedDeliveryAt:
          requestedDeliveryAt === null
            ? null
            : requestedDeliveryAt
            ? new Date(requestedDeliveryAt)
            : undefined,
      },
      include: { vehicle: { include: { driver: true } } },
    });

    app.io.emit("order:updated", toSharedOrder(updated));
    void reply.send({ success: true, data: toSharedOrder(updated) });
  });

  // DELETE /api/orders/:id
  app.delete<{ Params: { id: string } }>("/:id", auth, async (request, reply) => {
    const existing = await prisma.order.findUnique({ where: { id: request.params.id } });
    if (!existing) { sendNotFound(reply, "Order"); return; }

    if (existing.status === "LOCKED" || existing.status === "SENT_TO_SAP") {
      sendError(reply, 409, "Order is vergrendeld en kan niet verwijderd worden");
      return;
    }

    await prisma.order.delete({ where: { id: request.params.id } });
    app.io.emit("order:deleted", request.params.id);
    void reply.send({ success: true, data: { id: request.params.id } });
  });
}
