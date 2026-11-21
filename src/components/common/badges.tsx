import { Badge } from "@/components/ui/badge";
import type { AnomalyStatus, RecommendationStatus, Severity, SiteStatus } from "@/types";
import { Activity, CheckCircle2, CircleDot, FlaskConical, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const v = { Critical: "critical", High: "high", Medium: "medium", Low: "low" } as const;
  return <Badge variant={v[severity]}>{severity}</Badge>;
}

export const STATUS_COLORS: Record<SiteStatus, string> = {
  Healthy: "#0FA08E",
  Watch: "#EAB308",
  Underperforming: "#F08A0C",
  Critical: "#DC2626",
  "No data": "#94A3B8",
};

export function SiteStatusBadge({ status }: { status: SiteStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[status] }} />
      {status}
    </span>
  );
}

export function AnomalyStatusBadge({ status }: { status: AnomalyStatus }) {
  if (status === "Resolved") return <Badge variant="success"><CheckCircle2 className="h-3 w-3" />Resolved</Badge>;
  if (status === "Acknowledged") return <Badge variant="secondary"><CircleDot className="h-3 w-3" />Acknowledged</Badge>;
  return <Badge variant="outline" className="border-solar-200 text-solar-700"><Activity className="h-3 w-3" />Open</Badge>;
}

export function RecStatusBadge({ status }: { status: RecommendationStatus }) {
  const map = { Pending: "outline", Approved: "low", Assigned: "success", Dismissed: "secondary" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
}

/** Marks values produced by a model (simulated) — never shown on measured data. */
export function SimulatedTag({ className, label = "Simulated model" }: { className?: string; label?: string }) {
  return (
    <Badge variant="simulated" className={cn("font-medium", className)} title="Produced by the simulated analysis service — not an operational measurement.">
      <FlaskConical className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/** Marks operational measurements (meter / uploaded data). */
export function MeasuredTag({ className, label = "Measured" }: { className?: string; label?: string }) {
  return (
    <Badge variant="verified" className={cn("font-medium", className)} title="Operational measurement from meter feed or uploaded generation records.">
      <Gauge className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? "bg-teal-500" : pct >= 70 ? "bg-solar-400" : "bg-slate-400";
  return (
    <div className="flex items-center gap-2" title="Simulated model confidence">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}
