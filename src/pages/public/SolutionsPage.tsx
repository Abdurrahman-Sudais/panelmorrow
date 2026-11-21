import { Building2, CheckCircle2, Factory, Wrench } from "lucide-react";
import { CtaBand, PageHero } from "@/components/marketing/shared";

const SOLUTIONS = [
  {
    icon: Wrench,
    who: "Solar O&M contractors",
    headline: "Run more sites with the same crews.",
    text: "Replace rota-based visits with a queue ranked by recoverable energy. Show every client what each visit changed.",
    points: ["Portfolio-wide inspection queue across clients", "Travel distance and access built into ranking", "Verified before/after outcomes for client reporting", "Technician assignment and scheduling"],
  },
  {
    icon: Factory,
    who: "Commercial & industrial operators",
    headline: "Protect the savings your solar was bought for.",
    text: "Know quickly when a rooftop or carport array stops delivering — and whether your O&M provider fixed it.",
    points: ["Weather-adjusted performance per site", "Early warning of drops and gradual losses", "Independent repair verification", "Monthly PDF reports for finance teams"],
  },
  {
    icon: Building2,
    who: "Asset owners & investors",
    headline: "See portfolio performance without the noise.",
    text: "Separate weather from underperformance across dozens of assets, and quantify energy at risk in one view.",
    points: ["Capacity-weighted portfolio performance", "Energy-at-risk and recoverable kWh", "Anomaly history per asset", "Exports for due diligence and reporting"],
  },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero eyebrow="Solutions" title="Built for the people who keep solar producing." description="Whether you maintain other people’s sites or operate your own, PanelMorrow turns generation data into clear maintenance decisions." />
      <section className="container space-y-6 py-20">
        {SOLUTIONS.map((s, i) => (
          <div key={s.who} className="grid gap-8 rounded-2xl border bg-white p-8 md:grid-cols-2 md:p-10">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-solar-400"><s.icon className="h-5 w-5" /></span>
                <span className="text-sm font-semibold text-solar-600">0{i + 1} · {s.who}</span>
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-navy-900">{s.headline}</h2>
              <p className="mt-3 text-muted-foreground">{s.text}</p>
            </div>
            <ul className="grid content-center gap-3">
              {s.points.map((p) => (
                <li key={p} className="flex items-start gap-3 rounded-lg bg-secondary/60 px-4 py-3 text-sm font-medium text-navy-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />{p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <CtaBand />
    </>
  );
}
