import { ArrowRight, Info } from "lucide-react";
import type { VerificationResult } from "@/services/analysis/engine";
import { Badge } from "@/components/ui/badge";
import { fmt, cn } from "@/lib/utils";

export function OutcomeBadge({ outcome }: { outcome: VerificationResult["outcome"] }) {
  const v = { "Improvement observed": "success", "No clear change": "secondary", "Decline observed": "critical", "Insufficient data": "outline" } as const;
  return <Badge variant={v[outcome]}>{outcome}</Badge>;
}

export function VerificationSummary({ v, compact = false }: { v: VerificationResult; compact?: boolean }) {
  const sign = (x: number) => (x > 0 ? "+" : "");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-lg border bg-secondary/40 p-3">
          <p className="text-[11px] text-muted-foreground">Before ({v.pre.days} days)</p>
          <p className="tabular text-xl font-bold text-navy-900">{Number.isNaN(v.pre.performanceIndex) ? "—" : fmt.pct(v.pre.performanceIndex)}</p>
          {!compact && <p className="tabular text-[11px] text-muted-foreground">{fmt.kwh(v.pre.days ? v.pre.actualKwh / v.pre.days : 0)}/day measured</p>}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="rounded-lg border bg-secondary/40 p-3">
          <p className="text-[11px] text-muted-foreground">After ({v.post.days} days)</p>
          <p className="tabular text-xl font-bold text-navy-900">{Number.isNaN(v.post.performanceIndex) ? "—" : fmt.pct(v.post.performanceIndex)}</p>
          {!compact && <p className="tabular text-[11px] text-muted-foreground">{fmt.kwh(v.post.days ? v.post.actualKwh / v.post.days : 0)}/day measured</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <OutcomeBadge outcome={v.outcome} />
        {!Number.isNaN(v.observedChangePts) && (
          <span className={cn("tabular font-semibold", v.observedChangePts > v.uncertaintyPts ? "text-teal-700" : v.observedChangePts < -v.uncertaintyPts ? "text-red-600" : "text-navy-800")}>
            {sign(v.observedChangePts)}{v.observedChangePts.toFixed(1)} pts <span className="font-normal text-muted-foreground">± {v.uncertaintyPts.toFixed(1)}</span>
          </span>
        )}
        {!compact && !Number.isNaN(v.rawChangePct) && (
          <span className="text-xs text-muted-foreground">Raw daily output {sign(v.rawChangePct)}{v.rawChangePct.toFixed(1)}% · irradiance {sign(v.irradianceChangePct)}{v.irradianceChangePct.toFixed(1)}%</span>
        )}
      </div>
      {!compact && (
        <p className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Observed change in weather-adjusted performance index. It may also reflect seasonal conditions, model error, data gaps or other site changes, and is not attributed solely to the maintenance performed.
          {v.usedOverrides && " Includes manually entered performance values."}
        </p>
      )}
    </div>
  );
}
