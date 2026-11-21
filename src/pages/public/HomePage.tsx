import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  FileText,
  ListOrdered,
  MapPin,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";
import { CtaBand, Eyebrow, SectionHeading } from "@/components/marketing/shared";

const FEATURES = [
  { icon: CloudSun, title: "Weather-adjusted expectations", text: "Every site’s output is compared with what it should have produced given that day’s irradiance and temperature — not a flat monthly target." },
  { icon: Activity, title: "Anomaly detection", text: "Spot sudden drops, persistent underperformance, irregular patterns and step changes, each with a confidence score and the energy at stake." },
  { icon: ListOrdered, title: "Ranked inspection queue", text: "Sites are ranked by recoverable energy, severity, urgency, travel distance and access — with a plain-language reason for every rank." },
  { icon: ClipboardCheck, title: "Repair verification", text: "Compare weather-adjusted performance before and after each visit, with an uncertainty band so improvements aren’t over-claimed." },
  { icon: UploadCloud, title: "Bring your own data", text: "Import generation and weather CSVs from any inverter platform or SCADA export. Validation flags bad rows before they skew analysis." },
  { icon: FileText, title: "Client-ready reports", text: "Portfolio and site reports with losses, anomalies, priorities and repair outcomes. Export to PDF or CSV in one click." },
];

