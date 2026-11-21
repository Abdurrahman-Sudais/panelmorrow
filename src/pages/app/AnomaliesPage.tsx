import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Activity, AlertOctagon, Download, Loader2, PlayCircle, Search, ShieldAlert, TrendingDown, Waves, Zap } from "lucide-react";
import type { Anomaly, AnomalyType } from "@/types";
import { usePortfolio } from "@/hooks/usePortfolio";
import { modelsService } from "@/services/api/models";
import { fmt, cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/exporters";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AnomalyStatusBadge, ConfidenceMeter, SeverityBadge, SimulatedTag } from "@/components/common/badges";
import { AnomalyActions, AnomalyDetail } from "@/components/domain/AnomalyDetail";

const TYPES: { t: AnomalyType; icon: typeof Activity }[] = [
  { t: "Unexpected generation drop", icon: TrendingDown },
  { t: "Persistent underperformance", icon: Activity },
  { t: "Irregular generation pattern", icon: Waves },
  { t: "Sudden performance change", icon: Zap },
  { t: "Potential equipment-related issue", icon: ShieldAlert },
];

export default function AnomaliesPage() {
  const p = usePortfolio();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("active");
  const [selected, setSelected] = useState<Anomaly | null>(null);
  const [running, setRunning] = useState(false);

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    return p.allAnomalies.filter(
      (a) =>
        (type === "all" || a.type === type) &&
        (sev === "all" || a.severity === sev) &&
        (status === "all" || (status === "active" ? a.status !== "Resolved" : a.status === status)) &&
        (!term || (p.siteById.get(a.siteId)?.name ?? "").toLowerCase().includes(term)),
    );
  }, [p, q, type, sev, status]);

  const active = p.allAnomalies.filter((a) => a.status !== "Resolved");
  const current = selected ? p.allAnomalies.find((a) => a.id === selected.id) ?? selected : null;

  const rerun = async () => {
    setRunning(true);
    const results = await Promise.all(p.state.sites.map((s) => modelsService.runAnomalyDetection(s, p.state.records[s.id] ?? [], p.asOf)));
    setRunning(false);
    toast.success(`Simulated detection complete — ${results.flat().length} active patterns across ${p.state.sites.length} sites`, {
      description: "In production this runs nightly via a scheduled Lambda calling SageMaker AI.",
    });
  };

  const exportCsv = () =>
    downloadCsv(
      "panelmorrow-anomalies.csv",
      rows.map((a) => ({
        anomaly_id: a.id,
        site_id: a.siteId,
        site: p.siteById.get(a.siteId)?.name,
        type: a.type,
        detected: a.detectedAt,
        window_start: a.windowStart,
        window_end: a.windowEnd,
        severity: a.severity,
        status: a.status,
        expected_kwh_simulated: a.expectedKwh,
        actual_kwh_measured: a.actualKwh,
        estimated_loss_kwh: a.lossKwh,
        model_confidence: a.confidence,
        model_version: a.modelVersion,
        suggested_action: a.suggestedAction,
      })),
    );

  return (
    <div>
      <PageHeader
        title="Anomaly monitoring"
        eyebrow={<SimulatedTag label="Simulated anomaly model" />}
        description="Unusual generation patterns detected against weather-adjusted expectations. Anomalies flag where to look — they do not diagnose specific equipment faults."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download />Export CSV</Button>
            <Button variant="solar" onClick={rerun} disabled={running}>{running ? <Loader2 className="animate-spin" /> : <PlayCircle />}Run detection</Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {TYPES.map(({ t, icon: Icon }) => {
          const list = active.filter((a) => a.type === t);
          return (
            <button
              key={t}
              onClick={() => setType(type === t ? "all" : t)}
              className={cn("rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md", type === t && "border-solar-400 ring-1 ring-solar-400")}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-solar-500" />
                <span className="tabular text-xl font-bold text-navy-900">{list.length}</span>
              </div>
              <p className="mt-2 text-[12.5px] font-medium leading-snug text-navy-800">{t}</p>
              <p className="tabular mt-1 text-[11px] text-muted-foreground">{fmt.kwh(list.reduce((s, a) => s + a.lossKwh, 0))} est. loss</p>
            </button>
          );
        })}
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by site…" className="pl-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="lg:w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All anomaly types</SelectItem>
              {TYPES.map(({ t }) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sev} onValueChange={setSev}>
            <SelectTrigger className="lg:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {["Critical", "High", "Medium", "Low"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="lg:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (open + ack.)</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Acknowledged">Acknowledged</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solar site</TableHead>
              <TableHead>Anomaly</TableHead>
              <TableHead>Detected</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Est. loss</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Suggested next action</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => setSelected(a)}>
                <TableCell className="min-w-[160px]">
                  <Link to={`/app/sites/${a.siteId}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-navy-900 hover:text-solar-600">{p.siteById.get(a.siteId)?.name}</Link>
                  <p className="text-[11px] text-muted-foreground">{a.siteId}</p>
                </TableCell>
                <TableCell className="min-w-[170px] text-[13px]">{a.type}</TableCell>
                <TableCell className="tabular whitespace-nowrap text-muted-foreground">{fmt.date(a.detectedAt)}</TableCell>
                <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                <TableCell className="tabular whitespace-nowrap text-right text-violet-700">{fmt.kwh(a.expectedKwh)}</TableCell>
                <TableCell className="tabular whitespace-nowrap text-right">{fmt.kwh(a.actualKwh)}</TableCell>
                <TableCell className="tabular whitespace-nowrap text-right font-semibold text-red-600">{fmt.kwh(a.lossKwh)}</TableCell>
                <TableCell><ConfidenceMeter value={a.confidence} /></TableCell>
                <TableCell className="min-w-[240px] max-w-[300px] text-xs text-muted-foreground"><span className="line-clamp-2">{a.suggestedAction}</span></TableCell>
                <TableCell><AnomalyStatusBadge status={a.status} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={10} className="py-12 text-center text-muted-foreground"><AlertOctagon className="mx-auto mb-2 h-5 w-5" />No anomalies match these filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <p className="border-t px-4 py-3 text-[11px] text-muted-foreground">
          Expected values are simulated model predictions; actual values are measurements. Confidence reflects the simulated model’s certainty that the pattern is real, not certainty about its cause.
        </p>
      </Card>

      <Dialog open={!!current} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle>{current.type}</DialogTitle>
                <DialogDescription>{p.siteById.get(current.siteId)?.name}</DialogDescription>
              </DialogHeader>
              <AnomalyDetail a={current} siteName={p.siteById.get(current.siteId)?.name} />
              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                <AnomalyActions a={current} size="default" />
                <Button asChild variant="ghost"><Link to={`/app/sites/${current.siteId}`}>View site</Link></Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
