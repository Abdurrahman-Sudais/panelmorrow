import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Linkedin, Twitter, Mail } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function PublicLayout() {
  const { pathname } = useLocation();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dark = pathname === "/";

  useEffect(() => {
    window.scrollTo(0, 0);
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !dark || scrolled;

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all",
          solid ? "border-b bg-white/90 backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" aria-label="PanelMorrow home">
            <Logo light={!solid} />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    solid ? "text-navy-700 hover:text-navy-900 hover:bg-secondary" : "text-white/80 hover:text-white hover:bg-white/10",
                    isActive && (solid ? "text-solar-600" : "text-white"),
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {session ? (
              <Button asChild variant="solar">
                <Link to="/app">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant={solid ? "ghost" : "glass"} className={solid ? "" : "border-transparent bg-transparent"}>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild variant="solar">
                  <Link to="/register">Start free trial</Link>
                </Button>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" className={cn("lg:hidden", !solid && "text-white hover:bg-white/10")} onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-white p-5">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <Logo />
          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className="rounded-md px-3 py-2.5 text-sm font-medium text-navy-800 hover:bg-secondary">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Button asChild variant="outline"><Link to="/login">Log in</Link></Button>
            <Button asChild variant="solar"><Link to="/register">Start free trial</Link></Button>
          </div>
        </SheetContent>
      </Dialog>

      <main className={cn("flex-1", !dark && "pt-16")}>
        <Outlet />
      </main>

      <footer className="bg-navy-950 text-navy-200">
        <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
              Prioritize solar maintenance by lost output. Weather-adjusted performance analytics for solar O&amp;M teams and commercial operators.
            </p>
            <div className="mt-5 flex gap-3">
              {[Linkedin, Twitter, Mail].map((I, i) => (
                <span key={i} className="flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-navy-200 hover:bg-white/10">
                  <I className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
          {[
            { h: "Product", l: [["Features", "/features"], ["How it works", "/how-it-works"], ["Pricing", "/pricing"], ["Dashboard demo", "/login"]] },
            { h: "Solutions", l: [["O&M contractors", "/solutions"], ["C&I operators", "/solutions"], ["Asset owners", "/solutions"]] },
            { h: "Company", l: [["About", "/about"], ["Contact", "/contact"], ["Security", "/features#security"]] },
          ].map((c) => (
            <div key={c.h}>
              <h4 className="text-sm font-semibold text-white">{c.h}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {c.l.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="text-navy-300 hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5">
          <div className="container flex flex-col gap-2 py-6 text-xs text-navy-400 md:flex-row md:justify-between">
            <span>© {new Date().getFullYear()} PanelMorrow. All rights reserved.</span>
            <span>Model outputs are estimates. Anomalies indicate unusual performance patterns and require on-site confirmation.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
