import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Settings,
  UploadCloud,
  ChevronDown,
  Bell,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { cn, fmt } from "@/lib/utils";
import { isMock } from "@/services/api/config";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const p = usePortfolio();
  const openAnoms = p.allAnomalies.filter((a) => a.status === "Open").length;
  const pendingRecs = p.recommendations.filter((r) => r.status === "Pending").length;

  const groups = [
    {
      label: "Monitor",
      items: [
        { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/app/sites", label: "Solar sites", icon: Building2 },
        { to: "/app/performance", label: "Performance analysis", icon: BarChart3 },
        { to: "/app/anomalies", label: "Anomalies", icon: Activity, count: openAnoms },
      ],
    },
    {
      label: "Act",
      items: [
        { to: "/app/maintenance", label: "Inspection queue", icon: ListOrdered, count: pendingRecs },
        { to: "/app/verification", label: "Repair verification", icon: ClipboardCheck },
        { to: "/app/reports", label: "Reports", icon: FileText },
      ],
    },
    {
      label: "Data",
      items: [
        { to: "/app/data", label: "Data imports", icon: UploadCloud },
        { to: "/app/settings", label: "Settings & integrations", icon: Settings },
      ],
    },
  ];

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-400">{g.label}</p>
          <div className="space-y-0.5">
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={"end" in it ? it.end : false}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <it.icon className={cn("h-[17px] w-[17px]", isActive ? "text-solar-400" : "text-navy-300 group-hover:text-navy-100")} />
                    <span className="flex-1">{it.label}</span>
                    {"count" in it && it.count ? (
                      <span className="rounded-full bg-solar-500/90 px-1.5 py-px text-[10px] font-bold text-white">{it.count}</span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="m-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-white">
        <FlaskConical className="h-3.5 w-3.5 text-violet-300" />
        {isMock ? "Demo environment" : "Live environment"}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-navy-300">
        {isMock
          ? "Illustrative data. Expected output and anomalies come from a simulated model, not SageMaker."
          : "Connected to the PanelMorrow API."}
      </p>
    </div>
  );
}

export function AppLayout() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const p = usePortfolio();
  const critical = p.allAnomalies.filter((a) => a.status === "Open" && a.severity === "Critical");

  useEffect(() => {
    document.getElementById("app-main")?.scrollTo(0, 0);
  }, [pathname]);

  const initials = (session?.user.name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-[248px] shrink-0 flex-col bg-navy-900 lg:flex">
        <div className="flex h-16 items-center border-b border-white/5 px-5">
          <Link to="/app"><Logo light /></Link>
        </div>
        <SidebarNav />
        <SidebarFooter />
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="bg-navy-900">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="flex h-16 items-center border-b border-white/5 px-5">
            <Logo light />
          </div>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
          <SidebarFooter />
        </SheetContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4 md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
            Data current to <span className="font-semibold text-navy-800">{fmt.date(p.asOf)}</span>
            <span className="mx-1 text-border">|</span>
            {p.state.sites.length} sites · {fmt.kw(p.state.sites.reduce((a, s) => a + s.capacityKw, 0))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-[18px] w-[18px]" />
                  {critical.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Critical anomalies</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {critical.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No open critical anomalies.</p>}
                {critical.slice(0, 5).map((a) => (
                  <DropdownMenuItem key={a.id} onSelect={() => navigate(`/app/sites/${a.siteId}`)} className="flex-col items-start gap-0.5">
                    <span className="text-[13px] font-semibold">{p.siteById.get(a.siteId)?.name}</span>
                    <span className="text-xs text-muted-foreground">{a.type} · {fmt.kwh(a.lossKwh)} lost</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/app/anomalies")}>View all anomalies</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-secondary">
                  <Avatar className="h-8 w-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-[13px] font-semibold leading-tight text-navy-900">{session?.user.name}</p>
                    <p className="text-[11px] leading-tight text-muted-foreground">{session?.user.company}</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold">{session?.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session?.user.email}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{session?.user.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/app/settings")}><Settings />Settings</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/")}><Building2 />Public website</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    signOut();
                    navigate("/login");
                  }}
                >
                  <LogOut />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="app-main" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
