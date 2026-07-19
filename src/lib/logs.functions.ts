import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYMPTOMS = [
  "migraine","fatigue","brain_fog","mood","cramps","sleep","anxiety","hot_flash","headache","nausea","other",
] as const;
const HORMONES = ["lh","fsh","estradiol","progesterone","testosterone","cortisol","basal_temp","other"] as const;
const PHASES = ["menstrual","follicular","ovulatory","luteal","unknown"] as const;

async function upsertDailyLog(
  supabase: any,
  userId: string,
  log_date: string,
  patch: { notes?: string | null; cycle_day?: number | null; cycle_phase?: (typeof PHASES)[number] | null },
) {
  const { data: existing } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("log_date", log_date)
    .maybeSingle();
  if (existing) {
    await supabase.from("daily_logs").update(patch).eq("id", existing.id);
    return existing.id as string;
  }
  const { data } = await supabase
    .from("daily_logs")
    .insert({ user_id: userId, log_date, ...patch })
    .select("id")
    .single();
  return data!.id as string;
}

export const upsertDaily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(4000).nullable().optional(),
        cycle_day: z.number().int().min(1).max(60).nullable().optional(),
        cycle_phase: z.enum(PHASES).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const id = await upsertDailyLog(context.supabase, context.userId, data.log_date, data);
    return { id };
  });

export const addSymptom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        symptom: z.enum(SYMPTOMS),
        severity: z.number().int().min(0).max(10),
        free_text: z.string().max(1000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const daily_log_id = await upsertDailyLog(context.supabase, context.userId, data.log_date, {});
    const { error } = await context.supabase.from("symptom_entries").insert({
      user_id: context.userId,
      symptom: data.symptom,
      severity: data.severity,
      free_text: data.free_text ?? null,
      daily_log_id,
      source: "manual",
    });
    if (error) throw error;
    return { ok: true };
  });

export const addHormone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        hormone: z.enum(HORMONES),
        value: z.number(),
        unit: z.string().min(1).max(24),
        method: z.enum(["self_test", "lab", "wearable"]).default("self_test"),
        captured_at: z.string().datetime().optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("hormone_entries").insert({
      user_id: context.userId,
      hormone: data.hormone,
      value: data.value,
      unit: data.unit,
      method: data.method,
      captured_at: data.captured_at ?? new Date().toISOString(),
      notes: data.notes ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listRecentLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ days: z.number().int().min(1).max(180).default(30) }).parse(i))
  .handler(async ({ data, context }) => {
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const sinceISO = since.toISOString();
    const [daily, symptoms, hormones, memos, foods, wearables] = await Promise.all([
      context.supabase.from("daily_logs").select("*").eq("user_id", context.userId).gte("log_date", sinceISO.slice(0, 10)).order("log_date", { ascending: false }),
      context.supabase.from("symptom_entries").select("*").eq("user_id", context.userId).gte("recorded_at", sinceISO).order("recorded_at", { ascending: false }).limit(200),
      context.supabase.from("hormone_entries").select("*").eq("user_id", context.userId).gte("captured_at", sinceISO).order("captured_at", { ascending: false }).limit(200),
      context.supabase.from("voice_memos").select("id,created_at,duration_s,status,transcript").eq("user_id", context.userId).gte("created_at", sinceISO).order("created_at", { ascending: false }).limit(50),
      context.supabase.from("food_photos").select("id,meal_time,status,total_kcal").eq("user_id", context.userId).gte("meal_time", sinceISO).order("meal_time", { ascending: false }).limit(50),
      context.supabase.from("wearable_samples").select("*").eq("user_id", context.userId).gte("recorded_at", sinceISO).order("recorded_at", { ascending: false }).limit(500),
    ]);
    return {
      daily: daily.data ?? [],
      symptoms: symptoms.data ?? [],
      hormones: hormones.data ?? [],
      memos: memos.data ?? [],
      foods: foods.data ?? [],
      wearables: wearables.data ?? [],
    };
  });

export const todaySummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const [daily, symptomsToday, memosToday, foodsToday] = await Promise.all([
      context.supabase.from("daily_logs").select("*").eq("user_id", context.userId).eq("log_date", today).maybeSingle(),
      context.supabase.from("symptom_entries").select("id,symptom,severity").eq("user_id", context.userId).gte("recorded_at", today + "T00:00:00Z"),
      context.supabase.from("voice_memos").select("id").eq("user_id", context.userId).gte("created_at", today + "T00:00:00Z"),
      context.supabase.from("food_photos").select("id,total_kcal").eq("user_id", context.userId).gte("meal_time", today + "T00:00:00Z"),
    ]);
    return {
      today,
      daily: daily.data,
      symptomsCount: symptomsToday.data?.length ?? 0,
      memosCount: memosToday.data?.length ?? 0,
      foodsCount: foodsToday.data?.length ?? 0,
      kcalToday: (foodsToday.data ?? []).reduce((s: number, r: any) => s + (r.total_kcal ?? 0), 0),
    };
  });
