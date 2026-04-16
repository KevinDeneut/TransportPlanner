import type { SapAdapter } from "./SapAdapter.interface.js";
import { SapMockAdapter } from "./SapMockAdapter.js";

/**
 * Geeft de actieve SAP adapter terug op basis van de SAP_ADAPTER omgevingsvariabele.
 * Voeg hier later een "rest" case toe als het SAP-formaat bekend is.
 */
export function createSapAdapter(): SapAdapter {
  const adapterType = process.env["SAP_ADAPTER"] ?? "mock";

  switch (adapterType) {
    case "mock":
      return new SapMockAdapter();
    // case "rest":
    //   return new SapRestAdapter();
    default:
      console.warn(`[SAP] Onbekende adapter "${adapterType}", fallback naar mock`);
      return new SapMockAdapter();
  }
}

export type { SapAdapter } from "./SapAdapter.interface.js";
export type { FinalizedRoute } from "./SapAdapter.interface.js";
