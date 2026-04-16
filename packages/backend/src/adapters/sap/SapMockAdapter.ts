import type { CreateOrderInput } from "@transport-planner/shared";
import type { SapAdapter, FinalizedRoute } from "./SapAdapter.interface.js";

/**
 * Mock adapter voor development en testing.
 * Simuleert SAP-gedrag zonder echte SAP-verbinding.
 */
export class SapMockAdapter implements SapAdapter {
  normalizeIncomingOrder(rawPayload: unknown): CreateOrderInput {
    // In development verwachten we dat de payload al grotendeels het interne
    // formaat heeft. Dit maakt het makkelijk om test-orders te sturen.
    const payload = rawPayload as Record<string, unknown>;

    return {
      sapOrderId: String(payload["sapOrderId"] ?? `MOCK-${Date.now()}`),
      customerId: String(payload["customerId"] ?? "CUST-000"),
      customerName: String(payload["customerName"] ?? "Test Klant"),
      deliveryAddress: String(payload["deliveryAddress"] ?? "Teststraat 1, 9000 Gent"),
      deliveryLat: typeof payload["deliveryLat"] === "number" ? payload["deliveryLat"] : undefined,
      deliveryLng: typeof payload["deliveryLng"] === "number" ? payload["deliveryLng"] : undefined,
      requestedDeliveryAt:
        typeof payload["requestedDeliveryAt"] === "string"
          ? payload["requestedDeliveryAt"]
          : undefined,
      volumeKarren: typeof payload["volumeKarren"] === "number" ? payload["volumeKarren"] : 1,
      notes: typeof payload["notes"] === "string" ? payload["notes"] : undefined,
    };
  }

  buildOutgoingRoute(route: FinalizedRoute): unknown {
    // Geeft een gesimuleerde SAP-payload terug voor debugging
    return {
      vehicleCode: route.vehicle.code,
      orders: route.vehicle.orders.map((o) => ({
        sapOrderId: o.sapOrderId,
        customerId: o.customerId,
        deliveryAddress: o.deliveryAddress,
        volumeKarren: o.volumeKarren,
      })),
      generatedAt: new Date().toISOString(),
      _mock: true,
    };
  }

  async sendRoute(route: FinalizedRoute): Promise<void> {
    const payload = this.buildOutgoingRoute(route);
    console.log("[SAP Mock] Route verstuurd naar SAP:", JSON.stringify(payload, null, 2));
  }

  async acknowledgeOrder(sapOrderId: string): Promise<void> {
    console.log(`[SAP Mock] Order bevestigd: ${sapOrderId}`);
  }
}
