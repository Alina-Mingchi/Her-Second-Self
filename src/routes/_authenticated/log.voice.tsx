import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { createVoiceUpload, registerVoiceMemo, setVoiceResult } from "@/lib/voice.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/log/voice")({
  head: () => ({ meta: [{ title: "Voice memo · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedRef = useRef<number>(0);

  const upl = useServerFn(createVoiceUpload);
  const reg = useServerFn(registerVoiceMemo);
  const done = useServerFn(setVoiceResult);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        setDuration(Math.round((Date.now() - startedRef.current) / 1000));
        setBlob(new Blob(chunksRef.current, { type: mime }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mrRef.current = mr;
      startedRef.current = Date.now();
      setRecording(true);
    } catch (e: any) {
      toast.error("Microphone access needed");
    }
  }
  function stop() {
    mrRef.current?.stop();
    setRecording(false);
  }

  const process = useMutation({
    mutationFn: async () => {
      if (!blob) throw new Error("No recording");
      setBusy(true);
      const type = blob.type.split(";")[0];
      const extMap: Record<string, "webm" | "mp4" | "m4a" | "wav" | "mp3" | "ogg"> = {
        "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg",
      };
      const ext = extMap[type] ?? "webm";
      const { path, signedUrl } = await upl({ data: { ext } });
      const put = await fetch(signedUrl, { method: "PUT", body: blob, headers: { "Content-Type": type } });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      const { id } = await reg({ data: { storage_path: path, duration_s: duration } });

      // Transcribe via server route
      const fd = new FormData();
      fd.append("audio", blob, `memo.${ext}`);
      const tr = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
      if (!tr.ok) throw new Error(`Transcription failed: ${await tr.text()}`);
      const { text } = (await tr.json()) as { text: string };
      setTranscript(text);

      // Extract symptoms
      const ex = await fetch("/api/ai/extract-symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const { symptoms: extracted } = (await ex.json()) as { symptoms: any[] };
      setSymptoms(extracted);

      await done({ data: { id, transcript: text, extracted_symptoms: extracted, status: "extracted" } });
    },
    onSuccess: () => toast.success("Memo saved & analyzed"),
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  useEffect(() => () => mrRef.current?.stream?.getTracks?.().forEach((t) => t.stop()), []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Voice memo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Speak freely about how you feel today. AI will transcribe and extract symptoms.
      </p>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Record</CardTitle>
          <CardDescription>Tap to start. Keep it under 5 minutes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <button
            onClick={recording ? stop : start}
            disabled={busy}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full transition ${
              recording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            {recording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
          <div className="text-sm text-muted-foreground">
            {recording ? "Recording…" : blob ? `Recorded ${duration}s` : "Not recording"}
          </div>
          {blob && !recording && (
            <div className="flex gap-2">
              <Button onClick={() => process.mutate()} disabled={busy}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</> : "Save & analyze"}
              </Button>
              <Button variant="ghost" onClick={() => { setBlob(null); setTranscript(""); setSymptoms([]); }}>Discard</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {transcript && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Transcript</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{transcript}</p>
          </CardContent>
        </Card>
      )}
      {symptoms.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Extracted symptoms</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {symptoms.map((s, i) => (
                <li key={i}>{s.symptom} · sev {s.severity}{s.note ? ` — ${s.note}` : ""}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
