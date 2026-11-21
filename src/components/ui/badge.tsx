import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy-900 text-white",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        critical: "border-red-200 bg-red-50 text-red-700",
        high: "border-orange-200 bg-orange-50 text-orange-700",
        medium: "border-amber-200 bg-amber-50 text-amber-700",
        low: "border-sky-200 bg-sky-50 text-sky-700",
        success: "border-teal-200 bg-teal-50 text-teal-700",
        simulated: "border-violet-200 bg-violet-50 text-violet-700",
        verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
