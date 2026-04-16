import type { CreateOrderInput } from "@transport-planner/shared";
import type { Vehicle, Order } from "@prisma/client";

export interface FinalizedRoute {
  vehicle: Vehicle & { orders: Order[] };
}

/**
 * Contract tussen de applicatie en SAP.
 * Alle SAP-specifieke logica zit uitsluitend in implementaties van deze interface.
 */
export interface SapAdapter {
  /**
   * Vertaalt een binnenkomende SAP-payload naar het interne order-formaat.
   * De rawPayload is bewust `unknown` — we weten het formaat nog niet.
   */
  normalizeIncomingOrder(rawPayload: unknown): CreateOrderInput;

  /**
   * Bouwt de uitgaande payload voor een gefinaliseerde rit.
   * Het returntype is `unknown` omdat het SAP-formaat nog niet bekend is.
   */
  buildOutgoingRoute(route: FinalizedRoute): unknown;

  /**
   * Stuurt de gefinaliseerde route naar SAP.
   */
  sendRoute(route: FinalizedRoute): Promise<void>;

  /**
   * Bevestigt ontvangst van een order naar SAP (optioneel, afhankelijk van SAP config).
   */
  acknowledgeOrder(sapOrderId: string): Promise<void>;
}
