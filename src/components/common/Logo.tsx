import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0B1B33" />
      <circle cx="16" cy="11.5" r="4.8" fill="#F08A0C" />
      <path d="M5.5 25.5 9.5 17h13l4 8.5z" fill="#0FA08E" />
      <path d="M12.3 17 10.8 25.5M19.7 17l1.5 8.5M7.6 21.3h16.8" stroke="#0B1B33" strokeWidth="1.1" />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("text-[17px] font-bold tracking-tight", light ? "text-white" : "text-navy-900")}>
        Panel<span className="text-solar-500">Morrow</span>
      </span>
    </span>
  );
}
