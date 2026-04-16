import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapLegend } from "../MapLegend.tsx";

describe("MapLegend", () => {
  it("toont alle vier de statussen", () => {
    render(<MapLegend />);

    expect(screen.getByText("Wachtend")).toBeInTheDocument();
    expect(screen.getByText("Toegewezen")).toBeInTheDocument();
    expect(screen.getByText("Vergrendeld")).toBeInTheDocument();
    expect(screen.getByText("Verstuurd naar SAP")).toBeInTheDocument();
  });

  it("toont voor elke status een gekleurde cirkel", () => {
    const { container } = render(<MapLegend />);
    const circles = container.querySelectorAll("span[style]");
    expect(circles).toHaveLength(4);
  });

  it("gebruikt de juiste kleuren per status", () => {
    const { container } = render(<MapLegend />);
    const circles = Array.from(container.querySelectorAll("span[style]"));
    const colors = circles.map((el) => (el as HTMLElement).style.backgroundColor);

    // Browsers converteren hex naar rgb()
    expect(colors).toContain("rgb(249, 115, 22)");  // #f97316 — Wachtend
    expect(colors).toContain("rgb(59, 130, 246)");  // #3b82f6 — Toegewezen
    expect(colors).toContain("rgb(168, 85, 247)");  // #a855f7 — Vergrendeld
    expect(colors).toContain("rgb(34, 197, 94)");   // #22c55e — Verstuurd naar SAP
  });
});
