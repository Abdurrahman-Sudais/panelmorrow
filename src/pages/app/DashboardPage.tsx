import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, ArrowRight, BatteryCharging, Building2, Gauge, RotateCcw, TrendingDown, Zap } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { computeMetrics, sliceByDate } from "@/services/analysis/engine";
import { addDays } from "@/data/generator";
import { sumByDate, weekly } from "@/lib/aggregate";
import { fmt } from "@/lib/utils";
import type { SiteCategory, SiteStatus } from "@/types";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfidenceMeter, MeasuredTag, SeverityBadge, SimulatedTag, STATUS_COLORS } from "@/components/common/badges";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Field } from "@/components/common/Field";

const RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", "180": "Last 180 days" } as const;
const CATEGORIES: SiteCategory[] = ["Commercial Rooftop", "Industrial", "Ground-mount Farm", "Carport", "Public Sector"];
const STATUSES: SiteStatus[] = ["Healthy", "Watch", "Underperforming", "Critical", "No data"];

export default function DashboardPage() {
  const p = usePortfolio();
  const [range, setRange] = useState<keyof typeof RANGES>("30");
  const [region, setRegion] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const regions = useMemo(() => [...new Set(p.state.sites.map((s) => s.location.region))].sort(), [p.state.sites]);
  const from = addDays(p.asOf, -(Number(range) - 1));

  const filtered = useMemo(
    () =>
      p.summaries.filter(
        (s) =>
          (region === "all" || s.site.location.region === region) &&
          (category === "all" || s.site.category === category) &&
          (status === "all" || s.status === status),
      ),
    [p.summaries, region, category, status],
  );

  const view = useMemo(() => {
    const ids = new Set(filtered.map((s) => s.site.id));
    const rangeRecs = filtered.map((s) => sliceByDate(p.state.records[s.site.id] ?? [], from, p.asOf));
    const perSite = filtered.map((s, i) => ({ s, m: computeMetrics(s.site, rangeRecs[i]) }));
    const actual = perSite.reduce((a, x) => a + x.m.actualKwh, 0);
    const expected = perSite.reduce((a, x) => a + x.m.expectedKwh, 0);
    const loss = perSite.reduce((a, x) => a + x.m.lossKwh, 0);
    const recs = p.recommendations.filter((r) => ids.has(r.siteId) && r.status !== "Dismissed");
    const portfolio = sumByDate(rangeRecs);
    return {
      ids,
      perSite,
      actual,
      expected,
      loss,
      pi: expected > 0 ? (actual / expected) * 100 : NaN,
      capacity: filtered.reduce((a, s) => a + s.site.capacityKw, 0),
      recs,
      recoverable: recs.reduce((a, r) => a + r.factors.recoverableKwh, 0),
      trend: Number(range) > 45 ? weekly(portfolio) : portfolio,
      anomalies: p.allAnomalies.filter((a) => ids.has(a.siteId) && a.status !== "Resolved"),
    };
  }, [filtered, p, from, range]);

  const worst = [...view.perSite]
    .filter((x) => !Number.isNaN(x.m.performanceIndex))
    .sort((a, b) => a.m.performanceIndex - b.m.performanceIndex)
    .slice(0, 10)
    .map((x) => ({ name: x.s.site.name, pi: +x.m.performanceIndex.toFixed(1), status: x.s.status }));

  const statusDist = STATUSES.map((st) => ({ name: st, value: filtered.filter((s) => s.status === st).length })).filter((d) => d.value > 0);
  const filtersActive = region !== "all" || category !== "all" || status !== "all";

  return (
    <div>
      <PageHeader
        title="Portfolio dashboard"
        description="Weather-adjusted performance, losses and maintenance priorities across your monitored solar sites."
        actions={
          <Button asChild variant="solar">
            <Link to="/app/maintenance">Open inspection queue <ArrowRight /></Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Date range">
            <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGES)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(RANGES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Location">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Site category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Performance status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="ghost" className="w-full" disabled={!filtersActive} onClick={() => { setRegion("all"); setCategory("all"); setStatus("all"); }}>
              <RotateCcw />Reset filters
            </Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Solar sites monitored" value={filtered.length} icon={Building2} hint={`of ${p.state.sites.length} in portfolio`} />
        <StatCard label="Installed capacity" value={fmt.kw(view.capacity)} icon={Zap} tone="navy" hint={`${fmt.num(view.capacity)} kWp DC`} />
        <StatCard label="Sites requiring inspection" value={view.recs.length} icon={AlertTriangle} tone="solar" hint={`${view.recs.filter((r) => r.status === "Pending").length} awaiting triage`} />
        <StatCard label={`Estimated energy loss (${range}d)`} value={fmt.kwh(view.loss)} icon={TrendingDown} tone="red" tag={<SimulatedTag label="vs simulated expected" />} />
        <StatCard label="Est. recoverable energy (90d)" value={fmt.kwh(view.recoverable)} icon={BatteryCharging} tone="teal" tag={<SimulatedTag label="Simulated estimate" />} />
        <StatCard
          label="Avg. portfolio performance"
          value={Number.isNaN(view.pi) ? "—" : fmt.pct(view.pi)}
          icon={Gauge}
          tone={view.pi >= 95 ? "teal" : view.pi >= 90 ? "solar" : "red"}
          hint="capacity-weighted, weather-adjusted"
        />
      </div>

      {/* Trend + status */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Generation performance trend</CardTitle>
              <CardDescription>Portfolio {Number(range) > 45 ? "weekly" : "daily"} generation vs weather-adjusted expectation</CardDescription>
            </div>
            <div className="hidden gap-1.5 sm:flex"><MeasuredTag /><SimulatedTag label="Expected: simulated" /></div>
          </CardHeader>
          <CardContent>
            <PerformanceChart records={view.trend} height={300} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Site status</CardTitle>
            <CardDescription>Last 30 days, weather-adjusted</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {statusDist.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name as SiteStatus]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => `${v} sites`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {statusDist.map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[d.name as SiteStatus] }} />{d.name}</span>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worst performers + recommendations */}
      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Lowest-performing sites</CardTitle>
            <CardDescription>Performance index, {RANGES[range].toLowerCase()} (100% = as expected for the weather)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, worst.length * 30)}>
              <BarChart data={worst} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E5E9F0" horizontal={false} />
                <XAxis type="number" domain={[0, 110]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={168} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} tickFormatter={(v: string) => (v.length > 24 ? v.slice(0, 23) + "…" : v)} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />} cursor={{ fill: "rgba(148,163,184,.12)" }} />
                <Bar dataKey="pi" name="Performance index" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
                  {worst.map((w) => <Cell key={w.name} fill={STATUS_COLORS[w.status]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Maintenance recommendations</CardTitle>
              <CardDescription>Top-ranked inspections by priority score</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost"><Link to="/app/maintenance">View queue <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {view.recs.slice(0, 5).map((r) => {
              const site = p.siteById.get(r.siteId)!;
              return (
                <Link key={r.id} to={`/app/sites/${r.siteId}`} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy-900 text-sm font-bold text-white">{r.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{site.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.reasons[0]}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="tabular text-sm font-bold text-solar-600">{r.score.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">score</p>
                  </div>
                  <span className="hidden text-xs font-medium text-muted-foreground md:inline">{r.status}</span>
                </Link>
              );
            })}
            {view.recs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No inspections recommended for this selection.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Recent anomalies */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">Recent anomalies <SimulatedTag label="Simulated detection" /></CardTitle>
            <CardDescription>Unusual output patterns — causes require on-site confirmation</CardDescription>
          </div>
          <Button asChild size="sm" variant="ghost"><Link to="/app/anomalies">All anomalies <ArrowRight /></Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Anomaly</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Energy lost</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.anomalies.slice(0, 6).map((a) => (
                <TableRow key={a.id}>
                  <TableCell><Link to={`/app/sites/${a.siteId}`} className="font-medium text-navy-900 hover:text-solar-600">{p.siteById.get(a.siteId)?.name}</Link></TableCell>
                  <TableCell className="text-muted-foreground"><span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-solar-500" />{a.type}</span></TableCell>
                  <TableCell className="tabular whitespace-nowrap text-muted-foreground">{fmt.date(a.detectedAt)}</TableCell>
                  <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                  <TableCell className="tabular text-right font-medium">{fmt.kwh(a.lossKwh)}</TableCell>
                  <TableCell><ConfidenceMeter value={a.confidence} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
