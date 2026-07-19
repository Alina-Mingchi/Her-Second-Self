import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const METRICS = [
  "sleep_min","deep_sleep_min","rem_sleep_min","hrv","resting_hr","steps","stress","spo2","skin_temp",
] as const;
const SOURCES = ["apple_health","fitbit","oura","garmin","whoop","csv","manual"] as const;

export const bulkWearable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        source: z.enum(SOURCES),
        samples: z
          .array(
            z.object({
              recorded_at: z.string().datetime(),
              metric: z.enum(METRICS),
              value: z.number(),
              unit: z.string().max(24).optional(),
            }),
          )
          .min(1)
          .max(10_000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const rows = data.samples.map((s) => ({
      user_id: context.userId,
      source: data.source,
      metric: s.metric,
      value: s.value,
      unit: s.unit ?? null,
      recorded_at: s.recorded_at,
    }));
    // insert in chunks of 500
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error, count } = await context.supabase.from("wearable_samples").insert(chunk, { count: "exact" });
      if (error) throw error;
      inserted += count ?? chunk.length;
    }
    return { inserted };
  });
