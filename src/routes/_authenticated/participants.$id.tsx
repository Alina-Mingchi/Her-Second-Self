import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getParticipantData } from "@/lib/researcher.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/participants/$id")({
  head: () => ({ meta: [{ title: "Participant · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const fetch = useServerFn(getParticipantData);
  const { data } = useSuspenseQuery({ queryKey: ["participant", id], queryFn: () => fetch({ data: { subject: id } }) });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <Link to="/participants" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to participants
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-mono">{data.profile?.pseudonym}</h1>
        <p className="text-xs text-muted-foreground">Every access is logged in the audit trail.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Daily logs" v={data.daily.length} />
        <Stat label="Symptoms" v={data.symptoms.length} />
        <Stat label="Hormones" v={data.hormones.length} />
        <Stat label="Voice memos" v={data.memos.length} />
        <Stat label="Meals" v={data.foods.length} />
        <Stat label="Wearable samples" v={data.wearables.length} />
        <Stat label="Lab results" v={data.labs.length} />
        <Stat label="Brain signals" v={data.brain.length} />
        <Stat label="EHR docs" v={(data.ehr ?? []).length} />
      </div>

      <Section title="Symptoms">
        <ul className="space-y-1 text-sm">
          {data.symptoms.slice(0, 30).map((s: any) => (
            <li key={s.id} className="flex justify-between">
              <span>{s.symptom.replace("_", " ")} · sev {s.severity} <span className="text-muted-foreground">({s.source})</span></span>
              <span className="text-xs text-muted-foreground">{new Date(s.recorded_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Hormone readings">
        <ul className="space-y-1 text-sm">
          {data.hormones.slice(0, 30).map((h: any) => (
            <li key={h.id} className="flex justify-between">
              <span>{h.hormone} · {h.value} {h.unit} <span className="text-muted-foreground">({h.method})</span></span>
              <span className="text-xs text-muted-foreground">{new Date(h.captured_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Voice memos">
        <ul className="space-y-2 text-sm">
          {data.memos.slice(0, 20).map((m: any) => (
            <li key={m.id} className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()} · {m.duration_s ?? "–"}s · {m.status}</div>
              {m.transcript && <p className="mt-1 line-clamp-3">{m.transcript}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Lab results">
        <ul className="space-y-1 text-sm">
          {data.labs.slice(0, 30).map((l: any) => (
            <li key={l.id} className="flex justify-between">
              <span>{l.analyte} · {l.value} {l.unit ?? ""} {l.panel ? `· ${l.panel}` : ""}</span>
              <span className="text-xs text-muted-foreground">{new Date(l.collected_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="EHR documents">
        <ul className="space-y-1 text-sm">
          {(data.ehr ?? []).slice(0, 30).map((d: any) => (
            <li key={d.id} className="flex justify-between">
              <span>{d.file_name} {d.document_type ? <span className="text-muted-foreground">· {d.document_type}</span> : null}</span>
              <span className="text-xs text-muted-foreground">{new Date(d.recorded_at ?? d.created_at).toLocaleDateString()}</span>
            </li>
          ))}
          {(!data.ehr || data.ehr.length === 0) && <li className="text-xs text-muted-foreground">No EHR documents uploaded.</li>}
        </ul>
      </Section>
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
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
