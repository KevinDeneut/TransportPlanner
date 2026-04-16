import type { FastifyInstance } from "fastify";
import { SapWebhookSchema, type ApiSuccess, type Order as SharedOrder } from "@transport-planner/shared";
import { prisma } from "../../lib/prisma.js";
import { createSapAdapter } from "../../adapters/sap/index.js";
import { sendError } from "../../lib/errors.js";
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

export async function sapRoutes(app: FastifyInstance): Promise<void> {
  const sap = createSapAdapter();

  /**
   * POST /api/sap/webhook
   * Ontvangt een order van SAP.
   * Geen JWT auth — dit endpoint wordt door SAP aangeroepen.
   * In productie beveiligen met een shared secret header.
   */
  app.post("/webhook", async (request, reply) => {
    const parseResult = SapWebhookSchema.safeParse(request.body);
    if (!parseResult.success) {
      sendError(reply, 400, "Ongeldige SAP payload");
      return;
    }

    let normalized;
    try {
      normalized = sap.normalizeIncomingOrder(parseResult.data);
    } catch (err) {
      sendError(reply, 422, "SAP payload kon niet genormaliseerd worden", err);
      return;
    }

    // Upsert: als de order al bestaat (bijv. update vanuit SAP), overschrijven
    const { requestedDeliveryAt, ...rest } = normalized;
    const parsedDate = requestedDeliveryAt ? new Date(requestedDeliveryAt) : null;
    const order = await prisma.order.upsert({
      where: { sapOrderId: normalized.sapOrderId },
      create: {
        ...rest,
        ...(parsedDate ? { requestedDeliveryAt: parsedDate } : {}),
        sapRawPayload: parseResult.data as object,
      },
      update: {
        customerName: rest.customerName,
        deliveryAddress: rest.deliveryAddress,
        deliveryLat: rest.deliveryLat,
        deliveryLng: rest.deliveryLng,
        requestedDeliveryAt: parsedDate,
        volumeKarren: rest.volumeKarren,
        notes: rest.notes,
        sapRawPayload: parseResult.data as object,
      },
      include: { vehicle: { include: { driver: true } } },
    });

    // Bevestig ontvangst naar SAP
    await sap.acknowledgeOrder(order.sapOrderId);

    // Emit naar alle verbonden planners
    const shared = toSharedOrder(order);
    app.io.emit("order:created", shared);

    const body: ApiSuccess<SharedOrder> = { success: true, data: shared };
    void reply.status(201).send(body);
  });
}
