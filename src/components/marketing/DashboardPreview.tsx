import { useMemo } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Gauge, Zap } from "lucide-react";
import { SEED_SITES, SCENARIOS } from "@/data/sites";
import { generateSiteRecords } from "@/data/generator";
import { sumByDate, weekly } from "@/lib/aggregate";
import { fmt } from "@/lib/utils";

/** Live-rendered product preview for the marketing site, built from the demo dataset. */
export function DashboardPreview() {
  const data = useMemo(() => {
    const series = SEED_SITES.slice(0, 14).map((s) => generateSiteRecords(s, SCENARIOS[s.id]));
    return weekly(sumByDate(series)).map((r) => ({ d: r.date, a: r.actualKwh, e: r.expectedKwh }));
  }, []);

  const queue = [
    { name: "Minna Rice Processing Mill", loss: "1,990 kWh/day lost", score: 97 },
    { name: "Lekki Retail Park", loss: "640 kWh/day lost", score: 52 },
    { name: "Port Harcourt Oil Services Base", loss: "640 kWh/day lost", score: 48 },
    { name: "Ikeja Cold Storage Hub", loss: "1,040 kWh/day lost", score: 46 },
  ];

  return (
    <div className="glow-solar overflow-hidden rounded-xl border border-white/10 bg-white text-left shadow-2xl">
      <div className="flex items-center gap-1.5 border-b bg-secondary/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 rounded bg-white px-2 py-0.5 font-mono text-[10px] text-muted-foreground">app.panelmorrow.com/dashboard</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-4">
        {[
          { l: "Sites monitored", v: "24", i: Zap, c: "text-navy-700 bg-navy-50" },
          { l: "Portfolio performance", v: "93.3%", i: Gauge, c: "text-teal-600 bg-teal-50" },
          { l: "Need inspection", v: "13", i: AlertTriangle, c: "text-solar-600 bg-solar-50" },
          { l: "Lost (30d)", v: "220 MWh", i: Activity, c: "text-red-600 bg-red-50" },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted-foreground">{k.l}</p>
              <span className={`flex h-6 w-6 items-center justify-center rounded ${k.c}`}><k.i className="h-3.5 w-3.5" /></span>
            </div>
            <p className="tabular mt-1 text-lg font-bold text-navy-900">{k.v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 px-4 pb-4 md:grid-cols-5">
        <div className="rounded-lg border p-3 md:col-span-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-navy-900">Actual vs weather-adjusted expected</p>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-navy-600" />Actual</span>
              <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dashed border-solar-500" />Expected</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1D3560" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1D3560" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tickFormatter={fmt.shortDate} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis hide domain={["auto", "auto"]} />
              <Area dataKey="a" stroke="#1D3560" strokeWidth={1.8} fill="url(#pv)" isAnimationActive={false} />
              <Line dataKey="e" stroke="#F08A0C" strokeDasharray="4 3" dot={false} strokeWidth={1.6} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border p-3 md:col-span-2">
          <p className="mb-2 text-xs font-semibold text-navy-900">Inspection queue</p>
          <div className="space-y-2">
            {queue.map((q, i) => (
              <div key={q.name} className="flex items-center gap-2.5 rounded-md bg-secondary/60 px-2 py-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-navy-900 text-[10px] font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-navy-900">{q.name}</p>
                  <p className="text-[10px] text-muted-foreground">{q.loss}</p>
                </div>
                <span className="tabular text-[11px] font-bold text-solar-600">{q.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
