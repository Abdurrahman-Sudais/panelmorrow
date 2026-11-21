import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronDown, Download, MapPin, RotateCcw, SlidersHorizontal, Truck, UserPlus, X } from "lucide-react";
import type { PriorityWeights, Recommendation } from "@/types";
import { usePortfolio } from "@/hooks/usePortfolio";
import { operationsService } from "@/services/api/operations";
import { DEFAULT_WEIGHTS } from "@/services/analysis/engine";
import { addDays } from "@/data/generator";
import { TECHNICIANS } from "@/data/team";
import { fmt, cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/exporters";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecStatusBadge, SeverityBadge, SimulatedTag } from "@/components/common/badges";


const WEIGHT_LABELS: Record<keyof PriorityWeights, { label: string; help: string }> = {
  recoverable: { label: "Recoverable energy", help: "Estimated kWh recoverable over 90 days" },
  loss: { label: "Energy lost (30d)", help: "Shortfall vs expected, last 30 days" },
  severity: { label: "Anomaly severity", help: "Most severe active anomaly" },
  urgency: { label: "Maintenance urgency", help: "Severity + how long losses have persisted" },
  travel: { label: "Travel distance / effort", help: "Closer sites score higher" },
  access: { label: "Site accessibility", help: "Easier access scores higher" },
};

const SEG_COLORS: Record<keyof PriorityWeights, string> = {
  recoverable: "#F08A0C",
  loss: "#DC2626",
  severity: "#1D3560",
  urgency: "#7890B5",
  travel: "#0FA08E",
  access: "#56D7C2",
};

function WeightsPanel() {
  const p = usePortfolio();
  const [w, setW] = useState<PriorityWeights>(p.state.weights);
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  const dirty = JSON.stringify(w) !== JSON.stringify(p.state.weights);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-solar-500" />Prioritisation weights</CardTitle>
        <CardDescription>Tune how each factor contributes to the priority score. Weights are normalised to 100.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(WEIGHT_LABELS) as (keyof PriorityWeights)[]).map((k) => (
          <div key={k}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full" style={{ background: SEG_COLORS[k] }} />{WEIGHT_LABELS[k].label}</span>
              <span className="tabular text-xs text-muted-foreground">{total ? Math.round((w[k] / total) * 100) : 0}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={w[k]}
              onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
              className="mt-1.5 w-full accent-solar-500"
              aria-label={WEIGHT_LABELS[k].label}
            />
            <p className="text-[11px] text-muted-foreground">{WEIGHT_LABELS[k].help}</p>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="solar" disabled={!dirty || total === 0} onClick={async () => { await operationsService.setWeights(w); toast.success("Queue re-ranked with new weights"); }}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={async () => { setW(DEFAULT_WEIGHTS); await operationsService.setWeights(DEFAULT_WEIGHTS); }}><RotateCcw />Defaults</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ r, onAssign, onDismiss }: { r: Recommendation; onAssign: () => void; onDismiss: () => void }) {
  const p = usePortfolio();
  const [open, setOpen] = useState(r.rank <= 2);
  const site = p.siteById.get(r.siteId)!;
  const anomalies = p.allAnomalies.filter((a) => r.anomalyIds.includes(a.id));
  const worst = anomalies[0];
  const update = (o: Partial<Recommendation>) => operationsService.updateRecommendation(r.siteId, { status: r.status, assignee: r.assignee, scheduledFor: r.scheduledFor, note: r.note, ...o });

  return (
    <Card className={cn("overflow-hidden transition-shadow", r.status === "Dismissed" && "opacity-60")}>
      <div className="flex flex-col gap-4 p-4 2xl:flex-row 2xl:items-center">
        <div className="flex items-center gap-4 2xl:w-[38%]">
          <div className={cn("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-white", r.rank <= 3 ? "bg-solar-500" : "bg-navy-900")}>
            <span className="text-[9px] font-semibold uppercase opacity-80">Rank</span>
            <span className="text-lg font-bold leading-none">{r.rank}</span>
          </div>
          <div className="min-w-0">
            <Link to={`/app/sites/${site.id}`} className="block truncate font-semibold text-navy-900 hover:text-solar-600">{site.name}</Link>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{site.location.city} · {fmt.kw(site.capacityKw)} · {site.travelKm} km · {site.accessibility} access</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {worst && <SeverityBadge severity={worst.severity} />}
              <RecStatusBadge status={r.status} />
              {r.assignee && <span className="text-[11px] text-muted-foreground">→ {r.assignee}{r.scheduledFor ? ` · ${fmt.shortDate(r.scheduledFor)}` : ""}</span>}
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-3 rounded-lg bg-secondary/40 p-3 2xl:bg-transparent 2xl:p-0">
          <div><p className="text-[11px] text-muted-foreground">Priority score</p><p className="tabular text-xl font-bold text-solar-600">{r.score.toFixed(0)}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Lost (30d)</p><p className="tabular font-semibold text-navy-900">{fmt.kwh(r.factors.lossKwh)}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Recoverable (90d)</p><p className="tabular font-semibold text-teal-700">{fmt.kwh(r.factors.recoverableKwh)}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 2xl:justify-end">
          {r.status === "Pending" && <Button size="sm" variant="outline" onClick={async () => { await update({ status: "Approved" }); toast.success(`Inspection approved for ${site.name}`); }}><Check />Approve</Button>}
          {r.status !== "Dismissed" && <Button size="sm" variant={r.status === "Approved" ? "solar" : "outline"} onClick={onAssign}><UserPlus />{r.status === "Assigned" ? "Reassign" : "Assign"}</Button>}
          {r.status !== "Dismissed" ? (
            <Button size="sm" variant="ghost" onClick={onDismiss}><X />Dismiss</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => update({ status: "Pending", note: undefined })}><RotateCcw />Restore</Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setOpen(!open)} aria-label="Toggle details"><ChevronDown className={cn("transition-transform", open && "rotate-180")} /></Button>
        </div>
      </div>
      {/* contribution bar */}
      <div className="flex h-1.5 w-full bg-secondary">
        {r.contributions.map((c) => <div key={c.key} style={{ width: `${c.value}%`, background: SEG_COLORS[c.key] }} title={`${c.label}: ${c.value}`} />)}
      </div>
      {open && (
        <div className="grid gap-6 border-t bg-secondary/30 p-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why this site was prioritised</p>
            <ul className="space-y-2 text-sm text-navy-800">
              {r.reasons.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-solar-500" />{x}</li>)}
            </ul>
            {anomalies.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked anomalies</p>
                {anomalies.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <SeverityBadge severity={a.severity} /><span className="font-medium">{a.type}</span><span className="text-muted-foreground">since {fmt.shortDate(a.windowStart)} · {Math.round(a.confidence * 100)}% conf.</span>
                  </div>
                ))}
              </div>
            )}
            {r.note && <p className="mt-3 rounded-md bg-white p-2 text-xs text-muted-foreground"><strong>Note:</strong> {r.note}</p>}
          </div>
          <div className="lg:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score breakdown</p>
            <div className="space-y-1.5">
              {r.contributions.map((c) => (
                <div key={c.key} className="flex items-center gap-2 text-xs">
                  <span className="w-36 shrink-0 text-muted-foreground">{c.label}</span>
                  <div className="h-2 flex-1 rounded-full bg-white"><div className="h-full rounded-full" style={{ width: `${Math.min(100, c.value * 3)}%`, background: SEG_COLORS[c.key] }} /></div>
                  <span className="tabular w-9 text-right font-semibold">{c.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Recoverable energy is a simulated estimate assuming the shortfall persists and a visit restores a type-dependent share of it.</p>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function MaintenancePage() {
  const p = usePortfolio();
  const [tab, setTab] = useState("active");
  const [assignFor, setAssignFor] = useState<Recommendation | null>(null);
  const [dismissFor, setDismissFor] = useState<Recommendation | null>(null);
  const [tech, setTech] = useState(TECHNICIANS[0]);
  const [date, setDate] = useState(addDays(p.asOf, 2));
  const [note, setNote] = useState("");

  const list = useMemo(
    () => p.recommendations.filter((r) => (tab === "active" ? r.status !== "Dismissed" : tab === "all" ? true : r.status === tab)),
    [p.recommendations, tab],
  );
  const counts = (s: string) => p.recommendations.filter((r) => r.status === s).length;
  const activeRecs = p.recommendations.filter((r) => r.status !== "Dismissed");

  const exportCsv = () =>
    downloadCsv(
      "panelmorrow-inspection-queue.csv",
      p.recommendations.map((r) => ({
        rank: r.rank,
        site_id: r.siteId,
        site: p.siteById.get(r.siteId)?.name,
        score: r.score,
        status: r.status,
        assignee: r.assignee ?? "",
        scheduled_for: r.scheduledFor ?? "",
        loss_kwh_30d: r.factors.lossKwh,
        recoverable_kwh_90d_simulated: r.factors.recoverableKwh,
        travel_km: r.factors.travelKm,
        accessibility: r.factors.accessibility,
        reasons: r.reasons.join(" | "),
      })),
    );

  return (
    <div>
      <PageHeader
        title="Inspection queue"
        eyebrow={<SimulatedTag label="Simulated recommendation engine" />}
        description="Sites ranked by recoverable energy, losses, anomaly severity, urgency, travel effort and accessibility. Approve, assign or dismiss each recommendation."
        actions={<Button variant="outline" onClick={exportCsv}><Download />Export queue</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Recommended inspections", v: activeRecs.length },
          { l: "Awaiting triage", v: counts("Pending") },
          { l: "Assigned to technicians", v: counts("Assigned") },
          { l: "Recoverable if all addressed (90d)", v: fmt.kwh(activeRecs.reduce((a, r) => a + r.factors.recoverableKwh, 0)) },
        ].map((k) => (
          <Card key={k.l} className="p-4"><p className="text-xs text-muted-foreground">{k.l}</p><p className="tabular mt-1 text-2xl font-bold text-navy-900">{k.v}</p></Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px] [&>*]:min-w-0">
        <div>
          <Tabs value={tab} onValueChange={setTab} className="mb-4">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="active">Active ({activeRecs.length})</TabsTrigger>
              <TabsTrigger value="Pending">Pending ({counts("Pending")})</TabsTrigger>
              <TabsTrigger value="Approved">Approved ({counts("Approved")})</TabsTrigger>
              <TabsTrigger value="Assigned">Assigned ({counts("Assigned")})</TabsTrigger>
              <TabsTrigger value="Dismissed">Dismissed ({counts("Dismissed")})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-3">
            {list.map((r) => (
              <RecommendationCard
                key={r.id}
                r={r}
                onAssign={() => { setAssignFor(r); setTech(r.assignee ?? TECHNICIANS[0]); setDate(r.scheduledFor ?? addDays(p.asOf, 2)); setNote(r.note ?? ""); }}
                onDismiss={() => { setDismissFor(r); setNote(""); }}
              />
            ))}
            {list.length === 0 && <EmptyState icon={Truck} title="Nothing here" description="No recommendations in this state." />}
          </div>
        </div>
        <div className="space-y-6">
          <WeightsPanel />
          <Card className="p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-navy-900">How ranking works</p>
            Each factor is normalised across the queue (0–1), multiplied by its weight, and summed to a 0–100 score. Recommendations are generated only for sites with unresolved anomalies.
          </Card>
        </div>
      </div>

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign inspection</DialogTitle>
            <DialogDescription>{assignFor && p.siteById.get(assignFor.siteId)?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Technician</Label>
              <Select value={tech} onValueChange={setTech}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TECHNICIANS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Scheduled date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Instructions (optional)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Review inverter logs remotely before travelling." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button
              variant="solar"
              disabled={!date}
              onClick={async () => {
                await operationsService.updateRecommendation(assignFor!.siteId, { status: "Assigned", assignee: tech, scheduledFor: date, note: note || undefined });
                toast.success(`Assigned to ${tech} for ${fmt.date(date)}`);
                setAssignFor(null);
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dismissFor} onOpenChange={(o) => !o && setDismissFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss recommendation</DialogTitle>
            <DialogDescription>Record why this inspection isn’t needed. Dismissed items can be restored.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Known grid curtailment by DisCo during this period." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissFor(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={note.trim().length < 3}
              onClick={async () => {
                await operationsService.updateRecommendation(dismissFor!.siteId, { status: "Dismissed", note });
                toast("Recommendation dismissed");
                setDismissFor(null);
              }}
            >
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
