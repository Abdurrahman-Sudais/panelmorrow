import type { TooltipProps } from "recharts";
import { fmt } from "@/lib/utils";

type Formatter = (v: number, key: string) => string;

export function ChartTooltip({ active, payload, label, formatter, labelFormatter }: TooltipProps<number, string> & { formatter?: Formatter; labelFormatter?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1.5 font-semibold text-navy-900">{labelFormatter ? labelFormatter(String(label)) : String(label)}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="tabular font-semibold text-navy-900">
              {p.value == null ? "—" : formatter ? formatter(Number(p.value), String(p.dataKey)) : fmt.num(Number(p.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
