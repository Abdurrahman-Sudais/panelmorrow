import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyRecord } from "@/types";
import { fmt } from "@/lib/utils";
import { CHART } from "./colors";
import { ChartTooltip } from "./ChartTooltip";

export function WeatherChart({ records, height = 220 }: { records: DailyRecord[]; height?: number }) {
  const data = records.map((r) => ({ date: r.date, irr: r.irradianceKwhM2, temp: r.ambientTempC, cloud: r.cloudCoverPct }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmt.shortDate} minTickGap={36} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tickLine={false} axisLine={false} width={36} />
        <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} width={36} domain={[0, 100]} />
        <Tooltip
          content={<ChartTooltip labelFormatter={fmt.date} formatter={(v, k) => (k === "irr" ? `${v.toFixed(2)} kWh/m²` : k === "temp" ? `${v.toFixed(1)} °C` : `${v}%`)} />}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar yAxisId="r" dataKey="cloud" name="Cloud cover (%)" fill="#CBD5E1" opacity={0.5} isAnimationActive={false} />
        <Line yAxisId="l" dataKey="irr" name="Irradiance (kWh/m²)" stroke={CHART.irradiance} strokeWidth={1.8} dot={false} isAnimationActive={false} />
        <Line yAxisId="l" dataKey="temp" name="Ambient temp (°C)" stroke="#64748B" strokeWidth={1.2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