const STEPS = [
  { n: "01", title: "Connect sites & data", text: "Register installations and import historical generation and weather records." },
  { n: "02", title: "Model expected output", text: "A weather-adjusted performance model estimates what each site should have generated." },
  { n: "03", title: "Detect & quantify", text: "Deviations are classified, scored for confidence and converted into lost kWh." },
  { n: "04", title: "Prioritise & verify", text: "Crews go where the most energy is recoverable; results are verified after each visit." },
];

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-900 pb-20 pt-32 md:pb-28 md:pt-40">
        <div className="grid-bg absolute inset-0" />
        <div className="absolute -right-32 top-0 h-[560px] w-[560px] rounded-full bg-solar-500/20 blur-[130px]" />
        <div className="absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full bg-teal-500/15 blur-[130px]" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-navy-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-solar-400" />
              Solar asset performance analytics for O&amp;M teams
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl md:leading-[1.05]">
              Know Which Solar Sites Are Losing Performance.{" "}
              <span className="bg-gradient-to-r from-solar-300 to-solar-500 bg-clip-text text-transparent">Know Where to Go First.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-200">
              PanelMorrow analyses solar generation against expected weather-adjusted performance, identifies unusual output patterns, and helps maintenance teams prioritize inspections based on recoverable energy.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="solar">
                <Link to="/register">Start free trial <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="glass">
                <Link to="/login">Explore the live demo</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-navy-300">
              {["No hardware to install", "Works with any inverter export", "SOC 2-aligned AWS architecture"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />{t}</span>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <DashboardPreview />
            <p className="mt-3 text-center text-[11px] text-navy-400">Preview rendered from PanelMorrow’s demonstration dataset. Expected output shown is from a simulated model.</p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b bg-white">
        <div className="container grid grid-cols-2 gap-6 py-12 md:grid-cols-4">
          {[
            ["3–8%", "typical annual energy lost to undetected underperformance in C&I portfolios"],
            ["< 24h", "from data import to a ranked inspection queue"],
            ["5 signals", "combined to rank every site: loss, recoverability, severity, travel, access"],
            ["100%", "of model outputs labelled — never confused with measured data"],
          ].map(([v, l]) => (
            <div key={v}>
              <p className="text-3xl font-bold tracking-tight text-navy-900">{v}</p>
              <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section className="container py-20 md:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="The problem"
              title="Monthly yield reports hide the sites that need you most."
              description="A cloudy month looks like a fault. A dusty array looks like a cloudy month. Without weather-adjusted baselines, maintenance teams spread crews evenly — or chase the loudest client — while recoverable energy quietly disappears."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Separate weather effects from genuine performance losses",
                "Quantify the kWh at stake before dispatching a crew",
                "Rank work by what’s recoverable, not by who called last",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-[15px] text-navy-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { k: "Without PanelMorrow", items: ["Fixed monthly targets", "Faults found at quarterly visits", "Crews routed by schedule", "Repairs assumed to work"], tone: "border-dashed bg-secondary/50" },
              { k: "With PanelMorrow", items: ["Daily weather-adjusted baselines", "Anomalies flagged within days", "Crews routed by recoverable kWh", "Outcomes verified with uncertainty"], tone: "border-solar-200 bg-solar-50/60" },
            ].map((c) => (
              <div key={c.k} className={`rounded-xl border p-6 ${c.tone}`}>
                <p className="text-sm font-semibold text-navy-900">{c.k}</p>
                <ul className="mt-4 space-y-3 text-sm text-navy-700">
                  {c.items.map((i) => (
                    <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-secondary/50 py-20 md:py-28">
        <div className="container">
          <SectionHeading center eyebrow="Platform" title="From raw generation data to a maintenance plan" description="Everything a solar O&M team needs to find losses early and spend inspection hours where they matter." />
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-white p-6 transition-shadow hover:shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-solar-400 transition-colors group-hover:bg-solar-500 group-hover:text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-[17px] font-semibold text-navy-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="outline"><Link to="/features">See all features <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="relative overflow-hidden bg-navy-900 py-20 md:py-28">
        <div className="grid-bg absolute inset-0" />
        <div className="container relative">
          <SectionHeading light eyebrow="How it works" title="Four steps from data to dispatch" description="PanelMorrow fits around the monitoring platforms you already use." />
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl bg-white/10 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-navy-900 p-7">
                <span className="font-mono text-sm text-solar-400">{s.n}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-300">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button asChild variant="glass"><Link to="/how-it-works">Read the methodology <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>

      {/* PRIORITISATION SHOWCASE */}
      <section className="container py-20 md:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rank #1 · Score 97</p>
                  <p className="mt-1 text-lg font-semibold text-navy-900">Minna Rice Processing Mill</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />Minna, Niger · 980 kW</p>
                </div>
                <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Critical</span>
              </div>
              <div className="mt-5 space-y-2.5">
                {[
                  ["Recoverable energy", 29],
                  ["Energy lost (30d)", 20],
                  ["Anomaly severity", 20],
                  ["Urgency", 7],
                  ["Travel effort", 6],
                  ["Site accessibility", 3],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex items-center gap-3 text-xs">
                    <span className="w-32 shrink-0 text-muted-foreground">{l}</span>
                    <div className="h-2 flex-1 rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-solar-500" style={{ width: `${(v as number) * 3.2}%` }} />
                    </div>
                    <span className="tabular w-6 text-right font-semibold text-navy-900">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg bg-secondary/70 p-3 text-xs leading-relaxed text-navy-700">
                <strong>Why this site:</strong> Output fell ~52% below weather-adjusted expectation and has not recovered. An estimated 155 MWh could be recovered over 90 days if resolved now. Cause not confirmed — review inverter logs before dispatch.
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Maintenance prioritization"
              title="Every rank comes with a reason."
              description="Managers see exactly which factors pushed a site up the queue, can tune the weighting to their operation, and approve, assign or dismiss recommendations in one place."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { i: BarChart3, t: "Transparent scoring", d: "Six weighted factors, fully explained." },
                { i: ShieldCheck, t: "No false certainty", d: "Anomalies describe patterns — never assumed faults." },
              ].map((x) => (
                <div key={x.t} className="flex gap-3">
                  <x.i className="mt-0.5 h-5 w-5 shrink-0 text-solar-500" />
                  <div>
                    <p className="font-semibold text-navy-900">{x.t}</p>
                    <p className="text-sm text-muted-foreground">{x.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="border-y bg-white">
        <div className="container py-16 text-center">
          <Eyebrow>Built with O&amp;M teams</Eyebrow>
          <blockquote className="mx-auto mt-5 max-w-3xl text-2xl font-medium leading-snug tracking-tight text-navy-900">
            “We used to visit every site on a rota. Now the first truck out each Monday goes to the site with the most recoverable energy — and we can show the client what the visit changed.”
          </blockquote>
          <p className="mt-5 text-sm text-muted-foreground">Head of Operations, pilot O&amp;M contractor (illustrative)</p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
