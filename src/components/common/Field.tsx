import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** Lightweight labelled wrapper for non-RHF filter controls. */
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
