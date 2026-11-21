import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyRecord } from "@/types";
import { fmt } from "@/lib/utils";
import { CHART } from "./colors";
import { ChartTooltip } from "./ChartTooltip";

/** Daily deviation of actual from expected, in % of expected. */
export function DeviationChart({ records, height = 200 }: { records: DailyRecord[]; height?: number }) {
  const data = records.map((r) => ({
    date: r.date,
    deviation: r.actualKwh == null || r.expectedKwh <= 0 ? null : +(((r.actualKwh - r.expectedKwh) / r.expectedKwh) * 100).toFixed(1),
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmt.shortDate} minTickGap={36} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={44} domain={[-100, 20]} />
        <Tooltip content={<ChartTooltip labelFormatter={fmt.date} formatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} />} />
        <ReferenceLine y={0} stroke="#64748B" />
        <ReferenceLine y={-10} stroke={CHART.expected} strokeDasharray="4 4" label={{ value: "−10% watch", fontSize: 10, fill: CHART.expected, position: "insideBottomLeft" }} />
        <Bar dataKey="deviation" name="Deviation vs expected" isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.date} fill={d.deviation == null ? CHART.muted : d.deviation < -25 ? "#DC2626" : d.deviation < -10 ? CHART.expected : "#94A3B8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
