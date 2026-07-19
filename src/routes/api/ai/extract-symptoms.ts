import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `Extract explicit health symptoms mentioned in a first-person voice memo.
Return strictly JSON: {"symptoms":[{"symptom":"<one of: migraine|fatigue|brain_fog|mood|cramps|sleep|anxiety|hot_flash|headache|nausea|other>","severity":<0-10 integer>,"note":"<short quote>"}]}.
If nothing is clearly stated, return {"symptoms":[]}. Do not invent symptoms.`;

export const Route = createFileRoute("/api/ai/extract-symptoms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const { transcript } = (await request.json()) as { transcript: string };
        if (!transcript || transcript.length < 3) return Response.json({ symptoms: [] });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-5.5",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: transcript.slice(0, 8000) },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) return new Response(await res.text(), { status: res.status });
        const payload = (await res.json()) as any;
        const raw = payload.choices?.[0]?.message?.content ?? "{}";
        let parsed: any = { symptoms: [] };
        try { parsed = JSON.parse(raw); } catch {}
        const symptoms = Array.isArray(parsed.symptoms) ? parsed.symptoms : [];
        return Response.json({ symptoms });
      },
    },
  },
});
