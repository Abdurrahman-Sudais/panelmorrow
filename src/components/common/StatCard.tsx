import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: ReactNode;
  tone?: "navy" | "solar" | "teal" | "red";
  tag?: ReactNode;
}

const tones = {
  navy: "bg-navy-50 text-navy-700",
  solar: "bg-solar-50 text-solar-600",
  teal: "bg-teal-50 text-teal-600",
  red: "bg-red-50 text-red-600",
};

export function StatCard({ label, value, icon: Icon, hint, tone = "navy", tag }: Props) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
          <p className="tabular mt-1.5 text-[22px] font-bold leading-none tracking-tight text-navy-900">{value}</p>
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      {(hint || tag) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {tag}
          {hint}
        </div>
      )}
    </Card>
  );
}
