import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Info, Save } from "lucide-react";
import type { Site } from "@/types";
import { usePortfolio } from "@/hooks/usePortfolio";
import { sitesService } from "@/services/api/sites";
import { nearestDepot } from "@/data/sites";
import { SCENARIOS } from "@/data/sites";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimulatedTag } from "@/components/common/badges";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REGIONS = ["South West", "North Central", "North West", "South South", "South East", "North East"] as const;
const num = (min: number, max: number, msg?: string) => z.coerce.number({ invalid_type_error: "Enter a number" }).min(min, msg).max(max, msg);

const schema = z
  .object({
    name: z.string().min(3, "Site name is required"),
    client: z.string().min(2, "Client / owner is required"),
    category: z.enum(["Commercial Rooftop", "Industrial", "Ground-mount Farm", "Carport", "Public Sector"]),
    address: z.string().min(3, "Address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    region: z.enum(REGIONS),
    lat: num(-90, 90, "Latitude must be between −90 and 90"),
    lng: num(-180, 180, "Longitude must be between −180 and 180"),
    capacityKw: num(1, 500_000, "Capacity must be 1 kW – 500 MW"),
    installDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((d) => new Date(d) <= new Date(), "Install date cannot be in the future"),
    panelManufacturer: z.string().min(2, "Required"),
    panelModel: z.string().min(1, "Required"),
    panelWattage: num(50, 1000, "50–1000 W"),
    panelCount: z.coerce.number().int("Whole number").min(1, "At least 1"),
    inverterManufacturer: z.string().min(2, "Required"),
    inverterModel: z.string().min(1, "Required"),
    inverterRatedKw: num(0.5, 10_000, "0.5–10,000 kW"),
    inverterCount: z.coerce.number().int().min(1, "At least 1"),
    accessibility: z.enum(["Easy", "Moderate", "Difficult"]),
    travelKm: num(0, 2000, "0–2000 km"),
    method: z.enum(["simulated-weather-model", "monthly-profile"]),
    targetPr: num(0.5, 0.95, "Typical PR is 0.5–0.95"),
    tiltDeg: num(0, 90, "0–90°"),
    azimuthDeg: num(0, 360, "0–360°"),
    annualDegradationPct: num(0, 3, "0–3 %/yr"),
    monthlyKwh: z.array(z.coerce.number().min(0, "≥ 0")).length(12),
  })
  .refine((v) => Math.abs((v.panelWattage * v.panelCount) / 1000 - v.capacityKw) / v.capacityKw < 0.15, {
    path: ["panelCount"],
    message: "Panel wattage × count should be within 15% of installed capacity",
  })
  .refine((v) => v.method !== "monthly-profile" || v.monthlyKwh.some((x) => x > 0), {
    path: ["monthlyKwh"],
    message: "Enter at least one monthly expected value",
  });

type Values = z.infer<typeof schema>;

const DEFAULTS: Values = {
  name: "",
  client: "",
  category: "Commercial Rooftop",
  address: "",
  city: "",
  state: "",
  region: "South West",
  lat: 6.5244,
  lng: 3.3792,
  capacityKw: 250,
  installDate: "2024-01-15",
  panelManufacturer: "",
  panelModel: "",
  panelWattage: 550,
  panelCount: 455,
  inverterManufacturer: "",
  inverterModel: "",
  inverterRatedKw: 50,
  inverterCount: 5,
  accessibility: "Easy",
  travelKm: 0,
  method: "simulated-weather-model",
  targetPr: 0.8,
  tiltDeg: 8,
  azimuthDeg: 180,
  annualDegradationPct: 0.5,
  monthlyKwh: Array(12).fill(0),
};

function siteToValues(s: Site): Values {
  return {
    name: s.name, client: s.client, category: s.category, address: s.location.address, city: s.location.city, state: s.location.state,
    region: s.location.region, lat: s.location.lat, lng: s.location.lng, capacityKw: s.capacityKw, installDate: s.installDate,
    panelManufacturer: s.panels.manufacturer, panelModel: s.panels.model, panelWattage: s.panels.wattage, panelCount: s.panels.count,
    inverterManufacturer: s.inverters.manufacturer, inverterModel: s.inverters.model, inverterRatedKw: s.inverters.ratedKw, inverterCount: s.inverters.count,
    accessibility: s.accessibility, travelKm: s.travelKm, method: s.expected.method, targetPr: s.expected.targetPr, tiltDeg: s.expected.tiltDeg,
    azimuthDeg: s.expected.azimuthDeg, annualDegradationPct: s.expected.annualDegradationPct, monthlyKwh: s.expected.monthlyKwh ?? Array(12).fill(0),
  };
}

export default function SiteFormPage() {
  const { id } = useParams();
  const p = usePortfolio();
  const navigate = useNavigate();
  const existing = id ? p.siteById.get(id) : undefined;
  const isSeed = !!id && id in SCENARIOS;

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: existing ? siteToValues(existing) : DEFAULTS });
  const [lat, lng, method] = useWatch({ control: form.control, name: ["lat", "lng", "method"] });
  const depot = useMemo(() => (Number.isFinite(+lat) && Number.isFinite(+lng) ? nearestDepot(+lat, +lng) : null), [lat, lng]);

  useEffect(() => {
    if (depot && !form.getFieldState("travelKm").isDirty) form.setValue("travelKm", depot.travelKm);
  }, [depot, form]);

  const onSubmit = async (v: Values) => {
    const site: Site = {
      id: existing?.id ?? `PM-USR-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      name: v.name,
      client: v.client,
      category: v.category,
      location: { address: v.address, city: v.city, state: v.state, region: v.region, lat: v.lat, lng: v.lng },
      capacityKw: v.capacityKw,
      panels: { manufacturer: v.panelManufacturer, model: v.panelModel, wattage: v.panelWattage, count: v.panelCount },
      inverters: { manufacturer: v.inverterManufacturer, model: v.inverterModel, ratedKw: v.inverterRatedKw, count: v.inverterCount },
      installDate: v.installDate,
      accessibility: v.accessibility,
      travelKm: v.travelKm,
      depot: depot?.depot ?? "—",
      expected: {
        method: v.method,
        targetPr: v.targetPr,
        tiltDeg: v.tiltDeg,
        azimuthDeg: v.azimuthDeg,
        annualDegradationPct: v.annualDegradationPct,
        monthlyKwh: v.method === "monthly-profile" ? v.monthlyKwh : undefined,
      },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    if (existing) await sitesService.update(site);
    else await sitesService.create(site);
    toast.success(existing ? "Site updated" : "Site registered", { description: existing ? undefined : "Next: upload historical generation records." });
    navigate(`/app/sites/${site.id}`);
  };

  const text = (name: keyof Values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, desc?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Input {...props} {...field} value={field.value as string | number} /></FormControl>
          {desc && <FormDescription>{desc}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const select = (name: keyof Values, label: string, options: readonly string[] | { v: string; l: string }[]) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value as string}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              {options.map((o) => (typeof o === "string" ? <SelectItem key={o} value={o}>{o}</SelectItem> : <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  if (isSeed) {
    return (
      <div>
        <PageHeader title="Edit site" />
        <Card className="p-6 text-sm text-muted-foreground">
          Demonstration portfolio sites are read-only. <Link to="/app/sites/new" className="font-medium text-solar-600">Register a new site</Link> to try editing.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link to={existing ? `/app/sites/${existing.id}` : "/app/sites"}><ArrowLeft />Back</Link></Button>
      <PageHeader title={existing ? `Edit ${existing.name}` : "Register a solar installation"} description="Site details feed the weather-adjusted model, the prioritisation engine (travel & access) and reports." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Site details</CardTitle><CardDescription>Identification and ownership</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {text("name", "Site name", { placeholder: "e.g. Lekki Retail Park" })}
              {text("client", "Client / owner")}
              {select("category", "Site category", ["Commercial Rooftop", "Industrial", "Ground-mount Farm", "Carport", "Public Sector"])}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Location & access</CardTitle><CardDescription>Used for weather matching, travel distance and inspection effort</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-3">{text("address", "Street address")}</div>
              {text("city", "City")}
              {text("state", "State")}
              {select("region", "Region", REGIONS)}
              {text("lat", "Latitude", { type: "number", step: "0.0001" })}
              {text("lng", "Longitude", { type: "number", step: "0.0001" })}
              {select("accessibility", "Site accessibility", ["Easy", "Moderate", "Difficult"])}
              {text("travelKm", "Travel distance (km)", { type: "number" }, depot ? `Nearest: ${depot.depot} (~${depot.travelKm} km road estimate)` : undefined)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>System configuration</CardTitle><CardDescription>Installed capacity, panels and inverters</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              {text("capacityKw", "Installed capacity (kWp)", { type: "number", step: "0.1" })}
              {text("installDate", "Installation date", { type: "date" })}
              <div className="hidden md:col-span-2 md:block" />
              {text("panelManufacturer", "Panel manufacturer")}
              {text("panelModel", "Panel model")}
              {text("panelWattage", "Panel rating (W)", { type: "number" })}
              {text("panelCount", "Panel count", { type: "number" })}
              {text("inverterManufacturer", "Inverter manufacturer")}
              {text("inverterModel", "Inverter model")}
              {text("inverterRatedKw", "Inverter rating (kW)", { type: "number", step: "0.1" })}
              {text("inverterCount", "Inverter count", { type: "number" })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Expected generation</CardTitle>
                <CardDescription>How PanelMorrow estimates what this site should produce</CardDescription>
              </div>
              <SimulatedTag />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-2">
                  {select("method", "Expected output method", [
                    { v: "simulated-weather-model", l: "Weather-adjusted model" },
                    { v: "monthly-profile", l: "Monthly expected profile" },
                  ])}
                </div>
                {text("targetPr", "Target PR", { type: "number", step: "0.01" })}
                {text("tiltDeg", "Tilt (°)", { type: "number" })}
                {text("azimuthDeg", "Azimuth (°)", { type: "number" })}
                {text("annualDegradationPct", "Degradation (%/yr)", { type: "number", step: "0.1" })}
              </div>
              {method === "monthly-profile" && (
                <div>
                  <p className="mb-2 text-[13px] font-medium">Monthly expected generation (kWh) — scaled daily by measured irradiance</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
                    {MONTHS.map((m, i) => (
                      <FormField key={m} control={form.control} name={`monthlyKwh.${i}` as const} render={({ field }) => (
                        <FormItem><FormLabel className="text-[11px] text-muted-foreground">{m}</FormLabel><FormControl><Input type="number" className="px-2" {...field} /></FormControl></FormItem>
                      )} />
                    ))}
                  </div>
                  <FormMessage>{form.formState.errors.monthlyKwh?.message ?? form.formState.errors.monthlyKwh?.root?.message}</FormMessage>
                </div>
              )}
              <div className="flex gap-2 rounded-lg bg-violet-50 p-3 text-xs text-violet-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                In this demo, expected output is computed by a simulated weather-adjusted model. In production, the same configuration is passed to the SageMaker AI expected-generation endpoint.
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" variant="solar" disabled={form.formState.isSubmitting}><Save />{form.formState.isSubmitting ? "Saving…" : existing ? "Save changes" : "Register site"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
