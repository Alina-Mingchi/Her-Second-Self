import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSymptom, upsertDaily, listRecentLogs, addHormone } from "@/lib/logs.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/log/symptoms")({
  head: () => ({ meta: [{ title: "Log symptoms · Her Second Self" }] }),
  component: Page,
});

const SYMPTOMS = ["migraine","fatigue","brain_fog","mood","cramps","sleep","anxiety","hot_flash","headache","nausea","other"] as const;
const PHASES = ["menstrual","follicular","ovulatory","luteal","unknown"] as const;
const HORMONES = ["lh","fsh","estradiol","progesterone","testosterone","cortisol","basal_temp","other"] as const;

function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const [symptom, setSymptom] = useState<(typeof SYMPTOMS)[number]>("fatigue");
  const [severity, setSeverity] = useState([5]);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState("");
  const [cycleDay, setCycleDay] = useState("");
  const [phase, setPhase] = useState<(typeof PHASES)[number]>("unknown");
  const [hormone, setHormone] = useState<(typeof HORMONES)[number]>("estradiol");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("pg/mL");

  const qc = useQueryClient();
  const fetchRecent = useServerFn(listRecentLogs);
  const { data: recent } = useSuspenseQuery({ queryKey: ["recent", 14], queryFn: () => fetchRecent({ data: { days: 14 } }) });

  const addS = useServerFn(addSymptom);
  const addH = useServerFn(addHormone);
  const upd = useServerFn(upsertDaily);

  const mSym = useMutation({
    mutationFn: () => addS({ data: { log_date: today, symptom, severity: severity[0], free_text: note || undefined } }),
    onSuccess: () => { toast.success("Symptom logged"); setNote(""); qc.invalidateQueries({ queryKey: ["recent", 14] }); qc.invalidateQueries({ queryKey: ["today"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const mHor = useMutation({
    mutationFn: () => addH({ data: { hormone, value: Number(value), unit, method: "self_test" } }),
    onSuccess: () => { toast.success("Hormone reading saved"); setValue(""); qc.invalidateQueries({ queryKey: ["recent", 14] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const mDaily = useMutation({
    mutationFn: () =>
      upd({
        data: {
          log_date: today,
          notes: notes || null,
          cycle_day: cycleDay ? Number(cycleDay) : null,
          cycle_phase: phase,
        },
      }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["today"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Log symptoms</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a symptom</CardTitle>
          <CardDescription>Track severity 0–10.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Symptom</Label>
              <Select value={symptom} onValueChange={(v) => setSymptom(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYMPTOMS.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity: {severity[0]}</Label>
              <Slider value={severity} onValueChange={setSeverity} min={0} max={10} step={1} />
            </div>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anything relevant" />
          </div>
          <Button onClick={() => mSym.mutate()} disabled={mSym.isPending}>Save symptom</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cycle & notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cycle day</Label>
              <Input inputMode="numeric" value={cycleDay} onChange={(e) => setCycleDay(e.target.value)} placeholder="e.g. 14" />
            </div>
            <div>
              <Label>Phase</Label>
              <Select value={phase} onValueChange={(v) => setPhase(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes for today</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button variant="secondary" onClick={() => mDaily.mutate()} disabled={mDaily.isPending}>Save day</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hormone reading (self-test)</CardTitle>
          <CardDescription>Optional. Add a reading from a home strip, sensor, or lab.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Hormone</Label>
              <Select value={hormone} onValueChange={(v) => setHormone(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{HORMONES.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => mHor.mutate()} disabled={mHor.isPending || !value}>Save reading</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.symptoms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {recent.symptoms.slice(0, 10).map((s: any) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.symptom.replace("_", " ")} · sev {s.severity}</span>
                  <span className="text-xs text-muted-foreground">{new Date(s.recorded_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
