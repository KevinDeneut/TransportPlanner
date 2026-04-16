import { describe, it, expect } from "vitest";
import { SapMockAdapter } from "../SapMockAdapter.js";

const adapter = new SapMockAdapter();

describe("SapMockAdapter.normalizeIncomingOrder", () => {
  it("normaliseert een volledige payload correct", () => {
    const payload = {
      sapOrderId: "SAP-2026-001",
      customerId: "KLANT-42",
      customerName: "Tuincentrum Geeroms",
      deliveryAddress: "Mechelsesteenweg 5, 2800 Mechelen",
      requestedDeliveryAt: "2026-04-20T08:00:00.000Z",
      volumeKarren: 15,
      notes: "Achteruitgang gebruiken",
    };

    const result = adapter.normalizeIncomingOrder(payload);

    expect(result.sapOrderId).toBe("SAP-2026-001");
    expect(result.customerId).toBe("KLANT-42");
    expect(result.customerName).toBe("Tuincentrum Geeroms");
    expect(result.deliveryAddress).toBe("Mechelsesteenweg 5, 2800 Mechelen");
    expect(result.requestedDeliveryAt).toBe("2026-04-20T08:00:00.000Z");
    expect(result.volumeKarren).toBe(15);
    expect(result.notes).toBe("Achteruitgang gebruiken");
  });

  it("vult ontbrekende velden in met defaults", () => {
    const result = adapter.normalizeIncomingOrder({});

    expect(result.sapOrderId).toMatch(/^MOCK-\d+$/);
    expect(result.customerId).toBe("CUST-000");
    expect(result.customerName).toBe("Test Klant");
    expect(result.deliveryAddress).toBe("Teststraat 1, 9000 Gent");
    expect(result.volumeKarren).toBe(1);
    expect(result.notes).toBeUndefined();
    expect(result.requestedDeliveryAt).toBeUndefined();
  });

  it("negeert deliveryLat/Lng als ze geen number zijn", () => {
    const result = adapter.normalizeIncomingOrder({
      deliveryLat: "51.0",
      deliveryLng: null,
    });

    expect(result.deliveryLat).toBeUndefined();
    expect(result.deliveryLng).toBeUndefined();
  });

  it("behoudt deliveryLat/Lng als ze geldig zijn", () => {
    const result = adapter.normalizeIncomingOrder({
      deliveryLat: 51.0556,
      deliveryLng: 3.7224,
    });

    expect(result.deliveryLat).toBe(51.0556);
    expect(result.deliveryLng).toBe(3.7224);
  });
});

describe("SapMockAdapter.buildOutgoingRoute", () => {
  const baseOrder = {
    id: "uuid-1",
    sapOrderId: "SAP-001",
    customerId: "KLANT-1",
    customerName: "Klant A",
    deliveryAddress: "Straat 1, 9000 Gent",
    deliveryLat: 51.05,
    deliveryLng: 3.72,
    requestedDeliveryAt: null,
    volumeKarren: 10,
    status: "LOCKED" as const,
    vehicleId: "v-1",
    notes: null,
    sapRawPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("bouwt een correcte outgoing payload", () => {
    const route = {
      vehicle: {
        id: "v-1",
        code: "03",
        capacityKarren: 40,
        isLocked: true,
        driverId: "d-1",
        plannedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        orders: [baseOrder],
      },
    };

    const result = adapter.buildOutgoingRoute(route) as Record<string, unknown>;

    expect(result["vehicleCode"]).toBe("03");
    expect(result["_mock"]).toBe(true);
    expect(Array.isArray(result["orders"])).toBe(true);

    const orders = result["orders"] as Array<Record<string, unknown>>;
    expect(orders).toHaveLength(1);
    expect(orders[0]!["sapOrderId"]).toBe("SAP-001");
    expect(orders[0]!["volumeKarren"]).toBe(10);
  });

  it("bevat een generatedAt timestamp", () => {
    const route = {
      vehicle: {
        id: "v-1", code: "01", capacityKarren: 40,
        isLocked: true, driverId: null, plannedDate: new Date(),
        createdAt: new Date(), updatedAt: new Date(),
        orders: [],
      },
    };

    const result = adapter.buildOutgoingRoute(route) as Record<string, unknown>;
    expect(typeof result["generatedAt"]).toBe("string");
    expect(new Date(result["generatedAt"] as string).getTime()).not.toBeNaN();
  });
});
