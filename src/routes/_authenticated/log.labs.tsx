import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listParticipants, uploadLabResult } from "@/lib/researcher.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/log/labs")({
  head: () => ({ meta: [{ title: "Lab results · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetchList = useServerFn(listParticipants);
  const { data: participants } = useSuspenseQuery({ queryKey: ["participants"], queryFn: () => fetchList() });
  const [subject, setSubject] = useState("");
  const [analyte, setAnalyte] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [panel, setPanel] = useState("");
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();
  const up = useServerFn(uploadLabResult);
  const m = useMutation({
    mutationFn: () => up({ data: { subject, analyte, value: Number(value), unit: unit || undefined, panel: panel || undefined, notes: notes || undefined } }),
    onSuccess: () => { toast.success("Result saved"); setAnalyte(""); setValue(""); qc.invalidateQueries({ queryKey: ["participant", subject] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Lab results</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add lab result</CardTitle>
          <CardDescription>Attach a laboratory reading to a participant.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label>Participant</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>{participants.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.pseudonym}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Analyte</Label><Input value={analyte} onChange={(e) => setAnalyte(e.target.value)} placeholder="e.g. estradiol" /></div>
            <div><Label>Panel</Label><Input value={panel} onChange={(e) => setPanel(e.target.value)} placeholder="e.g. hormones" /></div>
            <div><Label>Value</Label><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></div>
            <div><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. pg/mL" /></div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button disabled={!subject || !analyte || !value || m.isPending} onClick={() => m.mutate()}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
