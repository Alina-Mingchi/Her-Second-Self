import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { bulkWearable } from "@/lib/wearable.functions";
import {
  startOuraConnect,
  saveOuraConnection,
  getOuraStatus,
  disconnectOura,
  syncOura,
} from "@/lib/oura.functions";
import { connectAppUser } from "@/integrations/lovable/appUserConnectorClient";
import { toast } from "sonner";
import { Upload, CheckCircle2, RefreshCw } from "lucide-react";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const SOURCES = ["apple_health", "fitbit", "oura", "garmin", "whoop", "csv", "manual"] as const;
const METRICS = ["sleep_min","deep_sleep_min","rem_sleep_min","hrv","resting_hr","steps","stress","spo2","skin_temp"] as const;

export const Route = createFileRoute("/_authenticated/log/wearable")({
  head: () => ({ meta: [{ title: "Wearable data · Her Second Self" }] }),
  component: Page,
});

// Brand marks. Apple / Fitbit / Garmin come from simpleicons.org CDN (official
// brand SVGs, tinted with each brand's hex). Oura and Whoop aren't on that CDN,
// so we render minimal inline SVG marks in their brand style.
const cdnLogo = (slug: string, hex: string) => (
  <img src={`https://cdn.simpleicons.org/${slug}/${hex}`} alt="" className="h-4 w-4" />
);

const OuraMark = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>
);

const WhoopMark = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 48 24" className={className} aria-hidden="true">
    <path
      d="M2 4 L9 20 L16 8 L23 20 L30 4 M32 4 L39 20 L46 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const COMING_SOON: { id: string; label: string; logo: React.ReactNode; note: string }[] = [
  { id: "apple_health", label: "Apple Health", logo: cdnLogo("apple", "000000"), note: "Web APIs can't reach HealthKit — use the CSV/XML export for now." },
  { id: "fitbit", label: "Fitbit", logo: cdnLogo("fitbit", "00B0B9"), note: "OAuth integration coming soon." },
  { id: "garmin", label: "Garmin", logo: cdnLogo("garmin", "007CC3"), note: "OAuth integration coming soon." },
  { id: "whoop", label: "Whoop", logo: <WhoopMark />, note: "OAuth integration coming soon." },
];

function Page() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<(typeof SOURCES)[number]>("csv");
  const [rowsPreview, setRowsPreview] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const bulk = useServerFn(bulkWearable);
  const startOura = useServerFn(startOuraConnect);
  const saveOura = useServerFn(saveOuraConnection);
  const statusFn = useServerFn(getOuraStatus);
  const disconnectFn = useServerFn(disconnectOura);
  const syncFn = useServerFn(syncOura);

  const status = useQuery({
    queryKey: ["oura-status"],
    queryFn: () => statusFn(),
  });

  const connectMut = useMutation({
    mutationFn: async () => {
      const result = await connectAppUser({
        connectorId: "oura",
        gatewayBaseUrl: GATEWAY_BASE_URL,
        start: (targetOrigin) => startOura({ data: targetOrigin }),
      });
      if (!result.success) throw new Error(result.error ?? "Connect failed");
      if (result.connectionAPIKey) {
        await saveOura({ data: { connectionAPIKey: result.connectionAPIKey } });
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Oura connected");
      qc.invalidateQueries({ queryKey: ["oura-status"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const syncMut = useMutation({
    mutationFn: async () => syncFn({ data: { days: 14 } }),
    onSuccess: (r) => toast.success(`Synced ${r.inserted} Oura samples`),
    onError: (e: any) => toast.error(e.message),
  });

  const disconnectMut = useMutation({
    mutationFn: async () => disconnectFn(),
    onSuccess: () => {
      toast.success("Oura disconnected");
      qc.invalidateQueries({ queryKey: ["oura-status"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
    const idxTime = header.indexOf("timestamp") !== -1 ? header.indexOf("timestamp") : header.indexOf("recorded_at");
    const idxMetric = header.indexOf("metric");
    const idxValue = header.indexOf("value");
    const idxUnit = header.indexOf("unit");
    if (idxTime < 0 || idxMetric < 0 || idxValue < 0) return [];
    return lines.slice(1).map((l) => {
      const c = l.split(",");
      return {
        recorded_at: new Date(c[idxTime]).toISOString(),
        metric: c[idxMetric]?.trim(),
        value: Number(c[idxValue]),
        unit: idxUnit >= 0 ? c[idxUnit]?.trim() : undefined,
      };
    }).filter((r) => r.metric && !Number.isNaN(r.value) && (METRICS as readonly string[]).includes(r.metric));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    const parsed = parseCsv(text);
    setRowsPreview(parsed);
  }

  const m = useMutation({
    mutationFn: async () => {
      if (!rowsPreview || rowsPreview.length === 0) throw new Error("No valid rows");
      const r = await bulk({ data: { source, samples: rowsPreview as any } });
      return r;
    },
    onSuccess: (r) => toast.success(`Imported ${r.inserted} samples`),
    onError: (e: any) => toast.error(e.message),
  });

  const connected = status.data?.connected ?? false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Wearable data</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect a device directly, or import a CSV export.
      </p>

      {/* Oura — live */}
      <Card className="mt-5">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <OuraMark className="h-5 w-5 text-primary" />
                Oura Ring
                {connected && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Sleep, HRV, resting HR, readiness, steps, SpO₂ — synced on demand.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!connected ? (
            <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
              {connectMut.isPending ? "Opening Oura…" : "Connect Oura"}
            </Button>
          ) : (
            <>
              <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
                {syncMut.isPending ? "Syncing…" : "Sync last 14 days"}
              </Button>
              <Button variant="outline" onClick={() => disconnectMut.mutate()} disabled={disconnectMut.isPending}>
                Disconnect
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Coming soon direct connections */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COMING_SOON.map((c) => (
          <Card key={c.id} className="opacity-70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                {c.logo}
                {c.label}
                <Badge variant="outline" className="ml-auto text-[10px]">Coming soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{c.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CSV import */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">CSV import</CardTitle>
          <CardDescription>
            Columns: <code>timestamp,metric,value,unit</code>. Metric one of: {METRICS.join(", ")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Choose CSV
          </Button>
          {fileName && <div className="text-sm text-muted-foreground">{fileName} · {rowsPreview?.length ?? 0} valid rows</div>}
          {rowsPreview && rowsPreview.length > 0 && (
            <Button onClick={() => m.mutate()} disabled={m.isPending}>
              {m.isPending ? "Uploading…" : `Import ${rowsPreview.length} samples`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
