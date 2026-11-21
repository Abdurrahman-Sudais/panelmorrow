# PanelMorrow

**Prioritize solar maintenance by lost output.**

PanelMorrow is a solar asset performance analytics platform for solar O&M contractors and commercial solar operators. It compares measured generation with weather-adjusted expected generation, detects unusual performance patterns, estimates energy losses, and ranks sites for inspection by recoverable energy.

Founded by **Nkem Uche** (Founder) and **Abdulrahman Sani** (Co-founder).

> This repository is a functional MVP. Expected generation, anomaly detection, recoverable-energy estimates and report summaries come from a **simulated analysis service** and are labelled as such throughout the UI. The service layer is structured so Amazon SageMaker AI, Amazon Bedrock and the rest of the AWS backend can be plugged in without UI changes.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Click **Explore the live demo** → **Continue with demo account** (auth is mocked).

## What's included

| Area | Route | Highlights |
| --- | --- | --- |
| Public website | `/`, `/features`, `/solutions`, `/how-it-works`, `/pricing`, `/about`, `/contact` | Product story, live dashboard preview, pricing, founders |
| Auth | `/login`, `/register`, `/forgot-password` | React Hook Form + Zod validation; Cognito-ready service |
| Dashboard | `/app` | KPIs, trend, status mix, worst performers, recommendations, recent anomalies; filters by date range, region, category, status |
| Solar sites | `/app/sites`, `/app/sites/new`, `/app/sites/:id` | Registration (location, capacity, panels, inverters, install date, expected-generation config); site profile with generation history, expected output, anomalies, inspections & maintenance |
| Performance analysis | `/app/performance` | Actual vs expected, deviation, weather, monthly history, lost energy by site |
| Anomalies | `/app/anomalies` | 5 anomaly classes with severity, expected/actual, loss, confidence, suggested next action; acknowledge/resolve |
| Inspection queue | `/app/maintenance` | Weighted ranking (recoverable energy, loss, severity, urgency, travel, access) with explanations; approve / assign / dismiss; tunable weights |
| Repair verification | `/app/verification` | Record inspections & repairs; before/after weather-adjusted comparison with uncertainty band |
| Reports | `/app/reports` | Templates, section picker, simulated Bedrock summary, PDF & CSV export |
| Data imports | `/app/data` | Generation & weather CSV upload with column auto-mapping, row validation and preview |
| Settings | `/app/settings` | AWS integration map, model registry, demo reset |

## Demo data

24 fictional commercial & industrial sites across Nigeria with 180 days of deterministic simulated weather and generation (ending 20 Nov 2026). Faults are injected (inverter trips, soiling, string outages, intermittent output, zero-output days, repaired sites) so every module has something to show. User changes persist to `localStorage`; reset under **Settings → Demo data**.

## Measured vs simulated

- **Actual / measured** values (green "Measured" tag): meter feed or uploaded CSV.
- **Expected, loss, confidence, recoverable energy** (violet "Simulated" tag): produced by `src/services/analysis/engine.ts`.
- Anomalies describe patterns and never claim a specific equipment fault.
- Repair verification reports an *observed* change with an uncertainty band and does not attribute all improvement to the repair.

## Project structure

```
src/
  components/ui        shadcn/ui primitives
  components/charts    Recharts components
  components/domain    Anomaly & verification building blocks
  data/                Demo sites, weather/generation simulator, team
  services/analysis    Simulated performance, anomaly, prioritisation & verification engine
  services/api         Modular API services (mock ↔ live): auth, sites, uploads, operations, models, summaries
  services/aws         AWS resource map (names only, no credentials)
  services/repository  In-browser stand-in for DynamoDB/S3 in mock mode
  pages/               public, auth and app pages
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the AWS design.

## Configuration

Copy `.env.example` to `.env.local`. Only public values belong there — **never AWS keys**. `VITE_API_MODE=live` switches services to call the API Gateway backend.

## Website: lead capture, AWS section and motion

- **Demo request** (home page, `#demo`) asks for company size, organisation type, primary use case and portfolio size; **contact** (`/contact`) has a topic picker. Both post to HubSpot when `VITE_HUBSPOT_*` is set (see `.env.example` and `docs/crm-plan.md`), otherwise they open a pre-filled email to hello@panelmorrow.com.
- **Planned AWS infrastructure** and **progress** sections on the home page are driven by `src/kit/site.ts`.
- **Motion:** headings, intros and card grids fade, rise and sharpen in sequence on scroll; the hero headline enters word by word with a cycling “Built for” line, followed by a marquee band and count-up figures from the demo data (`src/kit/flow.ts`, `src/kit/Flow.tsx`). Everything is shown immediately for visitors who prefer reduced motion.
