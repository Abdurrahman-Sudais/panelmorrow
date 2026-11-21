import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, PageHero } from "@/components/marketing/shared";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Starter",
    price: "$249",
    unit: "/ month",
    desc: "For small O&M teams getting started with data-driven maintenance.",
    cta: "Start free trial",
    to: "/register",
    features: ["Up to 15 sites / 5 MW", "Weather-adjusted performance", "Anomaly detection", "Inspection queue", "CSV imports", "Monthly PDF reports", "Email support"],
  },
  {
    name: "Professional",
    price: "$890",
    unit: "/ month",
    desc: "For growing contractors and operators managing multi-client portfolios.",
    cta: "Start free trial",
    to: "/register",
    featured: true,
    features: ["Up to 100 sites / 50 MW", "Everything in Starter", "Custom priority weighting", "Repair verification", "Technician assignment", "AI report summaries", "API access", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "",
    desc: "For large portfolios with integration, security and SLA requirements.",
    cta: "Talk to sales",
    to: "/contact",
    features: ["Unlimited sites & capacity", "Everything in Professional", "SSO (SAML / OIDC via Cognito)", "Custom SageMaker models", "Dedicated data pipelines", "99.9% uptime SLA", "Customer success manager"],
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Simple pricing that scales with your portfolio." description="Every plan includes a 14-day free trial with the full demo dataset. No credit card required." />
      <section className="container -mt-10 pb-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={cn("relative flex flex-col rounded-2xl border bg-white p-7 shadow-sm", t.featured && "border-solar-400 shadow-xl ring-1 ring-solar-400")}>
              {t.featured && <span className="absolute -top-3 left-7 rounded-full bg-solar-500 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
              <h3 className="text-lg font-semibold text-navy-900">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-navy-900">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.unit}</span>
              </p>
              <Button asChild className="mt-6" variant={t.featured ? "solar" : "outline"}>
                <Link to={t.to}>{t.cta}</Link>
              </Button>
              <ul className="mt-7 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-navy-800"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Prices in USD, billed annually. Monthly billing available at +15%. Local-currency invoicing available for enterprise customers.</p>
      </section>
      <section className="container max-w-3xl py-12">
        <h2 className="text-2xl font-bold tracking-tight text-navy-900">Frequently asked questions</h2>
        <div className="mt-6 divide-y rounded-xl border bg-white">
          {[
            ["Do I need to install hardware?", "No. PanelMorrow works with data you already collect — inverter portal exports, SCADA, or meter readings — via CSV import or API."],
            ["How accurate are the expected-generation estimates?", "Accuracy depends on data quality and weather inputs. Every model output is labelled, versioned and shown separately from measured data, and repair verification includes an uncertainty band."],
            ["Does an anomaly mean equipment has failed?", "No. Anomalies describe unusual output patterns and estimate the energy involved. Causes are confirmed by inspection."],
            ["Where is my data stored?", "In your tenant’s partition on AWS (S3 and DynamoDB), encrypted at rest and in transit."],
          ].map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none font-medium text-navy-900">{q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
