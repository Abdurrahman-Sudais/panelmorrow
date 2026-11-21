import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, MapPin, Download } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { fmt } from "@/lib/utils";
import { downloadCsv } from "@/lib/exporters";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteStatusBadge } from "@/components/common/badges";

type SortKey = "name" | "capacity" | "pi" | "loss";

export default function SitesPage() {
  const p = usePortfolio();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<SortKey>("pi");

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    const list = p.summaries.filter(
      (s) =>
        (cat === "all" || s.site.category === cat) &&
        (!term || [s.site.name, s.site.client, s.site.location.city, s.site.location.state, s.site.id].some((x) => x.toLowerCase().includes(term))),
    );
    const piOf = (x: number) => (Number.isNaN(x) ? 999 : x);
    return list.sort((a, b) =>
      sort === "name"
        ? a.site.name.localeCompare(b.site.name)
        : sort === "capacity"
          ? b.site.capacityKw - a.site.capacityKw
          : sort === "loss"
            ? b.last30LossKwh - a.last30LossKwh
            : piOf(a.metrics30.performanceIndex) - piOf(b.metrics30.performanceIndex),
    );
  }, [p.summaries, q, cat, sort]);

  const exportCsv = () =>
    downloadCsv(
      "panelmorrow-sites.csv",
      rows.map((s) => ({
        site_id: s.site.id,
        name: s.site.name,
        client: s.site.client,
        category: s.site.category,
        city: s.site.location.city,
        state: s.site.location.state,
        capacity_kw: s.site.capacityKw,
        install_date: s.site.installDate,
        status: s.status,
        performance_index_30d: s.metrics30.performanceIndex.toFixed(1),
        loss_kwh_30d: Math.round(s.last30LossKwh),
        open_anomalies: s.openAnomalies.length,
      })),
    );

  return (
    <div>
      <PageHeader
        title="Solar sites"
        description="Registered installations, their configuration and weather-adjusted performance over the last 30 days."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download />Export CSV</Button>
            <Button asChild variant="solar"><Link to="/app/sites/new"><Plus />Register site</Link></Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, client, city or ID…" className="pl-9" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {["Commercial Rooftop", "Industrial", "Ground-mount Farm", "Carport", "Public Sector"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pi">Sort: lowest performance</SelectItem>
              <SelectItem value="loss">Sort: highest loss</SelectItem>
              <SelectItem value="capacity">Sort: largest capacity</SelectItem>
              <SelectItem value="name">Sort: name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Capacity</TableHead>
              <TableHead className="text-right">Performance (30d)</TableHead>
              <TableHead className="text-right">Loss (30d)</TableHead>
              <TableHead className="text-center">Open anomalies</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.site.id} className="cursor-pointer" onClick={() => navigate(`/app/sites/${s.site.id}`)}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{s.site.name}</p>
                  <p className="text-xs text-muted-foreground">{s.site.id} · {s.site.client}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.site.location.city}, {s.site.location.state}</span></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{s.site.category}</TableCell>
                <TableCell className="tabular text-right">{fmt.kw(s.site.capacityKw)}</TableCell>
                <TableCell className="tabular text-right font-semibold">
                  {Number.isNaN(s.metrics30.performanceIndex) ? <span className="text-muted-foreground">—</span> : fmt.pct(s.metrics30.performanceIndex)}
                </TableCell>
                <TableCell className="tabular text-right">{s.last30LossKwh ? fmt.kwh(s.last30LossKwh) : "—"}</TableCell>
                <TableCell className="text-center">
                  {s.openAnomalies.length ? <span className="rounded-full bg-solar-100 px-2 py-0.5 text-xs font-bold text-solar-700">{s.openAnomalies.length}</span> : <span className="text-muted-foreground">0</span>}
                </TableCell>
                <TableCell><SiteStatusBadge status={s.status} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No sites match your search.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
