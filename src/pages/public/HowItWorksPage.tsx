import { AlertTriangle, ArrowRight, Calculator, CloudSun, Database, ListOrdered, ClipboardCheck } from "lucide-react";
import { CtaBand, PageHero, SectionHeading } from "@/components/marketing/shared";

const STEPS = [
  { i: Database, t: "1. Ingest generation & weather", d: "Import daily or interval generation from inverter portals, SCADA or revenue meters, plus irradiance and temperature. Files land in Amazon S3 and are validated row by row." },
  { i: CloudSun, t: "2. Model expected output", d: "A weather-adjusted model estimates what each site should have produced given its capacity, orientation, temperature losses and age. In production this runs on Amazon SageMaker AI." },
  { i: Calculator, t: "3. Measure the gap", d: "Actual is compared with expected to give a performance index and daily shortfall in kWh. Weather-driven dips stop looking like faults." },
  { i: AlertTriangle, t: "4. Detect anomalies", d: "Step changes, gradual declines, erratic output and near-zero days are classified, assigned a severity and a model confidence." },
  { i: ListOrdered, t: "5. Rank inspections", d: "Recoverable energy, losses, severity, urgency, travel distance and access combine into a transparent priority score." },
  { i: ClipboardCheck, t: "6. Verify outcomes", d: "After each visit, weather-adjusted performance before and after is compared with an uncertainty band." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero eyebrow="How it works" title="A clear method, not a black box." description="PanelMorrow’s pipeline turns generation data into ranked, explainable maintenance priorities. Here’s what happens at each step." />
      <section className="container py-20">
        <div className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.t} className="rounded-xl border bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-solar-50 text-solar-600"><s.i className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-semibold text-navy-900">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-secondary/50 py-20">
        <div className="container grid gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="The maths" title="Performance index, in one line." description="Weather-adjusted performance is the ratio of measured generation to model-expected generation over the same days. A site at 100% is producing exactly what the weather allowed." />
          <div className="space-y-4">
            <div className="rounded-xl border bg-navy-900 p-6 font-mono text-sm text-navy-100">
              <p className="text-navy-400">// daily</p>
              <p>expected = capacity × irradiance × PR<sub>target</sub> × f(temp) × f(age)</p>
              <p className="mt-2">performance_index = Σ actual ÷ Σ expected</p>
              <p className="mt-2">lost_kWh = Σ max(0, expected − actual)</p>
              <p className="mt-2">recoverable_kWh ≈ daily_loss × 90 × recoverability(type)</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <p className="font-semibold">What PanelMorrow does not claim</p>
              <p className="mt-1 leading-relaxed">An anomaly is an unusual pattern in output, not a diagnosis. PanelMorrow suggests what to check, but equipment faults are only confirmed by inspection. Likewise, post-repair improvements are reported as <em>observed</em> changes — seasonal shifts and model error can contribute.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="container py-16">
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-navy-700">
          {["S3 datasets", "Lambda (scheduled)", "SageMaker models", "DynamoDB alerts", "Bedrock summaries", "Your team"].map((x, i, a) => (
            <span key={x} className="flex items-center gap-3">
              <span className="rounded-lg border bg-white px-3 py-2 shadow-sm">{x}</span>
              {i < a.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </span>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
