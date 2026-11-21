import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/common/Logo";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="text-xs text-muted-foreground">Authentication is simulated in this demo. Production uses Amazon Cognito.</p>
      </div>
      <div className="relative hidden overflow-hidden bg-navy-900 lg:block">
        <div className="grid-bg absolute inset-0" />
        <div className="absolute -right-20 top-10 h-96 w-96 rounded-full bg-solar-500/25 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-teal-500/20 blur-[110px]" />
        <div className="relative flex h-full flex-col justify-center px-16">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-solar-300">Prioritize solar maintenance by lost output</p>
          <h2 className="mt-4 max-w-md text-4xl font-bold leading-tight text-white">Know where to go first.</h2>
          <ul className="mt-8 space-y-3 text-navy-200">
            {["Weather-adjusted performance for every site", "Anomalies quantified in lost kWh", "Inspection queue ranked by recoverable energy", "Repair outcomes verified, not assumed"].map((t) => (
              <li key={t} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-teal-400" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
