/**
 * Planned AWS resources. Names only — no credentials, ARNs with account IDs, or secrets.
 * The browser never calls these services directly; it calls the PanelMorrow API
 * (API Gateway + Lambda), whose IAM execution roles have least-privilege access.
 */
export interface AwsResource {
  service: string;
  purpose: string;
  resource: string;
  calledFrom: string;
  demoStatus: "Simulated" | "Mocked in browser" | "Not connected";
}

export const AWS_RESOURCES: AwsResource[] = [
  { service: "Amazon SageMaker AI", purpose: "Weather-adjusted expected generation & anomaly detection models", resource: "endpoints: panelmorrow-expected-gen, panelmorrow-anomaly", calledFrom: "Lambda: analysis-runner", demoStatus: "Simulated" },
  { service: "Amazon Bedrock", purpose: "Narrative maintenance & performance report summaries", resource: "model: Anthropic Claude (via InvokeModel)", calledFrom: "Lambda: report-summariser", demoStatus: "Simulated" },
  { service: "Amazon S3", purpose: "Raw generation & weather datasets, report archives", resource: "bucket: panelmorrow-datasets-{env} (SSE-KMS)", calledFrom: "Presigned PUT from browser; Lambda reads", demoStatus: "Mocked in browser" },
  { service: "Amazon DynamoDB", purpose: "Sites, daily records, anomalies/alerts, recommendations, maintenance", resource: "table: panelmorrow-{env} (single-table, PK=TENANT#id)", calledFrom: "Lambda: api-*", demoStatus: "Mocked in browser" },
  { service: "AWS Lambda", purpose: "API handlers, ingestion validation, scheduled nightly analysis", resource: "functions: api-*, ingest-validator, analysis-runner (EventBridge cron)", calledFrom: "API Gateway, S3 events, EventBridge", demoStatus: "Simulated" },
  { service: "Amazon Cognito", purpose: "User authentication, MFA, SSO federation, tenant claims", resource: "user pool: panelmorrow-users-{env}", calledFrom: "Browser (public client ID only)", demoStatus: "Mocked in browser" },
  { service: "Amazon CloudWatch", purpose: "Logs, metrics, alarms for ingestion lag & model drift", resource: "namespace: PanelMorrow/*; dashboards & alarms", calledFrom: "All backend components", demoStatus: "Not connected" },
];
