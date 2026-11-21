import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]", light ? "text-solar-300" : "text-solar-600")}>
      <span className={cn("h-px w-6", light ? "bg-solar-300" : "bg-solar-500")} />
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, description, center = false, light = false }: { eyebrow?: string; title: ReactNode; description?: ReactNode; center?: boolean; light?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
      <h2 className={cn("mt-3 text-3xl font-bold tracking-tight md:text-[40px] md:leading-[1.1]", light ? "text-white" : "text-navy-900")}>{title}</h2>
      {description && <p className={cn("mt-4 text-[17px] leading-relaxed", light ? "text-navy-200" : "text-muted-foreground")}>{description}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, description, children }: { eyebrow: string; title: ReactNode; description: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-navy-900">
      <div className="grid-bg absolute inset-0" />
      <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-solar-500/20 blur-[120px]" />
      <div className="absolute -bottom-40 left-0 h-[380px] w-[380px] rounded-full bg-teal-500/15 blur-[120px]" />
      <div className="container relative py-20 md:py-24">
        <Eyebrow light>{eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-5xl md:leading-[1.08]">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-navy-200">{description}</p>
        {children}
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="container py-20">
      <div className="relative overflow-hidden rounded-2xl bg-navy-900 px-6 py-14 md:px-14">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-solar-500/30 blur-[90px]" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-white">Send your crews where the energy is.</h2>
            <p className="mt-3 text-navy-200">
              Connect a portfolio in an afternoon. See which sites are losing output — and which inspection recovers the most — by tomorrow morning.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="solar">
              <Link to="/#demo">Request a demo <ArrowRight /></Link>
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link to="/contact">Book a demo</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
