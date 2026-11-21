import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, FileText, Loader2, Sparkles } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { computeMetrics, sliceByDate } from "@/services/analysis/engine";
import { summariesService } from "@/services/api/summaries";
import { useAuth } from "@/context/AuthContext";
import { addDays } from "@/data/generator";
import { sumByDate, weekly } from "@/lib/aggregate";
import { fmt } from "@/lib/utils";
import { downloadSectionedCsv } from "@/lib/exporters";
import { buildPdfReport, type PdfSection } from "@/lib/pdfReport";
import { PageHeader } from "@/components/common/PageHeader";
import { Field } from "@/components/common/Field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { SimulatedTag } from "@/components/common/badges";

type SectionKey = "sites" | "losses" | "anomalies" | "priorities" | "repairs" | "trend";
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "sites", label: "Site performance summaries" },
  { key: "losses", label: "Energy losses" },
  { key: "anomalies", label: "Detected anomalies" },
  { key: "priorities", label: "Maintenance priorities" },
  { key: "repairs", label: "Repair outcomes" },
  { key: "trend", label: "Portfolio performance trend" },
];

const TEMPLATES: Record<string, { label: string; sections: SectionKey[] }> = {
  full: { label: "Full portfolio performance report", sections: ["trend", "sites", "losses", "anomalies", "priorities", "repairs"] },
  ops: { label: "Weekly operations brief", sections: ["anomalies", "priorities"] },
  client: { label: "Client performance summary", sections: ["trend", "sites", "repairs"] },
  maintenance: { label: "Maintenance outcomes review", sections: ["priorities", "repairs"] },
};

