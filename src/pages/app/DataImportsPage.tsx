import { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Papa from "papaparse";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CloudSun, Download, FileUp, Loader2, Sun, UploadCloud, X } from "lucide-react";
import type { DailyRecord, Site } from "@/types";
import { usePortfolio } from "@/hooks/usePortfolio";
import { uploadsService } from "@/services/api/uploads";
import { simulatedExpectedKwh, simulateWeather, addDays } from "@/data/generator";
import { fmt, cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/exporters";
import { PageHeader } from "@/components/common/PageHeader";
import { Field } from "@/components/common/Field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Kind = "generation" | "weather";

const ALIASES: Record<string, string[]> = {
  date: ["date", "day", "timestamp", "reading_date"],
  actual_kwh: ["actual_kwh", "actual", "generation_kwh", "energy_kwh", "kwh", "yield_kwh", "production_kwh"],
  expected_kwh: ["expected_kwh", "expected", "forecast_kwh", "modelled_kwh"],
  irradiance_kwh_m2: ["irradiance_kwh_m2", "irradiance", "poa_kwh_m2", "ghi_kwh_m2", "insolation"],
  ambient_temp_c: ["ambient_temp_c", "temp_c", "temperature", "ambient_temp", "temp"],
  cloud_cover_pct: ["cloud_cover_pct", "cloud_cover", "cloud", "clouds_pct"],
};

const REQUIRED: Record<Kind, string[]> = {
  generation: ["date", "actual_kwh"],
  weather: ["date", "irradiance_kwh_m2", "ambient_temp_c"],
};

const dateStr = z
  .string()
  .trim()
  .transform((s) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : /^\d{2}\/\d{2}\/\d{4}$/.test(s) ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : s))
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime()), "Invalid date (use YYYY-MM-DD or DD/MM/YYYY)");
const optNum = (min: number, max: number, label: string) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number({ invalid_type_error: `${label} must be a number` }).min(min, `${label} below ${min}`).max(max, `${label} above ${max}`).optional());

function rowSchema(kind: Kind, site?: Site) {
  const maxDaily = site ? site.capacityKw * 9 : 1e7; // > 9 kWh/kWp/day is physically implausible
  return z.object({
    date: dateStr,
    actual_kwh: kind === "generation" ? z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number({ required_error: "actual_kwh missing", invalid_type_error: "actual_kwh must be a number" }).min(0, "actual_kwh negative").max(maxDaily, `actual_kwh exceeds plausible max (${fmt.num(maxDaily)})`)) : z.any().optional(),
    expected_kwh: optNum(0, maxDaily, "expected_kwh"),
    irradiance_kwh_m2: kind === "weather" ? z.coerce.number({ invalid_type_error: "irradiance must be a number" }).min(0, "irradiance negative").max(10, "irradiance above 10 kWh/m²") : optNum(0, 10, "irradiance"),
    ambient_temp_c: kind === "weather" ? z.coerce.number({ invalid_type_error: "temperature must be a number" }).min(-30, "temp below −30").max(60, "temp above 60") : optNum(-30, 60, "temperature"),
    cloud_cover_pct: optNum(0, 100, "cloud_cover"),
  });
}

interface Parsed {
  file: File;
  headers: string[];
  mapping: Record<string, string | undefined>;
  missing: string[];
  valid: DailyRecord[];
  errors: { row: number; message: string }[];
  total: number;
}

function sampleCsv(kind: Kind, site: Site) {
  const start = addDays("2026-11-20", -13);
  const w = simulateWeather(site, start, 14);
  const rows = w.map((d) => {
    const exp = simulatedExpectedKwh(site, d, d.date);
    return kind === "generation"
      ? { date: d.date, actual_kwh: (exp * (0.9 + Math.random() * 0.12)).toFixed(1), irradiance_kwh_m2: d.irradianceKwhM2, ambient_temp_c: d.ambientTempC, cloud_cover_pct: d.cloudCoverPct }
      : { date: d.date, irradiance_kwh_m2: d.irradianceKwhM2, ambient_temp_c: d.ambientTempC, cloud_cover_pct: d.cloudCoverPct };
  });
  return Papa.unparse(rows);
}

