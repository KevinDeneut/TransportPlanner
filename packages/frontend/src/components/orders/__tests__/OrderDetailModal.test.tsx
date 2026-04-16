import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrderDetailModal } from "../OrderDetailModal.tsx";
import type { Order } from "@transport-planner/shared";

// Stubs voor de mutation hooks
vi.mock("@/hooks/useOrders.ts", () => ({
  useUpdateOrder: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ ...baseOrder, customerName: "Gewijzigde Naam" }),
    isPending: false,
  }),
  useDeleteOrder: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

const baseOrder: Order = {
  id: "order-uuid-1",
  sapOrderId: "SAP-001",
  customerId: "KLANT-1",
  customerName: "Tuincentrum Janssen",
  deliveryAddress: "Antwerpsesteenweg 12, 2800 Mechelen",
  deliveryLat: 51.0279,
  deliveryLng: 4.4778,
  requestedDeliveryAt: "2026-04-20T08:00:00.000Z",
  volumeKarren: 8,
  status: "PENDING",
  vehicleId: null,
  notes: null,
  createdAt: "2026-04-16T10:00:00.000Z",
  updatedAt: "2026-04-16T10:00:00.000Z",
};

const onClose = vi.fn();
const onOrderUpdated = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OrderDetailModal — leesmodus", () => {
  it("toont de klantnaam als titel", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.getByText("Tuincentrum Janssen")).toBeInTheDocument();
  });

  it("toont SAP order ID en klantnummer", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.getByText(/SAP #SAP-001/)).toBeInTheDocument();
    expect(screen.getByText(/Klant KLANT-1/)).toBeInTheDocument();
  });

  it("toont het leveradres", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.getByText("Antwerpsesteenweg 12, 2800 Mechelen")).toBeInTheDocument();
  });

  it("toont het aantal karren", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.getByText("8 karren")).toBeInTheDocument();
  });

  it("toont de coördinaten als ze beschikbaar zijn", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.getByText("51.0279, 4.4778")).toBeInTheDocument();
  });

  it("toont een waarschuwing als er geen coördinaten zijn", () => {
    const orderZonderCoords = { ...baseOrder, deliveryLat: null, deliveryLng: null };
    render(
      <OrderDetailModal order={orderZonderCoords} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.getByText(/Geen locatie gevonden/)).toBeInTheDocument();
  });

  it("toont de statusbadge met het juiste label", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.getByText("Wachtend")).toBeInTheDocument();
  });

  it("roept onClose aan bij klik op de sluitknop", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    const closeBtn = screen.getByRole("button", { name: "" }); // SVG-knop zonder tekst
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("roept onClose aan bij klik op de overlay", () => {
    const { container } = render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("OrderDetailModal — bewerkmodus", () => {
  it("toont een bewerkformulier na klik op Bewerken", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Bewerken" }));
    // De input heeft de huidige klantnaam als waarde
    expect(screen.getByDisplayValue("Tuincentrum Janssen")).toBeInTheDocument();
  });

  it("annuleren herstelt de leesmodus", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Bewerken" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuleren" }));
    expect(screen.getByRole("button", { name: "Bewerken" })).toBeInTheDocument();
  });
});

describe("OrderDetailModal — vergrendelde order", () => {
  it("toont geen bewerkknop voor LOCKED orders", () => {
    const locked = { ...baseOrder, status: "LOCKED" as const };
    render(
      <OrderDetailModal order={locked} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.queryByRole("button", { name: "Bewerken" })).not.toBeInTheDocument();
  });

  it("toont geen bewerkknop voor SENT_TO_SAP orders", () => {
    const sent = { ...baseOrder, status: "SENT_TO_SAP" as const };
    render(
      <OrderDetailModal order={sent} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.queryByRole("button", { name: "Bewerken" })).not.toBeInTheDocument();
  });

  it("toont de vergrendeld-melding voor LOCKED orders", () => {
    const locked = { ...baseOrder, status: "LOCKED" as const };
    render(
      <OrderDetailModal order={locked} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    expect(screen.getByText(/vergrendeld en kan niet meer gewijzigd worden/i)).toBeInTheDocument();
  });
});

describe("OrderDetailModal — verwijderen", () => {
  it("toont een bevestigingsdialoog voor het verwijderen", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Verwijderen" }));
    expect(screen.getByText(/Order verwijderen\?/)).toBeInTheDocument();
  });

  it("annuleren sluit de bevestigingsdialoog", () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Verwijderen" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuleren" }));
    expect(screen.queryByText(/Order verwijderen\?/)).not.toBeInTheDocument();
  });

  it("roept onClose aan na bevestiging van verwijderen", async () => {
    render(
      <OrderDetailModal order={baseOrder} onClose={onClose} onOrderUpdated={onOrderUpdated} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Verwijderen" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja, verwijderen" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
