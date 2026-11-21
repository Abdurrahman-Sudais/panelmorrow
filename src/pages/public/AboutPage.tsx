import { Target, Eye, Scale } from "lucide-react";
import { CtaBand, PageHero, SectionHeading } from "@/components/marketing/shared";

const FOUNDERS = [
  { name: "Nkem Uche", role: "Founder & CEO", initials: "NU", bio: "Leads PanelMorrow’s product vision and customer partnerships, focused on making solar maintenance decisions measurable and accountable." },
  { name: "Abdulrahman Sani", role: "Co-founder & CTO", initials: "AS", bio: "Leads engineering and data science, building the performance models and cloud architecture that turn generation data into maintenance priorities." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About PanelMorrow" title="Every kilowatt-hour a solar site should produce, it should produce." description="We started PanelMorrow because maintenance teams were flying blind: lots of monitoring data, very little guidance on where to go first." />
      <section className="container py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="Our story" title="From data overload to clear priorities." />
          <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
            <p>Solar portfolios are growing faster than the teams that maintain them. Inverter portals produce mountains of data, but turning it into a weekly maintenance plan still depends on spreadsheets and instinct.</p>
            <p>PanelMorrow compares each site’s generation with what the weather allowed, highlights unusual patterns, and ranks inspections by the energy that can be recovered — then checks whether each visit made a difference.</p>
            <p>We’re careful about what our models claim. Anomalies are patterns, not diagnoses; improvements are observed, not assumed. That honesty is what makes the priorities trustworthy.</p>
          </div>
        </div>
      </section>
      <section className="bg-secondary/50 py-20">
        <div className="container">
          <SectionHeading center eyebrow="Leadership" title="Meet the founders" />
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {FOUNDERS.map((f) => (
              <div key={f.name} className="rounded-2xl border bg-white p-7">
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-navy-800 to-navy-950 text-lg font-bold text-solar-400">{f.initials}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-navy-900">{f.name}</h3>
                    <p className="text-sm font-medium text-solar-600">{f.role}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{f.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { i: Target, t: "Mission", d: "Help solar maintenance teams find losses earlier and spend every inspection hour where it recovers the most energy." },
            { i: Eye, t: "Vision", d: "A world where no solar site quietly underperforms for months because nobody knew where to look." },
            { i: Scale, t: "Principle", d: "Be precise about uncertainty. Label model outputs, never overstate a diagnosis, and verify outcomes." },
          ].map((v) => (
            <div key={v.t} className="rounded-xl border bg-white p-6">
              <v.i className="h-6 w-6 text-solar-500" />
              <h3 className="mt-4 text-lg font-semibold text-navy-900">{v.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.d}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
