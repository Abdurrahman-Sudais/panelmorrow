import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { DailyRecord } from "@/types";
import { fmt } from "@/lib/utils";
import { CHART } from "./colors";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  records: DailyRecord[];
  height?: number;
  showIrradiance?: boolean;
  showLoss?: boolean;
  markers?: { date: string; label: string; color?: string }[];
}

/** Actual (measured) vs expected (simulated model) daily generation. */
export function PerformanceChart({ records, height = 300, showIrradiance = false, showLoss = true, markers = [] }: Props) {
  const data = records.map((r) => ({
    date: r.date,
    actual: r.actualKwh,
    expected: r.expectedKwh,
    loss: r.actualKwh == null ? null : [r.actualKwh, Math.max(r.actualKwh, r.expectedKwh)],
    irradiance: r.irradianceKwhM2,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: showIrradiance ? 4 : 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmt.shortDate} minTickGap={36} tickLine={false} axisLine={false} />
        <YAxis yAxisId="kwh" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} tickLine={false} axisLine={false} width={44} />
        {showIrradiance && <YAxis yAxisId="irr" orientation="right" tickLine={false} axisLine={false} width={30} domain={[0, 8]} />}
        <Tooltip
          content={
            <ChartTooltip
              labelFormatter={fmt.date}
              formatter={(v, k) => (k === "irradiance" ? `${v.toFixed(2)} kWh/m²` : k === "loss" ? "" : `${fmt.num(v)} kWh`)}
            />
          }
        />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {showIrradiance && <Bar yAxisId="irr" dataKey="irradiance" name="Irradiance (kWh/m²)" fill={CHART.irradiance} opacity={0.18} barSize={3} />}
        {showLoss && <Area yAxisId="kwh" dataKey="loss" name="Shortfall" fill={CHART.loss} fillOpacity={0.12} stroke="none" legendType="square" isAnimationActive={false} />}
        <Line yAxisId="kwh" dataKey="expected" name="Expected (simulated model)" stroke={CHART.expected} strokeWidth={1.8} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
        <Line yAxisId="kwh" dataKey="actual" name="Actual (measured)" stroke={CHART.actual} strokeWidth={1.8} dot={false} connectNulls={false} isAnimationActive={false} />
        {markers.map((m) => (
          <ReferenceLine key={m.date + m.label} yAxisId="kwh" x={m.date} stroke={m.color ?? CHART.irradiance} strokeDasharray="3 3" label={{ value: m.label, position: "insideTopLeft", fontSize: 10, fill: m.color ?? CHART.irradiance }} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
