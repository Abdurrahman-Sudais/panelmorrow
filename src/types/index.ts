/**
 * Core domain models for PanelMorrow.
 *
 * These shapes mirror the planned DynamoDB single-table entities
 * (see docs/ARCHITECTURE.md) so the mock repository can later be swapped
 * for the API Gateway + Lambda backend without changing UI code.
 */

export type SiteCategory = "Commercial Rooftop" | "Industrial" | "Ground-mount Farm" | "Carport" | "Public Sector";
export type Accessibility = "Easy" | "Moderate" | "Difficult";
export type SiteStatus = "Healthy" | "Watch" | "Underperforming" | "Critical" | "No data";

export interface SiteLocation {
  address: string;
  city: string;
  state: string;
  region: "South West" | "North Central" | "North West" | "South South" | "South East" | "North East";
  lat: number;
  lng: number;
}

export interface PanelInfo {
  manufacturer: string;
  model: string;
  wattage: number;
  count: number;
}

export interface InverterInfo {
  manufacturer: string;
  model: string;
  ratedKw: number;
  count: number;
}

export interface ExpectedGenerationConfig {
  /** How expected output is produced. */
  method: "simulated-weather-model" | "monthly-profile";
  /** Target performance ratio used by the weather-adjusted model. */
  targetPr: number;
  tiltDeg: number;
  azimuthDeg: number;
  /** Optional monthly expected generation (kWh) Jan..Dec when method = monthly-profile. */
  monthlyKwh?: number[];
  annualDegradationPct: number;
}

export interface Site {
  id: string;
  name: string;
  client: string;
  category: SiteCategory;
  location: SiteLocation;
  capacityKw: number;
  panels: PanelInfo;
  inverters: InverterInfo;
  installDate: string;
  accessibility: Accessibility;
  /** Road distance from nearest maintenance depot. */
  travelKm: number;
  depot: string;
  expected: ExpectedGenerationConfig;
  createdAt: string;
}

/** Source tags keep simulated model output clearly separate from operational measurements. */
export type MeasurementSource = "meter" | "csv-upload" | "demo-meter";
export type PredictionSource = "simulated-model" | "uploaded-expected" | "sagemaker";

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  /** Operational measurement (inverter / revenue meter). */
  actualKwh: number | null;
  actualSource: MeasurementSource;
  /** Weather-adjusted expected generation (model prediction). */
  expectedKwh: number;
  expectedSource: PredictionSource;
  irradianceKwhM2: number;
  ambientTempC: number;
  cloudCoverPct: number;
  weatherSource: "demo-weather" | "csv-upload" | "weather-api";
}

export type AnomalyType =
  | "Unexpected generation drop"
  | "Persistent underperformance"
  | "Irregular generation pattern"
  | "Sudden performance change"
  | "Potential equipment-related issue";

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type AnomalyStatus = "Open" | "Acknowledged" | "Resolved";

export interface Anomaly {
  id: string;
  siteId: string;
  type: AnomalyType;
  detectedAt: string;
  windowStart: string;
  windowEnd: string;
  severity: Severity;
  expectedKwh: number;
  actualKwh: number;
  lossKwh: number;
  /** Mean shortfall vs expected over the window, 0..1 */
  deficitPct: number;
  confidence: number;
  summary: string;
  suggestedAction: string;
  status: AnomalyStatus;
  modelVersion: string;
}

export type RecommendationStatus = "Pending" | "Approved" | "Assigned" | "Dismissed";

export interface PriorityFactors {
  lossKwh: number;
  recoverableKwh: number;
  severityScore: number;
  travelKm: number;
  accessibility: Accessibility;
  urgencyScore: number;
}

export interface Recommendation {
  id: string;
  siteId: string;
  score: number;
  rank: number;
  factors: PriorityFactors;
  contributions: { key: keyof PriorityWeights; label: string; value: number }[];
  reasons: string[];
  anomalyIds: string[];
  status: RecommendationStatus;
  assignee?: string;
  scheduledFor?: string;
  note?: string;
}

export interface PriorityWeights {
  recoverable: number;
  loss: number;
  severity: number;
  urgency: number;
  travel: number;
  access: number;
}

export interface MaintenanceRecord {
  id: string;
  siteId: string;
  inspectionDate: string;
  identifiedProblem: string;
  maintenancePerformed: string;
  technician: string;
  repairCostUsd: number;
  /** Days of data used either side of the inspection for the comparison. */
  windowDays: number;
  /** Optional manual overrides (performance index %, weather-adjusted) */
  prePerformanceOverride?: number;
  postPerformanceOverride?: number;
  notes?: string;
  linkedRecommendationId?: string;
  createdAt: string;
}

export interface UploadLog {
  id: string;
  kind: "generation" | "weather";
  fileName: string;
  siteId: string;
  rows: number;
  rejected: number;
  uploadedAt: string;
  /** In live mode this is the S3 object key returned by the presigned upload. */
  storageKey: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  role: "Maintenance Manager" | "Asset Manager" | "Technician" | "Admin";
}
