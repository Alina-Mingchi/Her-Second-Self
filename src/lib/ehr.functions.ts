import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireStaff(supabase: any, userId: string) {
  for (const role of ["clinician", "researcher", "admin"] as const) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (data) return true;
  }
  throw new Error("Forbidden");
}

export const createEhrUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ subject: z.string().uuid(), ext: z.string().min(1).max(16) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: canAccess } = await context.supabase.rpc("has_participant_access", {
      _actor: context.userId,
      _subject: data.subject,
    });
    if (!canAccess) throw new Error("Forbidden");
    const path = `${data.subject}/${crypto.randomUUID()}.${data.ext}`;
    const { data: signed, error } = await context.supabase.storage
      .from("ehr-documents")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const registerEhrDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        subject: z.string().uuid(),
        storage_path: z.string(),
        file_name: z.string().min(1).max(255),
        mime_type: z.string().max(120).optional(),
        size_bytes: z.number().int().nonnegative().optional(),
        document_type: z.string().max(80).optional(),
        notes: z.string().max(1000).optional(),
        recorded_at: z.string().datetime().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: canAccess } = await context.supabase.rpc("has_participant_access", {
      _actor: context.userId,
      _subject: data.subject,
    });
    if (!canAccess) throw new Error("Forbidden");
    const { error } = await context.supabase.from("ehr_documents").insert({
      subject_id: data.subject,
      uploaded_by: context.userId,
      storage_path: data.storage_path,
      file_name: data.file_name,
      mime_type: data.mime_type ?? null,
      size_bytes: data.size_bytes ?? null,
      document_type: data.document_type ?? null,
      notes: data.notes ?? null,
      recorded_at: data.recorded_at ?? null,
    });
    if (error) throw error;
    await context.supabase.from("audit_log").insert({
      actor_user_id: context.userId,
      subject_user_id: data.subject,
      action: "write",
      resource: "ehr_documents",
    });
    return { ok: true };
  });
