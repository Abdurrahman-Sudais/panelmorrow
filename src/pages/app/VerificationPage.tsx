import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Calendar, ClipboardCheck, DollarSign, Plus, Trash2, TrendingUp, Wrench } from "lucide-react";
import type { MaintenanceRecord } from "@/types";
import { usePortfolio } from "@/hooks/usePortfolio";
import { operationsService } from "@/services/api/operations";
import { sliceByDate, verifyRepair } from "@/services/analysis/engine";
import { addDays } from "@/data/generator";
import { TECHNICIANS } from "@/data/team";
import { fmt, uid } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { OutcomeBadge, VerificationSummary } from "@/components/domain/VerificationSummary";
import { MeasuredTag, SimulatedTag } from "@/components/common/badges";

const optionalPct = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(0, "0–150").max(150, "0–150").optional());

const schema = z.object({
  siteId: z.string().min(1, "Select a site"),
  inspectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date"),
  identifiedProblem: z.string().min(5, "Describe what was found (5+ characters)"),
  maintenancePerformed: z.string().min(5, "Describe the work performed (5+ characters)"),
  technician: z.string().min(2, "Technician is required"),
  repairCostUsd: z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Cost cannot be negative").max(10_000_000),
  windowDays: z.coerce.number().int().min(3).max(60),
  prePerformanceOverride: optionalPct,
  postPerformanceOverride: optionalPct,
  notes: z.string().max(1000).optional(),
  resolveAnomalies: z.boolean(),
});
type Values = z.infer<typeof schema>;

