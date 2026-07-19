import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listParticipants, createBrainSignalUpload, registerBrainSignal } from "@/lib/researcher.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/log/brain")({
  head: () => ({ meta: [{ title: "Brain signals · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetchList = useServerFn(listParticipants);
  const { data: participants } = useSuspenseQuery({ queryKey: ["participants"], queryFn: () => fetchList() });
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("edf");
  const [channels, setChannels] = useState("");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const upl = useServerFn(createBrainSignalUpload);
  const reg = useServerFn(registerBrainSignal);

  const m = useMutation({
    mutationFn: async () => {
      if (!file || !subject) throw new Error("Pick participant & file");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const { path, signedUrl } = await upl({ data: { subject, ext } });
      const put = await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (!put.ok) throw new Error(`Upload failed ${put.status}`);
      await reg({
        data: {
          subject,
          storage_path: path,
          format,
          channels: channels ? Number(channels) : undefined,
          sample_rate: rate ? Number(rate) : undefined,
          notes: notes || undefined,
        },
      });
    },
    onSuccess: () => { toast.success("Brain signal uploaded"); qc.invalidateQueries({ queryKey: ["participant", subject] }); setFile(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Brain signals</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload recording</CardTitle>
          <CardDescription>EDF, BDF, FIF, or CSV supported. Use the lab laptop for large files.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label>Participant</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>{participants.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.pseudonym}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Format</Label><Input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="edf, bdf, fif…" /></div>
            <div><Label>Channels</Label><Input inputMode="numeric" value={channels} onChange={(e) => setChannels(e.target.value)} /></div>
            <div><Label>Sample rate (Hz)</Label><Input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Task, session, montage…" />
          </div>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()}>{file ? "Change file" : "Choose file"}</Button>
            {file && <span className="text-sm text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>}
          </div>
          <Button disabled={!file || !subject || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Uploading…" : "Upload"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
