import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { CloudSun, Gauge, Info, Sun, TrendingDown, UploadCloud } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { computeMetrics, sliceByDate } from "@/services/analysis/engine";
import { MODEL_REGISTRY } from "@/services/api/models";
import { addDays } from "@/data/generator";
import { sumByDate, weekly } from "@/lib/aggregate";
import { fmt } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Field } from "@/components/common/Field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeasuredTag, SimulatedTag } from "@/components/common/badges";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { DeviationChart } from "@/components/charts/DeviationChart";
import { WeatherChart } from "@/components/charts/WeatherChart";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CHART } from "@/components/charts/colors";

export default function PerformancePage() {
  const p = usePortfolio();
  const [siteId, setSiteId] = useState("portfolio");
  const [range, setRange] = useState("90");
  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily");

  const from = addDays(p.asOf, -(Number(range) - 1));
  const sitesWithData = p.state.sites.filter((s) => (p.state.records[s.id] ?? []).length);

  const { records, metrics, capacity } = useMemo(() => {
    if (siteId === "portfolio") {
      const list = sitesWithData.map((s) => sliceByDate(p.state.records[s.id], from, p.asOf));
      const cap = sitesWithData.reduce((a, s) => a + s.capacityKw, 0);
      const recs = sumByDate(list);
      const fakeSite = { ...sitesWithData[0], capacityKw: cap };
      return { records: recs, metrics: computeMetrics(fakeSite, recs), capacity: cap };
    }
    const site = p.siteById.get(siteId)!;
    const recs = sliceByDate(p.state.records[siteId] ?? [], from, p.asOf);
    return { records: recs, metrics: computeMetrics(site, recs), capacity: site.capacityKw };
  }, [siteId, from, p, sitesWithData]);

  const chartRecs = granularity === "weekly" ? weekly(records) : records;

  // Monthly breakdown
  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; actual: number; expected: number; loss: number }>();
    for (const r of records) {
      if (r.actualKwh == null) continue;
      const k = r.date.slice(0, 7);
      const e = map.get(k) ?? { month: k, actual: 0, expected: 0, loss: 0 };
      e.actual += r.actualKwh;
      e.expected += r.expectedKwh;
      e.loss += Math.max(0, r.expectedKwh - r.actualKwh);
      map.set(k, e);
    }
    return [...map.values()].map((m) => ({
      ...m,
      label: new Date(m.month + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      pi: (m.actual / m.expected) * 100,
    }));
  }, [records]);

  const siteRanking = useMemo(
    () =>
      sitesWithData
        .map((s) => {
          const m = computeMetrics(s, sliceByDate(p.state.records[s.id], from, p.asOf));
          return { name: s.name, id: s.id, pi: +m.performanceIndex.toFixed(1), loss: Math.round(m.lossKwh) };
        })
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 12),
    [sitesWithData, p, from],
  );

  return (
    <div>
      <PageHeader
        title="Performance analysis"
        description="Measured generation compared with weather-adjusted expected generation. Expected values come from the simulated performance model."
        actions={<Button asChild variant="outline"><Link to="/app/data"><UploadCloud />Import CSV data</Link></Button>}
      />

      <div className="mb-6 flex gap-3 rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-violet-950">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
        <div>
          <p className="font-semibold">Simulated model predictions vs verified measurements</p>
          <p className="mt-0.5 text-violet-900/80">
            <strong>Actual</strong> values are operational measurements (demo meter feed or your uploaded CSVs). <strong>Expected</strong> values and loss estimates are produced by
            {" "}<span className="font-mono text-xs">{MODEL_REGISTRY[0].endpoint}@{MODEL_REGISTRY[0].version}</span>, a simulated stand-in for the SageMaker AI model.
          </p>
        </div>
      </div>

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Scope">
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portfolio">Entire portfolio ({sitesWithData.length} sites)</SelectItem>
                {sitesWithData.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Period">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["30", "60", "90", "180"].map((r) => <SelectItem key={r} value={r}>Last {r} days</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Granularity">
            <Select value={granularity} onValueChange={(v) => setGranularity(v as "daily" | "weekly")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Actual generation" value={fmt.kwh(metrics.actualKwh)} icon={Sun} tone="navy" tag={<MeasuredTag />} />
        <StatCard label="Expected (weather-adjusted)" value={fmt.kwh(metrics.expectedKwh)} icon={CloudSun} tone="solar" tag={<SimulatedTag />} />
        <StatCard label="Performance deviation" value={Number.isNaN(metrics.performanceIndex) ? "—" : `${(metrics.performanceIndex - 100).toFixed(1)}%`} icon={Gauge} tone={metrics.performanceIndex >= 95 ? "teal" : "red"} hint={`PR ${metrics.performanceRatio.toFixed(2)} · ${fmt.num(metrics.specificYield, 0)} kWh/kWp`} />
        <StatCard label="Estimated lost energy" value={fmt.kwh(metrics.lossKwh)} icon={TrendingDown} tone="red" tag={<SimulatedTag label="Estimate" />} hint={`${fmt.kw(capacity)} monitored`} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Expected vs actual output</CardTitle>
            <CardDescription>{granularity === "weekly" ? "Weekly totals" : "Daily totals"} with irradiance overlay</CardDescription>
          </div>
          <div className="hidden gap-1.5 sm:flex"><MeasuredTag label="Actual: measured" /><SimulatedTag label="Expected: simulated" /></div>
        </CardHeader>
        <CardContent><PerformanceChart records={chartRecs} height={340} showIrradiance /></CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Performance deviation</CardTitle><CardDescription>Daily % above / below expected</CardDescription></CardHeader>
          <CardContent><DeviationChart records={records} height={240} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Weather conditions</CardTitle><CardDescription>{siteId === "portfolio" ? "Portfolio average" : "Site"} irradiance, temperature and cloud cover</CardDescription></CardHeader>
          <CardContent><WeatherChart records={records} height={240} /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Historical generation by month</CardTitle><CardDescription>Measured vs expected, with estimated loss</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}G` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTooltip formatter={(v) => fmt.kwh(v)} />} cursor={{ fill: "rgba(148,163,184,.12)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="actual" name="Actual (measured)" fill={CHART.actual} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="expected" name="Expected (simulated)" fill={CHART.expected} fillOpacity={0.55} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="loss" name="Estimated loss" fill={CHART.loss} fillOpacity={0.7} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lost energy by site</CardTitle><CardDescription>Top 12 sites by estimated shortfall in period</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={siteRanking} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={168} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} tickFormatter={(v: string) => (v.length > 24 ? v.slice(0, 23) + "…" : v)} />
                <Tooltip content={<ChartTooltip formatter={(v, k) => (k === "loss" ? fmt.kwh(v) : `${v}%`)} />} cursor={{ fill: "rgba(148,163,184,.12)" }} />
                <Bar dataKey="loss" name="Estimated loss" barSize={12} radius={[0, 3, 3, 0]} isAnimationActive={false}>
                  {siteRanking.map((s) => <Cell key={s.id} fill={s.pi < 85 ? "#DC2626" : s.pi < 92 ? CHART.expected : "#94A3B8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
