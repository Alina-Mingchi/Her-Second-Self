import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const createFoodUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ ext: z.enum(["jpg", "jpeg", "png", "webp", "heic"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const path = `${context.userId}/${crypto.randomUUID()}.${data.ext}`;
    const { data: signed, error } = await context.supabase.storage
      .from("food-photos")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const registerFoodPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ storage_path: z.string(), meal_time: z.string().datetime().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("food_photos")
      .insert({
        user_id: context.userId,
        storage_path: data.storage_path,
        meal_time: data.meal_time ?? new Date().toISOString(),
        status: "uploaded",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string };
  });

export const analyzeFoodPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { data: row, error: fetchErr } = await context.supabase
      .from("food_photos")
      .select("id,storage_path,user_id")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (fetchErr || !row) throw fetchErr ?? new Error("Not found");

    const { data: signed, error: sErr } = await context.supabase.storage
      .from("food-photos")
      .createSignedUrl(row.storage_path, 300);
    if (sErr) throw sErr;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          {
            role: "system",
            content:
              "You are a nutrition analyst. Identify all visible foods and estimate their portion and macros. Respond ONLY as JSON: {\"items\":[{\"name\":string,\"portion\":string,\"kcal\":number,\"protein_g\":number,\"carbs_g\":number,\"fat_g\":number}]}. If unclear, return an empty items array.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this meal photo. Return only the JSON described." },
              { type: "image_url", image_url: { url: signed.signedUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      await context.supabase.from("food_photos").update({ status: "error" }).eq("id", row.id);
      throw new Error(`AI request failed [${res.status}]: ${body}`);
    }
    const payload = (await res.json()) as any;
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { items: [] };
    }
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const totals = items.reduce(
      (acc: any, it: any) => ({
        kcal: acc.kcal + (Number(it.kcal) || 0),
        protein: acc.protein + (Number(it.protein_g) || 0),
        carbs: acc.carbs + (Number(it.carbs_g) || 0),
        fat: acc.fat + (Number(it.fat_g) || 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
    await context.supabase
      .from("food_photos")
      .update({
        ai_items: items,
        total_kcal: Math.round(totals.kcal),
        total_protein_g: Math.round(totals.protein * 10) / 10,
        total_carbs_g: Math.round(totals.carbs * 10) / 10,
        total_fat_g: Math.round(totals.fat * 10) / 10,
        status: "analyzed",
      })
      .eq("id", row.id);
    return { items, totals };
  });
