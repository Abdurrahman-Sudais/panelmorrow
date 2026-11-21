import { Activity, BarChart3, Bell, ClipboardCheck, CloudSun, Database, FileText, Gauge, KeyRound, ListOrdered, Lock, MapPin, ServerCog, ShieldCheck, UploadCloud, Users } from "lucide-react";
import { CtaBand, PageHero, SectionHeading } from "@/components/marketing/shared";

const GROUPS = [
  {
    title: "Performance analysis",
    icon: BarChart3,
    items: [
      { i: CloudSun, t: "Weather-adjusted expected generation", d: "Daily expected output from irradiance, temperature, system size, orientation and degradation — or your own monthly profile." },
      { i: Gauge, t: "Performance index & PR", d: "Actual vs expected (weather-adjusted) and classic performance ratio, per site and portfolio." },
      { i: BarChart3, t: "Deviation & loss charts", d: "Daily shortfall, deviation bands and cumulative lost kWh with weather overlays." },
    ],
  },
  {
    title: "Anomaly detection",
    icon: Activity,
    items: [
      { i: Activity, t: "Five anomaly classes", d: "Unexpected drops, persistent underperformance, irregular patterns, sudden changes and potential equipment-related issues." },
      { i: Gauge, t: "Confidence & severity", d: "Each anomaly carries a model confidence, a severity grade and the energy lost over its window." },
      { i: Bell, t: "Suggested next actions", d: "Practical checks to run before dispatch — written so they never claim a specific fault." },
    ],
  },
  {
    title: "Maintenance operations",
    icon: ListOrdered,
    items: [
      { i: ListOrdered, t: "Ranked inspection queue", d: "Configurable weighting of recoverable energy, losses, severity, urgency, travel distance and site access." },
      { i: Users, t: "Approve, assign, dismiss", d: "Managers triage recommendations and assign technicians with scheduled dates." },
      { i: ClipboardCheck, t: "Repair verification", d: "Before/after weather-adjusted comparison with uncertainty bands — improvement is observed, not assumed." },
    ],
  },
  {
    title: "Data & reporting",
    icon: FileText,
    items: [
      { i: UploadCloud, t: "CSV imports", d: "Generation and weather datasets with column mapping, validation and row-level error reporting." },
      { i: MapPin, t: "Site registry", d: "Capacity, panel and inverter details, install dates, location, depot distance and access rating." },
      { i: FileText, t: "PDF & CSV reports", d: "Portfolio summaries, anomalies, priorities and repair outcomes with AI-drafted narrative summaries." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything between a generation export and a work order."
        description="PanelMorrow combines weather-adjusted modelling, anomaly detection and transparent prioritisation in a single workspace built for solar maintenance teams."
      />
      <section className="container space-y-20 py-20">
        {GROUPS.map((g) => (
          <div key={g.title} className="grid gap-10 lg:grid-cols-3">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-solar-50 text-solar-600"><g.icon className="h-5 w-5" /></div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-navy-900">{g.title}</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
              {g.items.map((it) => (
                <div key={it.t} className="rounded-xl border bg-white p-5">
                  <it.i className="h-5 w-5 text-teal-500" />
                  <h3 className="mt-4 font-semibold text-navy-900">{it.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.d}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section id="security" className="bg-secondary/50 py-20">
        <div className="container">
          <SectionHeading eyebrow="Security & architecture" title="Enterprise-grade by design, on AWS." description="Built on managed AWS services with least-privilege access. Credentials never live in the browser." />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { i: KeyRound, t: "Amazon Cognito", d: "SSO-ready user pools, MFA and role-based access." },
              { i: Lock, t: "Encryption", d: "TLS in transit; S3 and DynamoDB encrypted at rest with KMS." },
              { i: ServerCog, t: "Isolated tenants", d: "Tenant-partitioned data with per-request authorisation." },
              { i: Database, t: "Auditable models", d: "Versioned SageMaker models; every prediction tagged with its model version." },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border bg-white p-5">
                <x.i className="h-5 w-5 text-navy-700" />
                <h3 className="mt-4 font-semibold text-navy-900">{x.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />SageMaker AI, Bedrock, S3, DynamoDB, Lambda, Cognito and CloudWatch.</p>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
