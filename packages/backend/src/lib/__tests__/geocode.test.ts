import { describe, it, expect, vi, beforeEach } from "vitest";
import { geocodeAddress } from "../geocode.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function nominatimResponse(lat: string, lon: string) {
  return new Response(JSON.stringify([{ lat, lon }]), { status: 200 });
}

function nominatimEmpty() {
  return new Response(JSON.stringify([]), { status: 200 });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("geocodeAddress", () => {
  it("geeft coördinaten terug bij een geldig volledig adres", async () => {
    mockFetch.mockResolvedValueOnce(nominatimResponse("51.0556", "3.7224"));

    const result = await geocodeAddress("Korenmarkt 1, 9000 Gent");

    expect(result).toEqual({ lat: 51.0556, lng: 3.7224 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("valt terug op adres zonder huisnummer als volledig adres faalt", async () => {
    mockFetch
      .mockResolvedValueOnce(nominatimEmpty())       // poging 1: volledig adres
      .mockResolvedValueOnce(nominatimResponse("51.0556", "3.7224")); // poging 2: zonder nr

    const result = await geocodeAddress("Grote Markt 1, 9000 Gent");

    expect(result).toEqual({ lat: 51.0556, lng: 3.7224 });
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const secondCallUrl = mockFetch.mock.calls[1]![0] as string;
    expect(secondCallUrl).toContain("Grote+Markt");
    expect(secondCallUrl).not.toMatch(/Grote\+Markt\+1/);
  });

  it("valt terug op stad-niveau als eerste twee pogingen falen", async () => {
    mockFetch
      .mockResolvedValueOnce(nominatimEmpty()) // poging 1
      .mockResolvedValueOnce(nominatimEmpty()) // poging 2
      .mockResolvedValueOnce(nominatimResponse("51.0500", "3.7200")); // poging 3: stad

    const result = await geocodeAddress("Onbestaand Straatje 99, 9000 Gent");

    expect(result).toEqual({ lat: 51.05, lng: 3.72 });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("geeft null terug als alle drie pogingen falen", async () => {
    mockFetch
      .mockResolvedValueOnce(nominatimEmpty())
      .mockResolvedValueOnce(nominatimEmpty())
      .mockResolvedValueOnce(nominatimEmpty());

    const result = await geocodeAddress("Nergens 0, 9999 Fantasiedorp");

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("geeft null terug bij een enkel woord zonder komma (geen stad-fallback mogelijk)", async () => {
    mockFetch
      .mockResolvedValueOnce(nominatimEmpty());

    const result = await geocodeAddress("Gent");

    expect(result).toBeNull();
    // Geen huisnummer om weg te halen, geen twee onderdelen voor stad-fallback
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("geeft null terug bij een netwerkfout", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await geocodeAddress("Antwerpsestraat 5, 2000 Antwerpen");

    expect(result).toBeNull();
  });

  it("geeft null terug als Nominatim een HTTP-fout geeft", async () => {
    mockFetch.mockResolvedValueOnce(new Response("", { status: 503 }));

    const result = await geocodeAddress("Meir 1, 2000 Antwerpen");

    expect(result).toBeNull();
  });

  it("stuurt de juiste countrycodes mee in de URL", async () => {
    mockFetch.mockResolvedValueOnce(nominatimResponse("50.8503", "4.3517"));

    await geocodeAddress("Grote Markt 1, 1000 Brussel");

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("countrycodes=be%2Cnl%2Cde%2Cfr%2Cit%2Clu");
  });

  it("stuurt de correcte User-Agent header mee", async () => {
    mockFetch.mockResolvedValueOnce(nominatimResponse("50.8503", "4.3517"));

    await geocodeAddress("Rue de la Loi 1, 1000 Brussel");

    const headers = mockFetch.mock.calls[0]![1]?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/TransportPlanner/);
  });
});
