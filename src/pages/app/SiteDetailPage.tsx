import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Activity, ArrowLeft, Calendar, Cpu, Database, Download, Gauge, MapPin, Pencil, PlusCircle, Sun, TrendingDown, UploadCloud, Wand2, Wrench, Zap } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { computeMetrics, sliceByDate } from "@/services/analysis/engine";
import { sitesService } from "@/services/api/sites";
import { addDays } from "@/data/generator";
import { SCENARIOS } from "@/data/sites";
import { fmt } from "@/lib/utils";
import { downloadCsv } from "@/lib/exporters";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeasuredTag, SimulatedTag, SiteStatusBadge, SeverityBadge, AnomalyStatusBadge, ConfidenceMeter } from "@/components/common/badges";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { DeviationChart } from "@/components/charts/DeviationChart";
import { WeatherChart } from "@/components/charts/WeatherChart";
import { AnomalyActions, AnomalyDetail } from "@/components/domain/AnomalyDetail";
import { VerificationSummary } from "@/components/domain/VerificationSummary";

export default function SiteDetailPage() {
  const { id = "" } = useParams();
  const p = usePortfolio();
  const summary = p.summaries.find((s) => s.site.id === id);
  const [range, setRange] = useState("90");
  const [generating, setGenerating] = useState(false);

  const records = useMemo(() => p.state.records[id] ?? [], [p.state.records, id]);
  const from = addDays(p.asOf, -(Number(range) - 1));
  const rangeRecs = useMemo(() => sliceByDate(records, from, p.asOf), [records, from, p.asOf]);

  if (!summary) {
    return <EmptyState icon={MapPin} title="Site not found" description="This site may have been removed." action={<Button asChild><Link to="/app/sites">Back to sites</Link></Button>} />;
  }
  const { site, status, anomalies } = summary;
  const m = computeMetrics(site, rangeRecs);
  const maint = p.state.maintenance.filter((x) => x.siteId === id).sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));
  const hist = p.allAnomalies.filter((a) => a.siteId === id);
  const rec = p.recommendations.find((r) => r.siteId === id);
  const uploads = p.state.uploads.filter((u) => u.siteId === id);
  const hasData = records.length > 0;
  const isSeed = id in SCENARIOS;

  const genDemo = async () => {
    setGenerating(true);
    await sitesService.generateDemoData(id);
    setGenerating(false);
    toast.success("Demo generation & weather data generated", { description: "180 days of simulated records were added for this site." });
  };

  const exportRecords = () =>
    downloadCsv(
      `${site.id}-generation.csv`,
      rangeRecs.map((r) => ({
        date: r.date,
        actual_kwh: r.actualKwh ?? "",
        actual_source: r.actualSource,
        expected_kwh: r.expectedKwh,
        expected_source: r.expectedSource,
        irradiance_kwh_m2: r.irradianceKwhM2,
        ambient_temp_c: r.ambientTempC,
        cloud_cover_pct: r.cloudCoverPct,
      })),
    );

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link to="/app/sites"><ArrowLeft />All sites</Link></Button>
      <PageHeader
        eyebrow={<div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{site.id}</Badge><Badge variant="secondary">{site.category}</Badge><SiteStatusBadge status={status} /></div>}
        title={site.name}
        description={<span className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{site.location.address}, {site.location.city}, {site.location.state}</span><span>{site.client}</span></span>}
        actions={
          <>
            {!isSeed && <Button asChild variant="outline"><Link to={`/app/sites/${id}/edit`}><Pencil />Edit</Link></Button>}
            <Button asChild variant="outline"><Link to={`/app/data?site=${id}`}><UploadCloud />Upload data</Link></Button>
            <Button asChild variant="solar"><Link to={`/app/verification?site=${id}`}><PlusCircle />Record maintenance</Link></Button>
          </>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={Database}
          title="No generation records yet"
          description="Upload historical generation and weather CSVs to start weather-adjusted analysis. For a quick look, you can generate simulated demo data."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="solar"><Link to={`/app/data?site=${id}`}><UploadCloud />Upload CSV</Link></Button>
              <Button variant="outline" onClick={genDemo} disabled={generating}><Wand2 />{generating ? "Generating…" : "Generate demo data"}</Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Installed capacity" value={fmt.kw(site.capacityKw)} icon={Zap} hint={`${site.panels.count.toLocaleString()} × ${site.panels.wattage} W`} />
            <StatCard label={`Performance index (${range}d)`} value={Number.isNaN(m.performanceIndex) ? "—" : fmt.pct(m.performanceIndex)} icon={Gauge} tone={m.performanceIndex >= 95 ? "teal" : m.performanceIndex >= 90 ? "solar" : "red"} hint="actual ÷ weather-adjusted expected" />
            <StatCard label={`Generation (${range}d)`} value={fmt.kwh(m.actualKwh)} icon={Sun} tone="teal" tag={<MeasuredTag />} />
            <StatCard label={`Estimated lost energy (${range}d)`} value={fmt.kwh(m.lossKwh)} icon={TrendingDown} tone="red" tag={<SimulatedTag label="vs simulated" />} />
            <StatCard label="Priority rank" value={rec ? `#${rec.rank}` : "—"} icon={Activity} tone="solar" hint={rec ? `score ${rec.score.toFixed(0)} · ${rec.status}` : "No active recommendation"} />
          </div>

          <Tabs defaultValue="performance" className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="h-auto flex-wrap justify-start">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="history">Generation history</TabsTrigger>
                <TabsTrigger value="anomalies">Anomalies ({hist.length})</TabsTrigger>
                <TabsTrigger value="maintenance">Inspections & maintenance ({maint.length})</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
              </TabsList>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["30", "60", "90", "180"].map((r) => <SelectItem key={r} value={r}>Last {r} days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>Actual vs expected output</CardTitle>
                    <CardDescription>Daily generation compared with weather-adjusted expectation; shaded area is shortfall</CardDescription>
                  </div>
                  <div className="hidden gap-1.5 sm:flex"><MeasuredTag label="Actual: measured" /><SimulatedTag label="Expected: simulated" /></div>
                </CardHeader>
                <CardContent>
                  <PerformanceChart
                    records={rangeRecs}
                    height={320}
                    showIrradiance
                    markers={maint.filter((x) => x.inspectionDate >= from).map((x) => ({ date: x.inspectionDate, label: "Maintenance" }))}
                  />
                </CardContent>
              </Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Performance deviation</CardTitle><CardDescription>Daily % difference from expected</CardDescription></CardHeader>
                  <CardContent><DeviationChart records={rangeRecs} /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Weather conditions</CardTitle><CardDescription>Irradiance, temperature and cloud cover ({rangeRecs[0]?.weatherSource === "csv-upload" ? "uploaded" : "demo weather feed"})</CardDescription></CardHeader>
                  <CardContent><WeatherChart records={rangeRecs} height={200} /></CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>Daily records</CardTitle>
                    <CardDescription>{rangeRecs.length} days · data completeness {fmt.pct(m.dataCompleteness * 100, 0)}</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={exportRecords}><Download />Export CSV</Button>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto p-0">
                  <Table>
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actual (kWh)</TableHead>
                        <TableHead className="text-right">Expected (kWh)</TableHead>
                        <TableHead className="text-right">Deviation</TableHead>
                        <TableHead className="text-right">Irradiance</TableHead>
                        <TableHead className="text-right">Temp</TableHead>
                        <TableHead>Sources</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...rangeRecs].reverse().map((r) => {
                        const dev = r.actualKwh == null ? null : ((r.actualKwh - r.expectedKwh) / r.expectedKwh) * 100;
                        return (
                          <TableRow key={r.date}>
                            <TableCell className="tabular whitespace-nowrap">{fmt.date(r.date)}</TableCell>
                            <TableCell className="tabular text-right font-medium">{r.actualKwh == null ? <span className="text-muted-foreground">missing</span> : fmt.num(r.actualKwh)}</TableCell>
                            <TableCell className="tabular text-right text-violet-700">{fmt.num(r.expectedKwh)}</TableCell>
                            <TableCell className={`tabular text-right ${dev != null && dev < -10 ? "font-semibold text-red-600" : "text-muted-foreground"}`}>{dev == null ? "—" : `${dev > 0 ? "+" : ""}${dev.toFixed(1)}%`}</TableCell>
                            <TableCell className="tabular text-right text-muted-foreground">{r.irradianceKwhM2.toFixed(2)}</TableCell>
                            <TableCell className="tabular text-right text-muted-foreground">{r.ambientTempC.toFixed(1)}°</TableCell>
                            <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">{r.actualSource} / {r.expectedSource}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anomalies">
              {hist.length === 0 ? (
                <EmptyState icon={Activity} title="No anomalies detected" description="Generation has tracked weather-adjusted expectations within normal variability." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {hist.map((a) => (
                    <Card key={a.id} className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-navy-900">{a.type}</h3>
                        <AnomalyActions a={a} />
                      </div>
                      <AnomalyDetail a={a} showSite={false} />
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              {rec && (
                <Card className="border-solar-200 bg-solar-50/40 p-5">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">Inspection recommended · rank #{rec.rank} · {rec.status}{rec.assignee ? ` · ${rec.assignee}` : ""}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{rec.reasons[0]}</p>
                    </div>
                    <Button asChild variant="outline" size="sm"><Link to="/app/maintenance">Open in queue</Link></Button>
                  </div>
                </Card>
              )}
              {maint.length === 0 ? (
                <EmptyState icon={Wrench} title="No inspection or maintenance records" description="Record inspections and repairs to verify their effect on weather-adjusted performance." action={<Button asChild variant="solar"><Link to={`/app/verification?site=${id}`}>Record maintenance</Link></Button>} />
              ) : (
                maint.map((x) => {
                  const v = p.verifications.get(x.id)!;
                  return (
                    <Card key={x.id} className="p-5">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-2 text-sm">
                          <p className="flex items-center gap-2 font-semibold text-navy-900"><Calendar className="h-4 w-4 text-solar-500" />{fmt.date(x.inspectionDate)} · {x.technician}</p>
                          <p><span className="text-muted-foreground">Identified problem: </span>{x.identifiedProblem}</p>
                          <p><span className="text-muted-foreground">Maintenance performed: </span>{x.maintenancePerformed}</p>
                          <p><span className="text-muted-foreground">Repair cost: </span><span className="font-medium">{fmt.usd(x.repairCostUsd)}</span></p>
                          {x.notes && <p className="text-muted-foreground">{x.notes}</p>}
                        </div>
                        <VerificationSummary v={v} />
                      </div>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="config">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Sun className="h-4 w-4 text-solar-500" />Panels</CardTitle></CardHeader>
                  <CardContent><dl className="space-y-2 text-sm">{[["Manufacturer", site.panels.manufacturer], ["Model", site.panels.model], ["Rating", `${site.panels.wattage} W`], ["Count", site.panels.count.toLocaleString()], ["DC capacity", fmt.kw(site.capacityKw)], ["Installed", fmt.date(site.installDate)]].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="h-4 w-4 text-teal-500" />Inverters & access</CardTitle></CardHeader>
                  <CardContent><dl className="space-y-2 text-sm">{[["Manufacturer", site.inverters.manufacturer], ["Model", site.inverters.model], ["Rating", `${site.inverters.ratedKw} kW`], ["Count", site.inverters.count], ["AC capacity", fmt.kw(site.inverters.ratedKw * site.inverters.count)], ["Nearest depot", site.depot], ["Travel distance", `${site.travelKm} km`], ["Accessibility", site.accessibility]].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Expected generation</CardTitle><SimulatedTag /></CardHeader>
                  <CardContent><dl className="space-y-2 text-sm">{[["Method", site.expected.method === "monthly-profile" ? "Monthly profile" : "Weather-adjusted model"], ["Target PR", site.expected.targetPr.toFixed(2)], ["Tilt / azimuth", `${site.expected.tiltDeg}° / ${site.expected.azimuthDeg}°`], ["Degradation", `${site.expected.annualDegradationPct}%/yr`], ["Coordinates", `${site.location.lat.toFixed(4)}, ${site.location.lng.toFixed(4)}`], ["Uploads", uploads.length ? `${uploads.length} file(s)` : "Demo feed only"]].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl></CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {anomalies.filter((a) => a.status !== "Resolved").length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle>Active anomalies at a glance</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Loss</TableHead><TableHead>Confidence</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {anomalies.filter((a) => a.status !== "Resolved").map((a) => (
                      <TableRow key={a.id}><TableCell className="font-medium">{a.type}</TableCell><TableCell><SeverityBadge severity={a.severity} /></TableCell><TableCell><AnomalyStatusBadge status={a.status} /></TableCell><TableCell className="tabular text-right">{fmt.kwh(a.lossKwh)}</TableCell><TableCell><ConfidenceMeter value={a.confidence} /></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