export default function ReportsPage() {
  const p = usePortfolio();
  const { session } = useAuth();
  const [template, setTemplate] = useState("full");
  const [range, setRange] = useState("30");
  const [scope, setScope] = useState("portfolio");
  const [sections, setSections] = useState<Set<SectionKey>>(new Set(TEMPLATES.full.sections));
  const [summary, setSummary] = useState<{ text: string; source: string } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const from = addDays(p.asOf, -(Number(range) - 1));
  const periodLabel = `${fmt.date(from)} – ${fmt.date(p.asOf)}`;

  const data = useMemo(() => {
    const sums = p.summaries.filter((s) => (scope === "portfolio" || s.site.id === scope) && (p.state.records[s.site.id] ?? []).length);
    const ids = new Set(sums.map((s) => s.site.id));
    const rows = sums.map((s) => {
      const recs = sliceByDate(p.state.records[s.site.id], from, p.asOf);
      return { s, m: computeMetrics(s.site, recs), recs };
    });
    const actual = rows.reduce((a, r) => a + r.m.actualKwh, 0);
    const expected = rows.reduce((a, r) => a + r.m.expectedKwh, 0);
    const loss = rows.reduce((a, r) => a + r.m.lossKwh, 0);
    const anomalies = p.allAnomalies.filter((a) => ids.has(a.siteId) && a.windowEnd >= from);
    const recs = p.recommendations.filter((r) => ids.has(r.siteId) && r.status !== "Dismissed");
    const repairs = p.state.maintenance.filter((m) => ids.has(m.siteId) && m.inspectionDate >= addDays(from, -60));
    const trend = sumByDate(rows.map((r) => r.recs));
    return { rows, actual, expected, loss, pi: expected ? (actual / expected) * 100 : NaN, anomalies, recs, repairs, trend, capacity: sums.reduce((a, s) => a + s.site.capacityKw, 0) };
  }, [p, scope, from]);

  const scopeLabel = scope === "portfolio" ? "Entire portfolio" : p.siteById.get(scope)?.name ?? scope;
  const title = TEMPLATES[template].label;

  const applyTemplate = (t: string) => {
    setTemplate(t);
    setSections(new Set(TEMPLATES[t].sections));
  };
  const toggle = (k: SectionKey) => setSections((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const genSummary = async () => {
    setLoadingSummary(true);
    const res = await summariesService.generate({
      periodLabel: `the ${range}-day period ${periodLabel}`,
      siteCount: data.rows.length,
      performanceIndex: data.pi,
      lossKwh: data.loss,
      recoverableKwh: data.recs.reduce((a, r) => a + r.factors.recoverableKwh, 0),
      openAnomalies: data.anomalies.filter((a) => a.status !== "Resolved").length,
      criticalAnomalies: data.anomalies.filter((a) => a.status !== "Resolved" && a.severity === "Critical").length,
      topSites: data.recs.slice(0, 3).map((r) => ({ name: p.siteById.get(r.siteId)!.name, lossKwh: r.factors.lossKwh, reason: p.allAnomalies.find((a) => a.id === r.anomalyIds[0])?.type.toLowerCase() ?? "underperformance" })),
      repairs: data.repairs.map((m) => { const v = p.verifications.get(m.id)!; return { site: p.siteById.get(m.siteId)!.name, outcome: v.outcome, changePts: v.observedChangePts }; }),
    });
    setSummary({ text: res.text, source: res.source === "bedrock" ? "Generated by Amazon Bedrock" : "Simulated AI summary (Bedrock not connected)" });
    setLoadingSummary(false);
  };

  const tables = (): (PdfSection & { key: SectionKey; csv: Record<string, unknown>[] })[] => [
    {
      key: "sites",
      title: "Site performance summaries",
      note: "Performance index = measured ÷ simulated weather-adjusted expected.",
      head: ["Site", "Capacity", "Actual (kWh)", "Expected (kWh)", "Perf. index", "Status"],
      body: data.rows.map((r) => [r.s.site.name, fmt.kw(r.s.site.capacityKw), fmt.num(r.m.actualKwh), fmt.num(r.m.expectedKwh), fmt.pct(r.m.performanceIndex), r.s.status]),
      csv: data.rows.map((r) => ({ site_id: r.s.site.id, site: r.s.site.name, capacity_kw: r.s.site.capacityKw, actual_kwh_measured: Math.round(r.m.actualKwh), expected_kwh_simulated: Math.round(r.m.expectedKwh), performance_index_pct: r.m.performanceIndex.toFixed(1), status: r.s.status })),
    },
    {
      key: "losses",
      title: "Energy losses",
      note: "Estimated shortfall against simulated expected generation.",
      head: ["Site", "Lost (kWh)", "Share of portfolio loss", "Loss per kWp"],
      body: [...data.rows].sort((a, b) => b.m.lossKwh - a.m.lossKwh).map((r) => [r.s.site.name, fmt.num(r.m.lossKwh), fmt.pct((r.m.lossKwh / (data.loss || 1)) * 100), (r.m.lossKwh / r.s.site.capacityKw).toFixed(1)]),
      csv: data.rows.map((r) => ({ site_id: r.s.site.id, site: r.s.site.name, estimated_loss_kwh: Math.round(r.m.lossKwh), loss_kwh_per_kwp: (r.m.lossKwh / r.s.site.capacityKw).toFixed(2) })),
    },
    {
      key: "anomalies",
      title: "Detected anomalies",
      note: "Patterns only — causes require on-site confirmation. Confidence from simulated model.",
      head: ["Site", "Type", "Detected", "Severity", "Loss (kWh)", "Conf.", "Status"],
      body: data.anomalies.map((a) => [p.siteById.get(a.siteId)!.name, a.type, fmt.date(a.detectedAt), a.severity, fmt.num(a.lossKwh), `${Math.round(a.confidence * 100)}%`, a.status]),
      csv: data.anomalies.map((a) => ({ site_id: a.siteId, type: a.type, detected: a.detectedAt, severity: a.severity, expected_kwh_simulated: a.expectedKwh, actual_kwh_measured: a.actualKwh, loss_kwh: a.lossKwh, confidence: a.confidence, status: a.status, suggested_action: a.suggestedAction })),
    },
    {
      key: "priorities",
      title: "Maintenance priorities",
      note: "Recoverable energy is a simulated 90-day estimate.",
      head: ["Rank", "Site", "Score", "Lost 30d (kWh)", "Recoverable 90d (kWh)", "Status"],
      body: data.recs.map((r) => [r.rank, p.siteById.get(r.siteId)!.name, r.score.toFixed(0), fmt.num(r.factors.lossKwh), fmt.num(r.factors.recoverableKwh), r.status + (r.assignee ? ` (${r.assignee})` : "")]),
      csv: data.recs.map((r) => ({ rank: r.rank, site_id: r.siteId, score: r.score, loss_kwh_30d: r.factors.lossKwh, recoverable_kwh_90d: r.factors.recoverableKwh, status: r.status, assignee: r.assignee ?? "", reason: r.reasons[0] })),
    },
    {
      key: "repairs",
      title: "Repair outcomes",
      note: "Observed change in weather-adjusted performance; not attributed solely to the repair.",
      head: ["Site", "Date", "Work performed", "Cost", "Before", "After", "Change", "Outcome"],
      body: data.repairs.map((m) => { const v = p.verifications.get(m.id)!; return [p.siteById.get(m.siteId)!.name, fmt.date(m.inspectionDate), m.maintenancePerformed.slice(0, 60), fmt.usd(m.repairCostUsd), fmt.pct(v.pre.performanceIndex), fmt.pct(v.post.performanceIndex), `${v.observedChangePts >= 0 ? "+" : ""}${v.observedChangePts.toFixed(1)} ± ${v.uncertaintyPts.toFixed(1)}`, v.outcome]; }),
      csv: data.repairs.map((m) => { const v = p.verifications.get(m.id)!; return { site_id: m.siteId, inspection_date: m.inspectionDate, identified_problem: m.identifiedProblem, maintenance_performed: m.maintenancePerformed, technician: m.technician, repair_cost_usd: m.repairCostUsd, pre_performance_pct: v.pre.performanceIndex.toFixed(1), post_performance_pct: v.post.performanceIndex.toFixed(1), observed_change_pts: v.observedChangePts.toFixed(1), uncertainty_pts: v.uncertaintyPts.toFixed(1), outcome: v.outcome }; }),
    },
  ];

  const kpis = [
    { label: "Sites in scope", value: String(data.rows.length) },
    { label: "Installed capacity", value: fmt.kw(data.capacity) },
    { label: "Performance index", value: fmt.pct(data.pi) },
    { label: "Actual generation", value: fmt.kwh(data.actual) },
    { label: "Estimated energy loss", value: fmt.kwh(data.loss) },
    { label: "Active anomalies", value: String(data.anomalies.filter((a) => a.status !== "Resolved").length) },
  ];

  const exportPdf = () => {
    const doc = buildPdfReport({
      title,
      subtitle: `${scopeLabel} · ${periodLabel}`,
      generatedFor: session?.user.company ?? "PanelMorrow",
      kpis,
      summary: summary ?? undefined,
      trend: sections.has("trend") ? weekly(data.trend).map((t) => ({ label: fmt.shortDate(t.date), actual: t.actualKwh ?? 0, expected: t.expectedKwh })) : undefined,
      sections: tables().filter((t) => sections.has(t.key)),
      disclaimer: "Expected generation, losses, anomaly confidence and recoverable energy are estimates from a simulated model (demo). Anomalies indicate unusual output patterns and do not identify specific equipment faults.",
    });
    doc.save(`panelmorrow-${template}-${p.asOf}.pdf`);
    toast.success("PDF report downloaded");
  };

  const exportCsv = () => {
    const t = tables().filter((x) => sections.has(x.key));
    const trendRows = sections.has("trend") ? data.trend.map((r) => ({ date: r.date, actual_kwh_measured: r.actualKwh ?? "", expected_kwh_simulated: r.expectedKwh })) : [];
    downloadSectionedCsv(`panelmorrow-${template}-${p.asOf}.csv`, [
      { title: `${title} | ${scopeLabel} | ${periodLabel}`, rows: kpis.map((k) => ({ metric: k.label, value: k.value })) },
      ...t.map((x) => ({ title: x.title, rows: x.csv })),
      { title: "Portfolio performance trend (daily)", rows: trendRows },
    ]);
    toast.success("CSV report downloaded");
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate performance reports for clients, management and maintenance reviews. Export to PDF or CSV."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!sections.size}><FileSpreadsheet />Export CSV</Button>
            <Button variant="solar" onClick={exportPdf} disabled={!sections.size}><FileDown />Export PDF</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[320px_1fr] [&>*]:min-w-0">
        <Card className="h-fit">
          <CardHeader><CardTitle>Report builder</CardTitle><CardDescription>Choose a template, scope and sections</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Template">
              <Select value={template} onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TEMPLATES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Scope">
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portfolio">Entire portfolio</SelectItem>
                  {p.state.sites.filter((s) => (p.state.records[s.id] ?? []).length).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Period">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["7", "30", "90", "180"].map((r) => <SelectItem key={r} value={r}>Last {r} days</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sections</p>
              <div className="space-y-2.5">
                {SECTIONS.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <Checkbox id={`sec-${s.key}`} checked={sections.has(s.key)} onCheckedChange={() => toggle(s.key)} />
                    <Label htmlFor={`sec-${s.key}`} className="font-normal">{s.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={genSummary} disabled={loadingSummary}>
              {loadingSummary ? <Loader2 className="animate-spin" /> : <Sparkles />}Generate AI summary
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="overflow-hidden">
          <div className="bg-navy-900 px-6 py-5 text-white">
            <div className="flex items-center gap-2 text-xs text-navy-300"><FileText className="h-3.5 w-3.5" />Report preview</div>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
            <p className="text-sm text-navy-200">{scopeLabel} · {periodLabel}</p>
          </div>
          <CardContent className="space-y-8 p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-lg border bg-secondary/40 p-3">
                  <p className="text-[11px] text-muted-foreground">{k.label}</p>
                  <p className="tabular text-lg font-bold text-navy-900">{k.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-navy-900">Executive summary</p>
                <SimulatedTag label={summary?.source ?? "Bedrock summary (simulated)"} />
              </div>
              {summary ? (
                <p className="text-sm leading-relaxed text-navy-800">{summary.text}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click “Generate AI summary” to draft a narrative from this report’s figures. In production this calls Amazon Bedrock via the backend.</p>
              )}
            </div>

            {sections.has("trend") && (
              <section>
                <h3 className="mb-2 font-semibold text-navy-900">Portfolio performance trend</h3>
                <PerformanceChart records={Number(range) > 45 ? weekly(data.trend) : data.trend} height={240} />
              </section>
            )}

            {tables().filter((t) => sections.has(t.key)).map((t) => (
              <section key={t.key}>
                <h3 className="font-semibold text-navy-900">{t.title}</h3>
                {t.note && <p className="mb-2 text-xs text-muted-foreground">{t.note}</p>}
                {t.body.length ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader><TableRow>{t.head.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {t.body.slice(0, 12).map((row, i) => (
                          <TableRow key={i}>{row.map((c, j) => <TableCell key={j} className="tabular text-[13px]">{c}</TableCell>)}</TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {t.body.length > 12 && <p className="border-t px-3 py-2 text-xs text-muted-foreground">+ {t.body.length - 12} more rows in export</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No records for this period.</p>
                )}
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
