/**
 * In-browser repository used in MOCK mode.
 *
 * Stands in for DynamoDB (sites, alerts, maintenance records) and S3 (uploaded
 * generation / weather datasets). Seed data is generated deterministically at
 * start-up; user changes are persisted to localStorage so the demo survives reloads.
 */
import type {
  AnomalyStatus,
  DailyRecord,
  MaintenanceRecord,
  PriorityWeights,
  RecommendationStatus,
  Site,
  UploadLog,
} from "@/types";
import { SCENARIOS, SEED_SITES } from "@/data/sites";
import { DEMO_START, addDays, generateSiteRecords } from "@/data/generator";
import { DEFAULT_WEIGHTS } from "@/services/analysis/engine";

export const AS_OF = "2026-11-20";
const STORAGE_KEY = "panelmorrow.repo.v1";

export interface RecOverride {
  status: RecommendationStatus;
  assignee?: string;
  scheduledFor?: string;
  note?: string;
}

export interface RepoState {
  sites: Site[];
  records: Record<string, DailyRecord[]>;
  anomalyStatus: Record<string, AnomalyStatus>;
  recOverrides: Record<string, RecOverride>;
  maintenance: MaintenanceRecord[];
  uploads: UploadLog[];
  weights: PriorityWeights;
}

interface PersistedState {
  customSites: Site[];
  uploadedRecords: Record<string, DailyRecord[]>;
  demoGenerated: string[];
  anomalyStatus: Record<string, AnomalyStatus>;
  recOverrides: Record<string, RecOverride>;
  maintenance: MaintenanceRecord[];
  uploads: UploadLog[];
  weights: PriorityWeights;
}

const day = (i: number) => addDays(DEMO_START, i);

const SEED_MAINTENANCE: MaintenanceRecord[] = [
  {
    id: "mnt_seed_1",
    siteId: "PM-LAG-005",
    inspectionDate: day(131),
    identifiedProblem: "Heavy dust and bird-dropping accumulation on rows C–F; two strings with loose MC4 connectors.",
    maintenancePerformed: "Full array wash (deionised water), re-terminated 2 MC4 connectors, IV-curve spot checks on 12 strings.",
    technician: "Tunde Bakare",
    repairCostUsd: 1850,
    windowDays: 14,
    notes: "Client requested quarterly cleaning schedule going forward.",
    createdAt: day(132),
  },
  {
    id: "mnt_seed_2",
    siteId: "PM-FCT-011",
    inspectionDate: day(104),
    identifiedProblem: "Inverter 2 offline after DC insulation fault alarm; contactor replaced under warranty.",
    maintenancePerformed: "Insulation resistance testing, faulty combiner fuse replaced, inverter 2 recommissioned by OEM engineer.",
    technician: "Hauwa Musa",
    repairCostUsd: 4200,
    windowDays: 14,
    createdAt: day(105),
  },
  {
    id: "mnt_seed_3",
    siteId: "PM-OGU-007",
    inspectionDate: day(90),
    identifiedProblem: "Suspected shading from new adjacent silo; no hardware defects found.",
    maintenancePerformed: "Visual inspection, thermal drone survey of 30% of array, vegetation clearance on east boundary.",
    technician: "Chidi Okafor",
    repairCostUsd: 950,
    windowDays: 14,
    notes: "Shading source outside site boundary — escalated to client.",
    createdAt: day(91),
  },
  {
    id: "mnt_seed_4",
    siteId: "PM-LAG-004",
    inspectionDate: day(60),
    identifiedProblem: "Routine preventive maintenance; no defects identified.",
    maintenancePerformed: "Module cleaning, torque check on mounting clamps, inverter firmware update.",
    technician: "Tunde Bakare",
    repairCostUsd: 420,
    windowDays: 14,
    createdAt: day(61),
  },
];

