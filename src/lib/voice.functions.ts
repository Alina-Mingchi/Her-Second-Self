import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Voice memo lifecycle: create signed upload → upload from client → notify to run AI

export const createVoiceUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ ext: z.enum(["webm", "mp4", "m4a", "wav", "mp3", "ogg"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const path = `${context.userId}/${crypto.randomUUID()}.${data.ext}`;
    const { data: signed, error } = await context.supabase.storage
      .from("voice-memos")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const registerVoiceMemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ storage_path: z.string(), duration_s: z.number().min(0).max(3600).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("voice_memos")
      .insert({
        user_id: context.userId,
        storage_path: data.storage_path,
        duration_s: data.duration_s ?? null,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string };
  });

export const setVoiceResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        transcript: z.string().max(20_000).nullable().optional(),
        extracted_symptoms: z.any().optional(),
        status: z.enum(["uploaded", "transcribed", "extracted", "error"]).default("extracted"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("voice_memos")
      .update({
        transcript: data.transcript ?? null,
        extracted_symptoms: data.extracted_symptoms ?? null,
        status: data.status,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;

    // Persist any extracted symptoms as symptom_entries (source: voice)
    const items = Array.isArray(data.extracted_symptoms) ? data.extracted_symptoms : [];
    const validKinds = new Set([
      "migraine","fatigue","brain_fog","mood","cramps","sleep","anxiety","hot_flash","headache","nausea","other",
    ]);
    const rows = items
      .filter((s: any) => s && validKinds.has(s.symptom))
      .map((s: any) => ({
        user_id: context.userId,
        symptom: s.symptom,
        severity: Math.max(0, Math.min(10, Number(s.severity ?? 5))),
        free_text: typeof s.note === "string" ? s.note.slice(0, 500) : null,
        source: "voice",
      }));
    if (rows.length) {
      await context.supabase.from("symptom_entries").insert(rows);
    }
    return { ok: true, inserted: rows.length };
  });
