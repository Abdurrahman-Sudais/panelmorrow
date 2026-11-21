import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, CircleDot, Lightbulb, RotateCcw } from "lucide-react";
import type { Anomaly } from "@/types";
import { fmt } from "@/lib/utils";
import { operationsService } from "@/services/api/operations";
import { Button } from "@/components/ui/button";
import { AnomalyStatusBadge, ConfidenceMeter, SeverityBadge, SimulatedTag } from "@/components/common/badges";

export function AnomalyActions({ a, size = "sm" }: { a: Anomaly; size?: "sm" | "default" }) {
  const set = async (s: Anomaly["status"]) => {
    await operationsService.setAnomalyStatus(a.id, s);
    toast.success(`Anomaly marked ${s.toLowerCase()}`);
  };
  if (a.id.endsWith(":hist")) return <span className="text-xs text-muted-foreground">Closed by maintenance</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {a.status === "Open" && <Button size={size} variant="outline" onClick={() => set("Acknowledged")}><CircleDot />Acknowledge</Button>}
      {a.status !== "Resolved" && <Button size={size} variant="outline" onClick={() => set("Resolved")}><CheckCircle2 />Resolve</Button>}
      {a.status !== "Open" && <Button size={size} variant="ghost" onClick={() => set("Open")}><RotateCcw />Reopen</Button>}
    </div>
  );
}

export function AnomalyDetail({ a, siteName, showSite = true }: { a: Anomaly; siteName?: string; showSite?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={a.severity} />
        <AnomalyStatusBadge status={a.status} />
        <SimulatedTag label={a.modelVersion} />
      </div>
      {showSite && siteName && (
        <p className="text-sm">
          <span className="text-muted-foreground">Site: </span>
          <Link to={`/app/sites/${a.siteId}`} className="font-semibold text-navy-900 hover:text-solar-600">{siteName}</Link>
        </p>
      )}
      <p className="text-sm leading-relaxed text-navy-800">{a.summary}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Detected", fmt.date(a.detectedAt)],
          ["Window", `${fmt.shortDate(a.windowStart)} – ${fmt.shortDate(a.windowEnd)}`],
          ["Shortfall", fmt.pct(a.deficitPct * 100)],
          ["Expected (simulated)", fmt.kwh(a.expectedKwh)],
          ["Actual (measured)", fmt.kwh(a.actualKwh)],
          ["Estimated loss", fmt.kwh(a.lossKwh)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border bg-secondary/40 p-2.5">
            <p className="text-[11px] text-muted-foreground">{l}</p>
            <p className="tabular text-sm font-semibold text-navy-900">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-xs text-muted-foreground">Model confidence (simulated)</span>
        <ConfidenceMeter value={a.confidence} />
      </div>
      <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-800"><Lightbulb className="h-3.5 w-3.5" />Suggested next action</p>
        <p className="mt-1 text-sm leading-relaxed text-teal-900">{a.suggestedAction}</p>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        This anomaly describes an unusual generation pattern. It does not identify a specific equipment fault; confirm the cause through inspection.
      </p>
    </div>
  );
}
