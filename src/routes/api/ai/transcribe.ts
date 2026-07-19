import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const inbound = await request.formData();
        const audio = inbound.get("audio") as Blob | null;
        if (!audio) {
          return new Response("Missing audio", { status: 400 });
        }
        const type = (audio as any).type || "audio/webm";
        const extMap: Record<string, string> = {
          "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3",
          "audio/wav": "wav", "audio/ogg": "ogg", "audio/x-m4a": "m4a",
        };
        const ext = extMap[type.split(";")[0]] ?? "webm";

        const fd = new FormData();
        fd.append("model", "openai/gpt-4o-transcribe");
        fd.append("file", audio, `recording.${ext}`);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: fd,
        });
        if (!res.ok) {
          const body = await res.text();
          return new Response(body || "Transcription failed", { status: res.status });
        }
        const json = (await res.json()) as { text?: string };
        return Response.json({ text: json.text ?? "" });
      },
    },
  },
});
