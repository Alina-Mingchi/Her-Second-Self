import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireResearcher(supabase: any, userId: string) {
  const roles = ["researcher", "clinician", "admin"] as const;
  for (const role of roles) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (data) return true;
  }
  throw new Error("Forbidden");
}

async function logAccess(supabase: any, actor: string, subject: string, action: string, resource?: string) {
  await supabase.from("audit_log").insert({
    actor_user_id: actor,
    subject_user_id: subject,
    action,
    resource: resource ?? null,
  });
}

export const listParticipants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireResearcher(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id,pseudonym,onboarded,birth_year,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const getParticipantData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ subject: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireResearcher(context.supabase, context.userId);
    const { data: canAccess } = await context.supabase.rpc("has_participant_access", {
      _actor: context.userId,
      _subject: data.subject,
    });
    if (!canAccess) throw new Error("Forbidden: no access to this participant");
    await logAccess(context.supabase, context.userId, data.subject, "read", "participant.summary");

    const [profile, daily, symptoms, hormones, memos, foods, wearables, labs, brain, ehr] = await Promise.all([
      context.supabase.from("profiles").select("id,pseudonym,birth_year,onboarded,created_at").eq("id", data.subject).maybeSingle(),
      context.supabase.from("daily_logs").select("*").eq("user_id", data.subject).order("log_date", { ascending: false }).limit(90),
      context.supabase.from("symptom_entries").select("*").eq("user_id", data.subject).order("recorded_at", { ascending: false }).limit(500),
      context.supabase.from("hormone_entries").select("*").eq("user_id", data.subject).order("captured_at", { ascending: false }).limit(500),
      context.supabase.from("voice_memos").select("id,created_at,duration_s,status,transcript,extracted_symptoms").eq("user_id", data.subject).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("food_photos").select("id,meal_time,total_kcal,total_protein_g,total_carbs_g,total_fat_g,status").eq("user_id", data.subject).order("meal_time", { ascending: false }).limit(200),
      context.supabase.from("wearable_samples").select("*").eq("user_id", data.subject).order("recorded_at", { ascending: false }).limit(2000),
      context.supabase.from("lab_results").select("*").eq("user_id", data.subject).order("collected_at", { ascending: false }).limit(500),
      context.supabase.from("brain_signals").select("*").eq("user_id", data.subject).order("recorded_at", { ascending: false }).limit(100),
      context.supabase.from("ehr_documents").select("*").eq("subject_id", data.subject).order("created_at", { ascending: false }).limit(200),
    ]);
    return {
      profile: profile.data,
      daily: daily.data ?? [],
      symptoms: symptoms.data ?? [],
      hormones: hormones.data ?? [],
      memos: memos.data ?? [],
      foods: foods.data ?? [],
      wearables: wearables.data ?? [],
      labs: labs.data ?? [],
      brain: brain.data ?? [],
      ehr: ehr.data ?? [],
    };
  });

export const uploadLabResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        subject: z.string().uuid(),
        analyte: z.string().min(1).max(80),
        value: z.number(),
        unit: z.string().max(24).optional(),
        panel: z.string().max(80).optional(),
        notes: z.string().max(500).optional(),
        collected_at: z.string().datetime().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireResearcher(context.supabase, context.userId);
    const { data: canAccess } = await context.supabase.rpc("has_participant_access", {
      _actor: context.userId,
      _subject: data.subject,
    });
    if (!canAccess) throw new Error("Forbidden: no access to this participant");
    const { error } = await context.supabase.from("lab_results").insert({
      user_id: data.subject,
      analyte: data.analyte,
      value: data.value,
      unit: data.unit ?? null,
      panel: data.panel ?? null,
      notes: data.notes ?? null,
      collected_at: data.collected_at ?? new Date().toISOString(),
    });
    if (error) throw error;
    await logAccess(context.supabase, context.userId, data.subject, "write", "lab_results");
    return { ok: true };
  });

export const createBrainSignalUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ subject: z.string().uuid(), ext: z.string().min(1).max(16) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireResearcher(context.supabase, context.userId);
    const { data: canAccess } = await context.supabase.rpc("has_participant_access", {
      _actor: context.userId,
      _subject: data.subject,
    });
    if (!canAccess) throw new Error("Forbidden");
    const path = `${data.subject}/${crypto.randomUUID()}.${data.ext}`;
    const { data: signed, error } = await context.supabase.storage
      .from("brain-signals")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const registerBrainSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        subject: z.string().uuid(),
        storage_path: z.string(),
        format: z.string().min(1).max(24),
        recorded_at: z.string().datetime().optional(),
        channels: z.number().int().min(1).max(1024).optional(),
        sample_rate: z.number().min(1).max(100_000).optional(),
        duration_s: z.number().min(0).max(86400).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireResearcher(context.supabase, context.userId);
    const { data: canAccess } = await context.supabase.rpc("has_participant_access", {
      _actor: context.userId,
      _subject: data.subject,
    });
    if (!canAccess) throw new Error("Forbidden");
    const { error } = await context.supabase.from("brain_signals").insert({
      user_id: data.subject,
      storage_path: data.storage_path,
      format: data.format,
      recorded_at: data.recorded_at ?? new Date().toISOString(),
      channels: data.channels ?? null,
      sample_rate: data.sample_rate ?? null,
      duration_s: data.duration_s ?? null,
      notes: data.notes ?? null,
    });
    if (error) throw error;
    await logAccess(context.supabase, context.userId, data.subject, "write", "brain_signals");
    return { ok: true };
  });
