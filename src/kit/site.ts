// Site facts used by the marketing kit (forms, AWS section, progress, motion). A proposed product:
// AWS services and integrations are planned until implemented and verified.
type Stage = readonly [string, readonly string[], string];
type Pair = readonly [string, string];
type Stat = readonly [number, string, string?, string?];
export type Site = {
  name: string; email: string; founder: string;
  orgLabel: string; orgTypes: readonly string[]; useCases: readonly string[]; topics: readonly string[];
  detailLabel: string; detailProp: string; detailPlaceholder: string;
  demoTitle: string; demoIntro: string;
  progress: readonly (readonly [string, string, string])[];
  cycle: readonly string[]; marquee: readonly string[]; stats: readonly Stat[];
  aws: { why: string; stages: readonly Stage[]; across: readonly Pair[]; services: readonly Pair[] };
};

export const SITE: Site = {
  name: "PanelMorrow", email: "nkem@panelmorrow.space", founder: "Nkem Uche",
  orgLabel: "Organisation type", orgTypes: ["Solar O&M contractor", "Commercial solar operator", "Independent power producer", "Asset manager", "Other"],
  useCases: ["Performance analysis", "Anomaly detection", "Inspection prioritisation", "Repair verification", "Reports", "Other"],
  topics: ["Pilot programme", "Pricing", "Technical / AWS deployment", "Data import and integrations", "Partnership", "Other"],
  detailLabel: "Portfolio size", detailProp: "portfolio_detail", detailPlaceholder: "e.g. 30 sites · 12 MWp · inverter and weather data available",
  demoTitle: "See which sites need you first.", demoIntro: "PanelMorrow is a proposed product in its building stage. A demo walks through weather-adjusted performance, anomalies, the inspection queue and repair verification on fictional sites.",
  progress: [["2026", "Company founded", "By Nkem Uche, to help solar teams prioritise maintenance by lost output."], ["Done", "Prioritisation method defined", "Weather-adjusted expected generation, recoverable energy estimates and ranks that explain themselves."], ["Done", "Working product demo", "Sites, performance, anomalies, inspection queue, verification, imports and reports on fictional data."], ["Done", "AWS reference architecture", "Expected-generation models, summaries, data imports, storage and APIs designed."], ["Next", "First pilots", "One O&M contractor's portfolio, with technicians confirming every finding on site."]],
  cycle: ["solar O&M contractors", "commercial solar operators", "asset managers"],
  marquee: ["Commercial & industrial solar", "O&M contractors", "Expected generation", "Weather adjustment", "Inverter trips", "Soiling", "String outages", "Recoverable energy", "Inspection queue", "Repair verification", "Reports", "Lost output"],
  stats: [[24, "fictional sites in the demo"], [180, "days of simulated weather and generation"], [5, "anomaly classes detected"], [4, "maintenance depots for travel-aware ranking"]],
  aws: {
    why: "PanelMorrow compares measured generation with weather-adjusted expected generation for solar O&M contractors and commercial operators. That means large time-series imports, models that run per site and explanations maintenance teams can trust. Designing on AWS lets it train and host performance models, process imports as they arrive and store long histories economically.",
    stages: [["Import", ["Amazon S3", "AWS Lambda"], "Generation and weather files are uploaded, validated and mapped to sites."], ["Expect", ["Amazon SageMaker AI"], "Models estimate weather-adjusted expected generation for each site."], ["Detect & rank", ["AWS Lambda"], "Deviations become anomalies, losses are estimated and sites are ranked for inspection."], ["Summarise", ["Amazon Bedrock"], "Report summaries are drafted from the analysis for review."], ["Records & API", ["Amazon DynamoDB", "Amazon API Gateway"], "Sites, anomalies, inspections and repairs are stored and served through the API."]],
    across: [["Amazon Cognito", "handles sign-in and roles"], ["AWS Lambda", "runs imports and analysis"], ["AWS KMS", "encrypts customer data"], ["Amazon CloudWatch", "monitors pipelines and models"]],
    services: [["Amazon SageMaker AI", "Estimates weather-adjusted expected generation."], ["Amazon Bedrock", "Drafts report summaries."], ["Amazon S3", "Stores generation and weather data."], ["Amazon DynamoDB", "Stores sites, anomalies, inspections and repairs."], ["AWS Lambda", "Runs imports, anomaly detection and ranking."], ["Amazon API Gateway", "Provides the application API."], ["Amazon Cognito", "Authenticates users."], ["Amazon CloudWatch", "Monitors pipelines and models."], ["AWS KMS", "Encrypts customer data."]],
  },
};
