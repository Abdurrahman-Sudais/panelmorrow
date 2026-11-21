import type { Accessibility, Site, SiteCategory, SiteLocation } from "@/types";

/**
 * Demonstration portfolio: 24 fictional commercial & industrial solar sites.
 * Names, clients and coordinates are illustrative only.
 */

export const DEPOTS = [
  { name: "Lagos Depot (Ikeja)", lat: 6.6018, lng: 3.3515 },
  { name: "Abuja Depot (Idu)", lat: 9.0579, lng: 7.4951 },
  { name: "Kano Depot (Bompai)", lat: 12.0022, lng: 8.5919 },
  { name: "Port Harcourt Depot (Trans-Amadi)", lat: 4.8156, lng: 7.0498 },
];

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Road distance approximated as 1.35 × great-circle distance to nearest depot. */
export function nearestDepot(lat: number, lng: number) {
  let best = DEPOTS[0];
  let bestKm = Infinity;
  for (const d of DEPOTS) {
    const km = haversineKm({ lat, lng }, d);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return { depot: best.name, travelKm: Math.max(4, Math.round(bestKm * 1.35)) };
}

/** Fault scenarios injected into the demo generator (dayIndex is within the 180-day window). */
export type Scenario =
  | { kind: "healthy" }
  | { kind: "inverter-trip"; day: number; factor: number }
  | { kind: "soiling"; day: number; slopePerDay: number; floor: number }
  | { kind: "intermittent"; day: number; probability: number }
  | { kind: "string-outage"; day: number; factor: number }
  | { kind: "repaired-soiling"; day: number; slopePerDay: number; repairDay: number }
  | { kind: "repaired-inverter"; day: number; factor: number; repairDay: number }
  | { kind: "zero-days"; day: number; probability: number }
  | { kind: "mild-underperformance"; factor: number };

interface SeedSite {
  id: string;
  name: string;
  client: string;
  category: SiteCategory;
  loc: Omit<SiteLocation, "region"> & { region: SiteLocation["region"] };
  capacityKw: number;
  panel: [string, string, number];
  inverter: [string, string, number, number];
  installDate: string;
  accessibility: Accessibility;
  scenario: Scenario;
}

const SEED: SeedSite[] = [
  { id: "PM-LAG-001", name: "Lekki Retail Park", client: "Coastline Properties Ltd", category: "Commercial Rooftop", loc: { address: "Admiralty Way, Lekki Phase 1", city: "Lagos", state: "Lagos", region: "South West", lat: 6.4474, lng: 3.4723 }, capacityKw: 420, panel: ["JA Solar", "JAM72S30 550W", 550], inverter: ["Huawei", "SUN2000-100KTL", 100, 4], installDate: "2021-03-14", accessibility: "Moderate", scenario: { kind: "inverter-trip", day: 158, factor: 0.71 } },
  { id: "PM-LAG-002", name: "Ikeja Cold Storage Hub", client: "Frostline Logistics", category: "Industrial", loc: { address: "Oba Akran Avenue", city: "Ikeja", state: "Lagos", region: "South West", lat: 6.6109, lng: 3.3431 }, capacityKw: 860, panel: ["LONGi", "Hi-MO 5 545W", 545], inverter: ["SMA", "Sunny Tripower CORE2 110", 110, 8], installDate: "2020-08-02", accessibility: "Easy", scenario: { kind: "soiling", day: 112, slopePerDay: 0.0028, floor: 0.78 } },
  { id: "PM-LAG-003", name: "Apapa Port Warehouse 4", client: "Harbourline Terminals", category: "Industrial", loc: { address: "Wharf Road, Apapa", city: "Apapa", state: "Lagos", region: "South West", lat: 6.4489, lng: 3.3593 }, capacityKw: 1250, panel: ["Trina Solar", "Vertex 550W", 550], inverter: ["Sungrow", "SG125CX", 125, 10], installDate: "2019-11-20", accessibility: "Difficult", scenario: { kind: "string-outage", day: 141, factor: 0.86 } },
  { id: "PM-LAG-004", name: "Victoria Island Office Tower", client: "Meridian Capital", category: "Commercial Rooftop", loc: { address: "Adeola Odeku Street", city: "Victoria Island", state: "Lagos", region: "South West", lat: 6.4281, lng: 3.4219 }, capacityKw: 180, panel: ["Canadian Solar", "HiKu6 540W", 540], inverter: ["Fronius", "Tauro 50", 50, 4], installDate: "2022-05-09", accessibility: "Moderate", scenario: { kind: "healthy" } },
  { id: "PM-LAG-005", name: "Agbara Beverage Plant", client: "Sunrise Beverages Nigeria", category: "Industrial", loc: { address: "Agbara Industrial Estate", city: "Agbara", state: "Ogun", region: "South West", lat: 6.5085, lng: 3.0923 }, capacityKw: 2100, panel: ["JinkoSolar", "Tiger Neo 570W", 570], inverter: ["Huawei", "SUN2000-215KTL", 215, 10], installDate: "2023-01-17", accessibility: "Easy", scenario: { kind: "repaired-soiling", day: 70, slopePerDay: 0.0024, repairDay: 131 } },
  { id: "PM-LAG-006", name: "Yaba Tech Campus Carport", client: "Mainland Innovation Hub", category: "Carport", loc: { address: "Herbert Macaulay Way", city: "Yaba", state: "Lagos", region: "South West", lat: 6.5095, lng: 3.3711 }, capacityKw: 95, panel: ["LONGi", "Hi-MO 6 430W", 430], inverter: ["SolarEdge", "SE33.3K", 33, 3], installDate: "2023-09-01", accessibility: "Easy", scenario: { kind: "intermittent", day: 140, probability: 0.32 } },
  { id: "PM-OGU-007", name: "Abeokuta Cement Works", client: "Ogun Building Materials", category: "Industrial", loc: { address: "Ewekoro Road", city: "Abeokuta", state: "Ogun", region: "South West", lat: 7.1475, lng: 3.3619 }, capacityKw: 3400, panel: ["Trina Solar", "Vertex N 580W", 580], inverter: ["Sungrow", "SG250HX", 250, 14], installDate: "2022-02-11", accessibility: "Moderate", scenario: { kind: "mild-underperformance", factor: 0.955 } },
  { id: "PM-OYO-008", name: "Ibadan Distribution Centre", client: "Westway Retail Group", category: "Commercial Rooftop", loc: { address: "Lagos–Ibadan Expressway", city: "Ibadan", state: "Oyo", region: "South West", lat: 7.3775, lng: 3.947 }, capacityKw: 640, panel: ["JA Solar", "DeepBlue 3.0 550W", 550], inverter: ["SMA", "Sunny Highpower PEAK3 150", 150, 4], installDate: "2021-07-23", accessibility: "Easy", scenario: { kind: "zero-days", day: 166, probability: 0.28 } },
  { id: "PM-FCT-009", name: "Abuja Medical Centre", client: "Capital Health Partners", category: "Public Sector", loc: { address: "Cadastral Zone, Jabi", city: "Abuja", state: "FCT", region: "North Central", lat: 9.0643, lng: 7.4242 }, capacityKw: 520, panel: ["Canadian Solar", "BiHiKu7 650W", 650], inverter: ["Huawei", "SUN2000-100KTL", 100, 5], installDate: "2022-10-04", accessibility: "Easy", scenario: { kind: "healthy" } },
  { id: "PM-FCT-010", name: "Wuse Business District Mall", client: "Central Plaza Holdings", category: "Commercial Rooftop", loc: { address: "Aminu Kano Crescent, Wuse II", city: "Abuja", state: "FCT", region: "North Central", lat: 9.0765, lng: 7.4689 }, capacityKw: 760, panel: ["LONGi", "Hi-MO 5 545W", 545], inverter: ["Sungrow", "SG110CX", 110, 7], installDate: "2020-12-15", accessibility: "Moderate", scenario: { kind: "soiling", day: 128, slopePerDay: 0.0033, floor: 0.74 } },
  { id: "PM-FCT-011", name: "Idu Industrial Park Solar Farm", client: "Federal Industrial Estates", category: "Ground-mount Farm", loc: { address: "Idu Industrial District", city: "Abuja", state: "FCT", region: "North Central", lat: 9.0412, lng: 7.3611 }, capacityKw: 4800, panel: ["JinkoSolar", "Tiger Neo 580W", 580], inverter: ["SMA", "Sunny Central 2500-EV", 2500, 2], installDate: "2021-04-30", accessibility: "Moderate", scenario: { kind: "repaired-inverter", day: 96, factor: 0.55, repairDay: 104 } },
  { id: "PM-FCT-012", name: "Gwarinpa Residential Estate Hub", client: "Greenfield Estates", category: "Carport", loc: { address: "3rd Avenue, Gwarinpa", city: "Abuja", state: "FCT", region: "North Central", lat: 9.1057, lng: 7.4038 }, capacityKw: 140, panel: ["JA Solar", "JAM54S31 410W", 410], inverter: ["Fronius", "Symo 20.0", 20, 7], installDate: "2023-06-12", accessibility: "Easy", scenario: { kind: "healthy" } },
  { id: "PM-NIG-013", name: "Minna Rice Processing Mill", client: "Niger Agro Processors", category: "Industrial", loc: { address: "Chanchaga Industrial Layout", city: "Minna", state: "Niger", region: "North Central", lat: 9.6139, lng: 6.5569 }, capacityKw: 980, panel: ["Trina Solar", "Vertex 550W", 550], inverter: ["Huawei", "SUN2000-150K", 150, 6], installDate: "2022-03-28", accessibility: "Difficult", scenario: { kind: "inverter-trip", day: 151, factor: 0.48 } },
  { id: "PM-KAN-014", name: "Kano Textile Mill", client: "Sahel Textiles Plc", category: "Industrial", loc: { address: "Sharada Industrial Estate", city: "Kano", state: "Kano", region: "North West", lat: 11.9641, lng: 8.5085 }, capacityKw: 2600, panel: ["LONGi", "Hi-MO 6 580W", 580], inverter: ["Sungrow", "SG250HX", 250, 10], installDate: "2021-09-19", accessibility: "Moderate", scenario: { kind: "soiling", day: 150, slopePerDay: 0.0045, floor: 0.8 } },
  { id: "PM-KAN-015", name: "Kano Grain Silos", client: "Northern Commodities Ltd", category: "Ground-mount Farm", loc: { address: "Zaria Road", city: "Kano", state: "Kano", region: "North West", lat: 11.9234, lng: 8.5544 }, capacityKw: 1500, panel: ["Canadian Solar", "TOPBiHiKu6 575W", 575], inverter: ["Huawei", "SUN2000-215KTL", 215, 7], installDate: "2023-04-06", accessibility: "Easy", scenario: { kind: "healthy" } },
  { id: "PM-KAD-016", name: "Kaduna Refinery Admin Block", client: "Kaduna Energy Services", category: "Public Sector", loc: { address: "Kachia Road", city: "Kaduna", state: "Kaduna", region: "North West", lat: 10.4588, lng: 7.4426 }, capacityKw: 310, panel: ["JA Solar", "JAM72S30 545W", 545], inverter: ["SMA", "Sunny Tripower CORE1 50", 50, 6], installDate: "2020-05-22", accessibility: "Difficult", scenario: { kind: "string-outage", day: 120, factor: 0.83 } },
  { id: "PM-RIV-017", name: "Port Harcourt Oil Services Base", client: "Delta Marine Services", category: "Industrial", loc: { address: "Trans-Amadi Industrial Layout", city: "Port Harcourt", state: "Rivers", region: "South South", lat: 4.8242, lng: 7.0336 }, capacityKw: 1100, panel: ["JinkoSolar", "Tiger Pro 545W", 545], inverter: ["Sungrow", "SG110CX", 110, 10], installDate: "2021-02-08", accessibility: "Moderate", scenario: { kind: "intermittent", day: 132, probability: 0.24 } },
  { id: "PM-RIV-018", name: "GRA Shopping Centre", client: "Garden City Retail", category: "Commercial Rooftop", loc: { address: "Aba Road, GRA Phase 2", city: "Port Harcourt", state: "Rivers", region: "South South", lat: 4.8156, lng: 7.0098 }, capacityKw: 350, panel: ["Trina Solar", "Vertex S 425W", 425], inverter: ["Fronius", "Tauro Eco 100", 100, 3], installDate: "2022-11-30", accessibility: "Easy", scenario: { kind: "healthy" } },
  { id: "PM-EDO-019", name: "Benin City University Teaching Hospital", client: "Edo Health Trust", category: "Public Sector", loc: { address: "Ugbowo–Lagos Road", city: "Benin City", state: "Edo", region: "South South", lat: 6.3977, lng: 5.6068 }, capacityKw: 690, panel: ["Canadian Solar", "HiKu7 600W", 600], inverter: ["Huawei", "SUN2000-115KTL", 115, 6], installDate: "2021-10-11", accessibility: "Moderate", scenario: { kind: "mild-underperformance", factor: 0.93 } },
  { id: "PM-DEL-020", name: "Warri Fabrication Yard", client: "Niger Delta Engineering", category: "Industrial", loc: { address: "Ekpan, Effurun", city: "Warri", state: "Delta", region: "South South", lat: 5.5549, lng: 5.7932 }, capacityKw: 820, panel: ["LONGi", "Hi-MO 5 540W", 540], inverter: ["SMA", "Sunny Tripower CORE2 110", 110, 7], installDate: "2020-03-03", accessibility: "Difficult", scenario: { kind: "zero-days", day: 154, probability: 0.18 } },
  { id: "PM-ENU-021", name: "Enugu Coal City Mall", client: "Eastern Retail Ventures", category: "Commercial Rooftop", loc: { address: "Abakaliki Road", city: "Enugu", state: "Enugu", region: "South East", lat: 6.4584, lng: 7.5464 }, capacityKw: 480, panel: ["JA Solar", "JAM72S30 550W", 550], inverter: ["Sungrow", "SG110CX", 110, 4], installDate: "2022-07-19", accessibility: "Easy", scenario: { kind: "healthy" } },
  { id: "PM-ANA-022", name: "Onitsha Market Logistics Depot", client: "Niger Bridge Traders", category: "Industrial", loc: { address: "Upper Iweka", city: "Onitsha", state: "Anambra", region: "South East", lat: 6.1499, lng: 6.7857 }, capacityKw: 560, panel: ["Trina Solar", "Vertex 545W", 545], inverter: ["Huawei", "SUN2000-100KTL", 100, 5], installDate: "2021-12-01", accessibility: "Difficult", scenario: { kind: "soiling", day: 136, slopePerDay: 0.0022, floor: 0.82 } },
  { id: "PM-PLA-023", name: "Jos Dairy Cooperative", client: "Plateau Dairy Farmers", category: "Industrial", loc: { address: "Vom Road", city: "Jos", state: "Plateau", region: "North Central", lat: 9.8965, lng: 8.8583 }, capacityKw: 260, panel: ["Canadian Solar", "HiKu6 545W", 545], inverter: ["Fronius", "Tauro 50", 50, 5], installDate: "2023-02-14", accessibility: "Moderate", scenario: { kind: "healthy" } },
  { id: "PM-KWA-024", name: "Ilorin Agro-Allied Complex", client: "Kwara Agro Industries", category: "Ground-mount Farm", loc: { address: "Jebba Road", city: "Ilorin", state: "Kwara", region: "North Central", lat: 8.4966, lng: 4.5426 }, capacityKw: 1800, panel: ["JinkoSolar", "Tiger Neo 575W", 575], inverter: ["Sungrow", "SG250HX", 250, 7], installDate: "2022-08-25", accessibility: "Moderate", scenario: { kind: "healthy" } },
];

export const SCENARIOS: Record<string, Scenario> = Object.fromEntries(SEED.map((s) => [s.id, s.scenario]));

export const SEED_SITES: Site[] = SEED.map((s) => {
  const { depot, travelKm } = nearestDepot(s.loc.lat, s.loc.lng);
  const panelCount = Math.round((s.capacityKw * 1000) / s.panel[2]);
  return {
    id: s.id,
    name: s.name,
    client: s.client,
    category: s.category,
    location: s.loc,
    capacityKw: s.capacityKw,
    panels: { manufacturer: s.panel[0], model: s.panel[1], wattage: s.panel[2], count: panelCount },
    inverters: { manufacturer: s.inverter[0], model: s.inverter[1], ratedKw: s.inverter[2], count: s.inverter[3] },
    installDate: s.installDate,
    accessibility: s.accessibility,
    travelKm,
    depot,
    expected: {
      method: "simulated-weather-model",
      targetPr: 0.8,
      tiltDeg: s.category === "Ground-mount Farm" ? 12 : s.category === "Carport" ? 5 : 8,
      azimuthDeg: 180,
      annualDegradationPct: 0.5,
    },
    createdAt: s.installDate,
  };
});
