# PanelMorrow — AWS architecture

The React app is a static SPA (S3 + CloudFront). It never holds AWS credentials. All data and model access goes through an authenticated API.

```
Browser (React SPA)
  │  Cognito Hosted UI / SRP  →  ID + access JWT (short-lived)
  ▼
API Gateway (JWT authorizer: Cognito user pool)
  ├─ Lambda api-sites          → DynamoDB (sites)
  ├─ Lambda api-operations     → DynamoDB (anomalies, recommendations, maintenance)
  ├─ Lambda api-uploads        → S3 presigned PUT URLs
  ├─ Lambda api-models         → SageMaker AI runtime (on-demand inference)
  └─ Lambda report-summariser  → Amazon Bedrock InvokeModel
S3 (panelmorrow-datasets-{env})
  └─ ObjectCreated → Lambda ingest-validator → DynamoDB daily records
EventBridge (nightly cron) → Lambda analysis-runner
  ├─ SageMaker endpoint panelmorrow-expected-gen   (weather-adjusted expected kWh)
  ├─ SageMaker endpoint panelmorrow-anomaly        (anomaly scoring)
  └─ writes anomalies + recommendations to DynamoDB
CloudWatch: logs, metrics (ingest lag, model latency, drift), alarms
```

## Frontend service contracts (`src/services/api`)

| Service | Mock behaviour | Live endpoint |
| --- | --- | --- |
| `authService` | localStorage session | Cognito user pool (public client ID) |
| `sitesService` | repository | `POST /sites`, `PUT /sites/{id}` |
| `uploadsService` | repository | `POST /uploads/presign` → S3 PUT → `POST /uploads` |
| `operationsService` | repository | `PATCH /anomalies/{id}`, `PATCH /recommendations/{siteId}`, `POST/DELETE /maintenance`, `PUT /settings/priority-weights` |
| `modelsService` | `services/analysis/engine.ts` | `POST /models/expected`, `POST /models/anomalies/run` |
| `summariesService` | template text | `POST /reports/summary` (Bedrock) |

## DynamoDB single-table sketch

| PK | SK | Entity |
| --- | --- | --- |
| `TENANT#{t}` | `SITE#{siteId}` | Site |
| `SITE#{siteId}` | `DAY#{yyyy-mm-dd}` | Daily record (actual + source, expected + model version, weather) |
| `SITE#{siteId}` | `ANOM#{detectedAt}#{id}` | Anomaly |
| `TENANT#{t}` | `REC#{siteId}` | Recommendation state |
| `SITE#{siteId}` | `MAINT#{date}#{id}` | Maintenance record |

GSI1 (`TENANT#{t}` / `ANOM#{status}#{severity}`) powers the anomaly queue.

## Security

- No AWS access keys, secrets or session tokens in the bundle or `.env` files.
- Lambda execution roles are least-privilege per function.
- S3 and DynamoDB encrypted with KMS; TLS everywhere.
- Every model output stores `modelVersion` and is surfaced as "simulated"/"model" in the UI.