const DEFAULT_PERSISTED: PersistedState = {
  customSites: [],
  uploadedRecords: {},
  demoGenerated: [],
  anomalyStatus: {
    // Trailing "*" matches any anomaly id with this prefix (see withStatus).
    "PM-KAN-014:*": "Acknowledged",
  },
  recOverrides: {
    "PM-LAG-002": { status: "Assigned", assignee: "Tunde Bakare", scheduledFor: addDays(AS_OF, 3) },
  },
  maintenance: SEED_MAINTENANCE,
  uploads: [],
  weights: DEFAULT_WEIGHTS,
};

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED;
    return { ...DEFAULT_PERSISTED, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

function savePersisted(p: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage full or unavailable — demo continues in memory */
  }
}

/** Merge uploaded rows over generated rows by date (uploaded wins). */
function mergeRecords(base: DailyRecord[], uploaded: DailyRecord[] = []) {
  if (!uploaded.length) return base;
  const map = new Map(base.map((r) => [r.date, r]));
  for (const u of uploaded) map.set(u.date, { ...map.get(u.date), ...u });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const generatedCache = new Map<string, DailyRecord[]>();
function generatedFor(site: Site, demo: boolean) {
  const isSeed = site.id in SCENARIOS;
  if (!isSeed && !demo) return [];
  const key = site.id;
  if (!generatedCache.has(key)) generatedCache.set(key, generateSiteRecords(site, SCENARIOS[site.id] ?? { kind: "healthy" }));
  return generatedCache.get(key)!;
}

let persisted = loadPersisted();
let state: RepoState = build(persisted);
const listeners = new Set<() => void>();

function build(p: PersistedState): RepoState {
  const sites = [...SEED_SITES, ...p.customSites];
  const records: Record<string, DailyRecord[]> = {};
  for (const s of sites) records[s.id] = mergeRecords(generatedFor(s, p.demoGenerated.includes(s.id)), p.uploadedRecords[s.id]);
  return {
    sites,
    records,
    anomalyStatus: p.anomalyStatus,
    recOverrides: p.recOverrides,
    maintenance: p.maintenance,
    uploads: p.uploads,
    weights: p.weights,
  };
}

function commit(next: PersistedState) {
  persisted = next;
  savePersisted(next);
  state = build(next);
  listeners.forEach((l) => l());
}

export const repository = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getState: () => state,

  addSite(site: Site) {
    commit({ ...persisted, customSites: [...persisted.customSites, site] });
  },
  updateSite(site: Site) {
    if (site.id in SCENARIOS) return; // seed sites are read-only in the demo
    generatedCache.delete(site.id);
    commit({ ...persisted, customSites: persisted.customSites.map((s) => (s.id === site.id ? site : s)) });
  },
  generateDemoData(siteId: string) {
    commit({ ...persisted, demoGenerated: [...new Set([...persisted.demoGenerated, siteId])] });
  },
  upsertRecords(siteId: string, rows: DailyRecord[], log: UploadLog) {
    const existing = persisted.uploadedRecords[siteId] ?? [];
    commit({
      ...persisted,
      uploadedRecords: { ...persisted.uploadedRecords, [siteId]: mergeRecords(existing, rows) },
      uploads: [log, ...persisted.uploads],
    });
  },
  setAnomalyStatus(id: string, status: AnomalyStatus) {
    commit({ ...persisted, anomalyStatus: { ...persisted.anomalyStatus, [id]: status } });
  },
  setRecOverride(siteId: string, o: RecOverride) {
    commit({ ...persisted, recOverrides: { ...persisted.recOverrides, [siteId]: o } });
  },
  addMaintenance(m: MaintenanceRecord) {
    commit({ ...persisted, maintenance: [m, ...persisted.maintenance] });
  },
  deleteMaintenance(id: string) {
    commit({ ...persisted, maintenance: persisted.maintenance.filter((m) => m.id !== id) });
  },
  setWeights(w: PriorityWeights) {
    commit({ ...persisted, weights: w });
  },
  resetDemo() {
    generatedCache.clear();
    commit(DEFAULT_PERSISTED);
  },
};