export default function DataImportsPage() {
  const p = usePortfolio();
  const [params] = useSearchParams();
  const [kind, setKind] = useState<Kind>("generation");
  const [siteId, setSiteId] = useState(params.get("site") ?? p.state.sites[0].id);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const site = p.siteById.get(siteId)!;
  const existing = useMemo(() => new Map((p.state.records[siteId] ?? []).map((r) => [r.date, r])), [p.state.records, siteId]);

  const handleFile = (file: File) => {
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Please choose a .csv file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large for browser preview (10 MB max). Use the API for bulk loads.");
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"),
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const mapping: Record<string, string | undefined> = {};
        for (const [canon, aliases] of Object.entries(ALIASES)) mapping[canon] = aliases.find((a) => headers.includes(a));
        const missing = REQUIRED[kind].filter((r) => !mapping[r]);
        const schema = rowSchema(kind, site);
        const valid: DailyRecord[] = [];
        const errors: Parsed["errors"] = [];
        const seen = new Set<string>();
        if (!missing.length) {
          res.data.forEach((raw, i) => {
            const obj = Object.fromEntries(Object.entries(mapping).map(([k, col]) => [k, col ? raw[col] : undefined]));
            const r = schema.safeParse(obj);
            if (!r.success) {
              errors.push({ row: i + 2, message: r.error.issues.map((x) => x.message).join("; ") });
              return;
            }
            const v = r.data;
            if (seen.has(v.date)) {
              errors.push({ row: i + 2, message: `Duplicate date ${v.date}` });
              return;
            }
            seen.add(v.date);
            const prev = existing.get(v.date);
            const irr = v.irradiance_kwh_m2 ?? prev?.irradianceKwhM2;
            const temp = v.ambient_temp_c ?? prev?.ambientTempC ?? 28;
            if (irr == null && v.expected_kwh == null) {
              errors.push({ row: i + 2, message: "No irradiance or expected_kwh — cannot compute weather-adjusted expectation (upload weather first)" });
              return;
            }
            const usesUploadedExpected = v.expected_kwh != null;
            valid.push({
              date: v.date,
              actualKwh: kind === "generation" ? (v.actual_kwh as number) : (prev?.actualKwh ?? null),
              actualSource: kind === "generation" ? "csv-upload" : (prev?.actualSource ?? "csv-upload"),
              expectedKwh: usesUploadedExpected ? (v.expected_kwh as number) : simulatedExpectedKwh(site, { irradianceKwhM2: irr as number, ambientTempC: temp }, v.date),
              expectedSource: usesUploadedExpected ? "uploaded-expected" : "simulated-model",
              irradianceKwhM2: irr ?? 0,
              ambientTempC: temp,
              cloudCoverPct: v.cloud_cover_pct ?? prev?.cloudCoverPct ?? 0,
              weatherSource: v.irradiance_kwh_m2 != null ? "csv-upload" : (prev?.weatherSource ?? "csv-upload"),
            });
          });
        }
        setParsed({ file, headers, mapping, missing, valid: valid.sort((a, b) => a.date.localeCompare(b.date)), errors, total: res.data.length });
      },
      error: (err) => toast.error(`Could not parse CSV: ${err.message}`),
    });
  };

  const doImport = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const log = await uploadsService.ingest(kind, siteId, parsed.file, parsed.valid, parsed.errors.length);
      toast.success(`Imported ${log.rows} ${kind} rows into ${site.name}`, { description: "Analysis and anomaly detection re-ran on the updated data." });
      setParsed(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const columns = kind === "generation"
    ? [["date", "YYYY-MM-DD or DD/MM/YYYY", true], ["actual_kwh", "Measured daily generation (kWh)", true], ["expected_kwh", "Optional — your own expected value; otherwise simulated model", false], ["irradiance_kwh_m2", "Optional — plane-of-array or GHI daily total", false], ["ambient_temp_c", "Optional — daily mean ambient temperature", false], ["cloud_cover_pct", "Optional — 0–100", false]]
    : [["date", "YYYY-MM-DD or DD/MM/YYYY", true], ["irradiance_kwh_m2", "Daily irradiation (kWh/m²)", true], ["ambient_temp_c", "Daily mean ambient temperature (°C)", true], ["cloud_cover_pct", "Optional — 0–100", false]];

  return (
    <div>
      <PageHeader title="Data imports" description="Upload historical generation records and weather datasets. Files are validated in the browser, then stored (Amazon S3 in production) and analysed." />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Tabs value={kind} onValueChange={(v) => { setKind(v as Kind); setParsed(null); }}>
                <TabsList className="h-auto flex-wrap">
                  <TabsTrigger value="generation"><Sun className="h-4 w-4" />Generation records</TabsTrigger>
                  <TabsTrigger value="weather"><CloudSun className="h-4 w-4" />Weather dataset</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Field label="Target site">
                  <Select value={siteId} onValueChange={(v) => { setSiteId(v); setParsed(null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{p.state.sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.id})</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => downloadBlob(`panelmorrow-${kind}-template-${siteId}.csv`, new Blob([sampleCsv(kind, site)], { type: "text/csv" }))}>
                    <Download />Sample CSV
                  </Button>
                </div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => inputRef.current?.click()}
                className={cn("flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors", drag ? "border-solar-400 bg-solar-50" : "border-border hover:border-solar-300 hover:bg-secondary/40")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              >
                <UploadCloud className="h-10 w-10 text-solar-500" />
                <p className="mt-3 font-semibold text-navy-900">Drop a {kind} CSV here, or click to browse</p>
                <p className="mt-1 text-xs text-muted-foreground">Daily rows · max 10 MB · common column names are auto-mapped</p>
                <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              </div>
            </CardContent>
          </Card>

          {parsed && (
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2"><FileUp className="h-4 w-4" />{parsed.file.name}</CardTitle>
                  <CardDescription>{parsed.total} rows · {(parsed.file.size / 1024).toFixed(1)} KB · target {site.name}</CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setParsed(null)} aria-label="Discard"><X /></Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(parsed.mapping).map(([canon, col]) =>
                    col ? <Badge key={canon} variant="success">{canon} ← {col}</Badge> : REQUIRED[kind].includes(canon) ? <Badge key={canon} variant="critical">{canon} missing</Badge> : null,
                  )}
                </div>
                {parsed.missing.length > 0 ? (
                  <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Required column(s) not found: {parsed.missing.join(", ")}. Found: {parsed.headers.join(", ") || "none"}.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border bg-teal-50 p-3"><p className="text-xs text-teal-800">Valid rows</p><p className="tabular text-xl font-bold text-teal-900">{parsed.valid.length}</p></div>
                      <div className={cn("rounded-lg border p-3", parsed.errors.length ? "bg-red-50" : "bg-secondary/40")}><p className="text-xs text-muted-foreground">Rejected rows</p><p className="tabular text-xl font-bold text-navy-900">{parsed.errors.length}</p></div>
                      <div className="rounded-lg border bg-secondary/40 p-3"><p className="text-xs text-muted-foreground">Will overwrite</p><p className="tabular text-xl font-bold text-navy-900">{parsed.valid.filter((v) => existing.has(v.date)).length}</p></div>
                    </div>
                    {parsed.errors.length > 0 && (
                      <div className="max-h-40 overflow-auto rounded-lg border border-red-200 bg-red-50/50 p-3 text-xs text-red-800">
                        {parsed.errors.slice(0, 50).map((e) => <p key={e.row}>Row {e.row}: {e.message}</p>)}
                        {parsed.errors.length > 50 && <p>…and {parsed.errors.length - 50} more</p>}
                      </div>
                    )}
                    {parsed.valid.length > 0 && (
                      <div className="max-h-72 overflow-auto rounded-lg border">
                        <Table>
                          <TableHeader className="sticky top-0">
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Actual</TableHead>
                              <TableHead className="text-right">Expected</TableHead>
                              <TableHead className="text-right">Irradiance</TableHead>
                              <TableHead className="text-right">Temp</TableHead>
                              <TableHead>Expected source</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsed.valid.slice(0, 60).map((r) => (
                              <TableRow key={r.date}>
                                <TableCell className="tabular">{r.date}</TableCell>
                                <TableCell className="tabular text-right">{r.actualKwh == null ? "—" : fmt.num(r.actualKwh, 1)}</TableCell>
                                <TableCell className="tabular text-right text-violet-700">{fmt.num(r.expectedKwh, 1)}</TableCell>
                                <TableCell className="tabular text-right">{r.irradianceKwhM2.toFixed(2)}</TableCell>
                                <TableCell className="tabular text-right">{r.ambientTempC.toFixed(1)}</TableCell>
                                <TableCell><Badge variant={r.expectedSource === "simulated-model" ? "simulated" : "outline"}>{r.expectedSource}</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setParsed(null)}>Discard</Button>
                      <Button variant="solar" disabled={!parsed.valid.length || busy} onClick={doImport}>
                        {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Import {parsed.valid.length} rows
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Upload history</CardTitle><CardDescription>Files imported in this workspace</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Type</TableHead><TableHead>Site</TableHead><TableHead className="text-right">Rows</TableHead><TableHead className="text-right">Rejected</TableHead><TableHead>Uploaded</TableHead><TableHead>Storage key</TableHead></TableRow></TableHeader>
                <TableBody>
                  {p.state.uploads.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.fileName}</TableCell>
                      <TableCell><Badge variant="secondary">{u.kind}</Badge></TableCell>
                      <TableCell><Link to={`/app/sites/${u.siteId}`} className="hover:text-solar-600">{p.siteById.get(u.siteId)?.name ?? u.siteId}</Link></TableCell>
                      <TableCell className="tabular text-right">{u.rows}</TableCell>
                      <TableCell className="tabular text-right">{u.rejected}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{new Date(u.uploadedAt).toLocaleString("en-GB")}</TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-[11px] text-muted-foreground">s3://…/{u.storageKey}</TableCell>
                    </TableRow>
                  ))}
                  {p.state.uploads.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No uploads yet. Download a sample CSV to try the import flow.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Expected columns</CardTitle><CardDescription>{kind === "generation" ? "Generation records" : "Weather dataset"} format</CardDescription></CardHeader>
            <CardContent className="space-y-2.5">
              {columns.map(([c, d, req]) => (
                <div key={c as string} className="text-sm">
                  <p className="flex items-center gap-2 font-mono text-[12.5px] font-semibold text-navy-900">{c}{req ? <Badge variant="high">required</Badge> : null}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-navy-900">How imported data is used</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Uploaded <strong>actual</strong> values are treated as operational measurements.</li>
              <li>If no <code>expected_kwh</code> is supplied, expected output is computed by the <strong>simulated</strong> weather-adjusted model and labelled as such.</li>
              <li>Weather uploads replace demo weather and recompute expected output for matching dates.</li>
              <li>Rows with implausible values (e.g. &gt; 9 kWh/kWp/day) are rejected.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
