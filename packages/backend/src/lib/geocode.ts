const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const HEADERS = {
  "User-Agent": "TransportPlanner/1.0 (transport-planner@bedrijf.be)",
  "Accept-Language": "nl,en",
};

interface GeoResult {
  lat: number;
  lng: number;
}

async function queryNominatim(q: string): Promise<GeoResult | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "be,nl,de,fr,it,lu");

  const response = await fetch(url.toString(), { headers: HEADERS });
  if (!response.ok) return null;

  const data = (await response.json()) as Array<{ lat: string; lon: string }>;
  const first = data[0];
  if (!first) return null;

  return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
}

/**
 * Vertaalt een adres naar coördinaten via Nominatim (OpenStreetMap).
 *
 * Fallback-strategie:
 *   1. Volledig adres ("Grote Markt 1, 9000 Gent")
 *   2. Zonder huisnummer ("Grote Markt, 9000 Gent")
 *   3. Alleen stad + postcode ("9000 Gent")
 *
 * Nominatim heeft een limiet van 1 verzoek/seconde — niet gebruiken in loops.
 */
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  try {
    // Poging 1: volledig adres
    const full = await queryNominatim(address);
    if (full) return full;

    // Poging 2: huisnummer weghalen (eerste getal aan het begin)
    const withoutNumber = address.replace(/^\d+\s+/, "").replace(/,?\s*\d+\s*,/, ",");
    if (withoutNumber !== address) {
      const noNum = await queryNominatim(withoutNumber);
      if (noNum) {
        console.info(`[Geocode] Gevonden zonder huisnummer: "${withoutNumber}"`);
        return noNum;
      }
    }

    // Poging 3: enkel postcode + stad (laatste deel na de laatste komma, of het geheel)
    const parts = address.split(",");
    if (parts.length >= 2) {
      const cityPart = parts.slice(-2).join(",").trim();
      const city = await queryNominatim(cityPart);
      if (city) {
        console.info(`[Geocode] Gevonden op stad-niveau: "${cityPart}"`);
        return city;
      }
    }

    console.warn(`[Geocode] Geen resultaat voor: "${address}"`);
    return null;
  } catch (err) {
    console.error(`[Geocode] Fout bij geocoding van "${address}":`, err);
    return null;
  }
}
