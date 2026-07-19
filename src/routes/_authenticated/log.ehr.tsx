import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listParticipants } from "@/lib/researcher.functions";
import { createEhrUpload, registerEhrDocument } from "@/lib/ehr.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/log/ehr")({
  head: () => ({ meta: [{ title: "EHR upload · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetchList = useServerFn(listParticipants);
  const { data: participants } = useSuspenseQuery({ queryKey: ["participants"], queryFn: () => fetchList() });
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("clinical_note");
  const [recordedAt, setRecordedAt] = useState("");
  const [notes, setNotes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const upl = useServerFn(createEhrUpload);
  const reg = useServerFn(registerEhrDocument);

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
          file_name: file.name,
          mime_type: file.type || undefined,
          size_bytes: file.size,
          document_type: docType || undefined,
          notes: notes || undefined,
          recorded_at: recordedAt ? new Date(recordedAt).toISOString() : undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("EHR document uploaded");
      qc.invalidateQueries({ queryKey: ["participant", subject] });
      setFile(null);
      setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">EHR upload</h1>
      <p className="text-sm text-muted-foreground">Attach clinical records to a participant. Files are encrypted at rest and every access is audit-logged.</p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload document</CardTitle>
          <CardDescription>PDF, DOCX, images, or HL7/FHIR exports.</CardDescription>
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
            <div>
              <Label>Document type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinical_note">Clinical note</SelectItem>
                  <SelectItem value="lab_report">Lab report</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                  <SelectItem value="discharge_summary">Discharge summary</SelectItem>
                  <SelectItem value="medication_list">Medication list</SelectItem>
                  <SelectItem value="fhir_bundle">FHIR / HL7 bundle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recorded date</Label>
              <Input type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visit, provider, context…" />
          </div>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()}>{file ? "Change file" : "Choose file"}</Button>
            {file && <span className="text-sm text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
          </div>
          <Button disabled={!file || !subject || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Uploading…" : "Upload"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