function RecordForm({ onDone, defaultSite }: { onDone: () => void; defaultSite?: string }) {
  const p = usePortfolio();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId: defaultSite ?? "",
      inspectionDate: addDays(p.asOf, -20),
      identifiedProblem: "",
      maintenancePerformed: "",
      technician: TECHNICIANS[0],
      repairCostUsd: 0,
      windowDays: 14,
      notes: "",
      resolveAnomalies: true,
    } as Values,
  });
  const watched = useWatch({ control: form.control });
  const preview = useMemo(() => {
    if (!watched.siteId || !watched.inspectionDate) return null;
    const recs = p.state.records[watched.siteId] ?? [];
    if (!recs.length) return null;
    const pre = watched.prePerformanceOverride as unknown;
    const post = watched.postPerformanceOverride as unknown;
    return verifyRepair(
      {
        id: "preview",
        siteId: watched.siteId,
        inspectionDate: watched.inspectionDate,
        windowDays: Number(watched.windowDays) || 14,
        prePerformanceOverride: pre === "" || pre == null ? undefined : Number(pre),
        postPerformanceOverride: post === "" || post == null ? undefined : Number(post),
      } as MaintenanceRecord,
      recs,
    );
  }, [watched, p.state.records]);

  const onSubmit = async (v: Values) => {
    const rec = p.recommendations.find((r) => r.siteId === v.siteId);
    const m: MaintenanceRecord = {
      id: uid("mnt"),
      siteId: v.siteId,
      inspectionDate: v.inspectionDate,
      identifiedProblem: v.identifiedProblem,
      maintenancePerformed: v.maintenancePerformed,
      technician: v.technician,
      repairCostUsd: v.repairCostUsd,
      windowDays: v.windowDays,
      prePerformanceOverride: v.prePerformanceOverride,
      postPerformanceOverride: v.postPerformanceOverride,
      notes: v.notes || undefined,
      linkedRecommendationId: rec?.id,
      createdAt: new Date().toISOString(),
    };
    await operationsService.addMaintenance(m);
    if (v.resolveAnomalies) {
      const site = p.summaries.find((s) => s.site.id === v.siteId);
      await Promise.all((site?.openAnomalies ?? []).map((a) => operationsService.setAnomalyStatus(a.id, "Resolved")));
    }
    toast.success("Maintenance record saved", { description: "Before/after comparison calculated from weather-adjusted performance." });
    onDone();
  };

  const sitesWithData = p.state.sites.filter((s) => (p.state.records[s.id] ?? []).length);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
        <FormField control={form.control} name="siteId" render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Solar site</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a site…" /></SelectTrigger></FormControl>
              <SelectContent>{sitesWithData.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.id})</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="inspectionDate" render={({ field }) => (
          <FormItem><FormLabel>Inspection date</FormLabel><FormControl><Input type="date" max={p.asOf} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="technician" render={({ field }) => (
          <FormItem>
            <FormLabel>Technician</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>{TECHNICIANS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="identifiedProblem" render={({ field }) => (
          <FormItem className="md:col-span-2"><FormLabel>Identified problem</FormLabel><FormControl><Textarea rows={2} placeholder="What was found on site?" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="maintenancePerformed" render={({ field }) => (
          <FormItem className="md:col-span-2"><FormLabel>Maintenance performed</FormLabel><FormControl><Textarea rows={2} placeholder="What work was carried out?" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="repairCostUsd" render={({ field }) => (
          <FormItem><FormLabel>Repair cost (USD)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="windowDays" render={({ field }) => (
          <FormItem>
            <FormLabel>Comparison window</FormLabel>
            <Select onValueChange={field.onChange} value={String(field.value)}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>{[7, 14, 21, 30].map((d) => <SelectItem key={d} value={String(d)}>{d} days before / after</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="prePerformanceOverride" render={({ field }) => (
          <FormItem><FormLabel>Pre-maintenance performance (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Auto from data" {...field} value={(field.value as number | undefined) ?? ""} /></FormControl><FormDescription>Optional manual override</FormDescription><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="postPerformanceOverride" render={({ field }) => (
          <FormItem><FormLabel>Post-maintenance performance (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Auto from data" {...field} value={(field.value as number | undefined) ?? ""} /></FormControl><FormDescription>Optional manual override</FormDescription><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem className="md:col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="resolveAnomalies" render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0 md:col-span-2">
            <FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /></FormControl>
            <FormLabel className="font-normal">Mark this site’s open anomalies as resolved</FormLabel>
          </FormItem>
        )} />
        {preview && (
          <div className="rounded-lg border bg-secondary/40 p-4 md:col-span-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live comparison preview</p>
            <VerificationSummary v={preview} />
          </div>
        )}
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
          <Button type="submit" variant="solar" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save record"}</Button>
        </div>
      </form>
    </Form>
  );
}

export default function VerificationPage() {
  const p = usePortfolio();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(!!params.get("site"));
  const [siteFilter, setSiteFilter] = useState("all");

  const records = p.state.maintenance
    .filter((m) => siteFilter === "all" || m.siteId === siteFilter)
    .sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));
  const all = p.state.maintenance.map((m) => p.verifications.get(m.id)!).filter(Boolean);
  const valid = all.filter((v) => v.outcome !== "Insufficient data");
  const improved = valid.filter((v) => v.outcome === "Improvement observed").length;
  const totalCost = p.state.maintenance.reduce((a, m) => a + m.repairCostUsd, 0);
  const avgChange = valid.length ? valid.reduce((a, v) => a + v.observedChangePts, 0) / valid.length : NaN;

  const close = () => {
    setOpen(false);
    if (params.get("site")) setParams({});
  };

  return (
    <div>
      <PageHeader
        title="Repair verification"
        description="Record inspections and repairs, then compare weather-adjusted performance before and after each visit."
        actions={<Button variant="solar" onClick={() => setOpen(true)}><Plus />Record maintenance</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Maintenance records" value={p.state.maintenance.length} icon={Wrench} />
        <StatCard label="Improvement observed" value={`${improved} of ${valid.length}`} icon={TrendingUp} tone="teal" hint="beyond uncertainty band" />
        <StatCard label="Avg. observed change" value={Number.isNaN(avgChange) ? "—" : `${avgChange > 0 ? "+" : ""}${avgChange.toFixed(1)} pts`} icon={ClipboardCheck} tone="solar" hint="weather-adjusted performance index" />
        <StatCard label="Total repair spend" value={fmt.usd(totalCost)} icon={DollarSign} tone="navy" />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-navy-900">Verification history</h2>
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sites</SelectItem>
            {[...new Set(p.state.maintenance.map((m) => m.siteId))].map((id) => <SelectItem key={id} value={id}>{p.siteById.get(id)?.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 space-y-4">
        {records.length === 0 && <EmptyState icon={ClipboardCheck} title="No maintenance records" description="Record an inspection to verify its effect on performance." />}
        {records.map((m) => {
          const v = p.verifications.get(m.id)!;
          const site = p.siteById.get(m.siteId);
          const recs = sliceByDate(p.state.records[m.siteId] ?? [], addDays(m.inspectionDate, -m.windowDays * 2), addDays(m.inspectionDate, m.windowDays * 2));
          return (
            <Card key={m.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <Link to={`/app/sites/${m.siteId}`} className="hover:text-solar-600">{site?.name}</Link>
                    <OutcomeBadge outcome={v.outcome} />
                  </CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmt.date(m.inspectionDate)}</span>
                    <span>{m.technician}</span>
                    <span>{fmt.usd(m.repairCostUsd)}</span>
                  </CardDescription>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete record"
                  onClick={async () => {
                    if (!confirm("Delete this maintenance record? This cannot be undone.")) return;
                    await operationsService.deleteMaintenance(m.id);
                    toast("Maintenance record deleted");
                  }}
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-5">
                <div className="space-y-3 text-sm lg:col-span-2">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identified problem</p><p className="mt-0.5">{m.identifiedProblem}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maintenance performed</p><p className="mt-0.5">{m.maintenancePerformed}</p></div>
                  {m.notes && <p className="text-muted-foreground">{m.notes}</p>}
                  <VerificationSummary v={v} />
                  {v.outcome === "Improvement observed" && v.estimatedDailyGainKwh > 0 && (
                    <p className="rounded-md bg-teal-50 p-2 text-xs text-teal-900">
                      If sustained, the observed change corresponds to roughly <strong>{fmt.kwh(v.estimatedDailyGainKwh)}/day</strong> at current weather — an estimate, not a guaranteed repair benefit.
                    </p>
                  )}
                </div>
                <div className="lg:col-span-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Before / after generation</p>
                    <div className="flex gap-1.5"><MeasuredTag /><SimulatedTag label="Expected" /></div>
                  </div>
                  {recs.length ? (
                    <PerformanceChart records={recs} height={230} markers={[{ date: m.inspectionDate, label: "Visit", color: "#0FA08E" }]} />
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">No generation data around this date.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record maintenance</DialogTitle>
            <DialogDescription>Pre- and post-maintenance performance are calculated automatically from weather-adjusted data unless overridden.</DialogDescription>
          </DialogHeader>
          <RecordForm onDone={close} defaultSite={params.get("site") ?? undefined} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
