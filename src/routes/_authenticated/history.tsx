import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecentLogs } from "@/lib/logs.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetch = useServerFn(listRecentLogs);
  const { data } = useSuspenseQuery({ queryKey: ["recent", 90], queryFn: () => fetch({ data: { days: 90 } }) });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Your last 90 days</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Symptoms" v={data.symptoms.length} />
        <Stat label="Hormones" v={data.hormones.length} />
        <Stat label="Voice memos" v={data.memos.length} />
        <Stat label="Meals" v={data.foods.length} />
        <Stat label="Wearable samples" v={data.wearables.length} />
        <Stat label="Daily logs" v={data.daily.length} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent symptoms</CardTitle></CardHeader>
        <CardContent>
          {data.symptoms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.symptoms.slice(0, 20).map((s: any) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.symptom.replace("_", " ")} · sev {s.severity} <span className="text-muted-foreground">({s.source})</span></span>
                  <span className="text-xs text-muted-foreground">{new Date(s.recorded_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent hormone readings</CardTitle></CardHeader>
        <CardContent>
          {data.hormones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No readings.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.hormones.slice(0, 20).map((h: any) => (
                <li key={h.id} className="flex items-center justify-between">
                  <span>{h.hormone} · {h.value} {h.unit}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.captured_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function Stat({ label, v }: { label: string; v: number }) {
  return (
    <Card><CardContent className="py-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{v}</div>
    </CardContent></Card>
  );
}
