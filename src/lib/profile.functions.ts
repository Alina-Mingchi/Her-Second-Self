import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { AppRole, DataType, Me } from "@/lib/me";
import { DATA_TYPES } from "@/lib/me";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Me> => {
    const { supabase, userId } = context;
    const { data: user } = await supabase.auth.getUser();
    const [profileRes, rolesRes, consentsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("consents").select("data_type,revoked_at").eq("user_id", userId).is("revoked_at", null),
    ]);
    const roles: AppRole[] = (rolesRes.data ?? []).map((r) => r.role as AppRole);
    if (roles.length === 0) roles.push("participant");
    const grantedTypes = new Set((consentsRes.data ?? []).map((c) => c.data_type as DataType));
    const consents = Object.fromEntries(DATA_TYPES.map((t) => [t, grantedTypes.has(t)])) as Record<DataType, boolean>;
    return {
      id: userId,
      email: user.user?.email ?? null,
      display_name: profileRes.data?.display_name ?? null,
      pseudonym: profileRes.data?.pseudonym ?? null,
      onboarded: profileRes.data?.onboarded ?? false,
      roles,
      consents,
    };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        display_name: z.string().max(80).optional(),
        birth_year: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
        consents: z.array(z.enum(DATA_TYPES as [DataType, ...DataType[]])),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("profiles")
      .update({
        display_name: data.display_name ?? null,
        birth_year: data.birth_year ?? null,
        onboarded: true,
      })
      .eq("id", userId);

    if (data.consents.length) {
      const rows = data.consents.map((dt) => ({
        user_id: userId,
        data_type: dt,
        template_version: 1,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      }));
      await supabase.from("consents").upsert(rows, { onConflict: "user_id,data_type" });
    }
    return { ok: true };
  });

export const setConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ data_type: z.enum(DATA_TYPES as [DataType, ...DataType[]]), granted: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.granted) {
      // upsert on the (user_id, data_type) unique key so re-enabling clears revoked_at
      await supabase
        .from("consents")
        .upsert(
          {
            user_id: userId,
            data_type: data.data_type,
            template_version: 1,
            granted_at: new Date().toISOString(),
            revoked_at: null,
          },
          { onConflict: "user_id,data_type" },
        );
    } else {
      await supabase
        .from("consents")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("data_type", data.data_type)
        .is("revoked_at", null);
    }
    return { ok: true };
  });
