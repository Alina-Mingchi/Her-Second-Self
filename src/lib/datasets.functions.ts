import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

async function requireDatasetWriter(supabase: any, userId: string, studyId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return;
  const { data: rows } = await supabase
    .from("study_participants")
    .select("role_in_study")
    .eq("study_id", studyId)
    .eq("user_id", userId);
  if (!rows?.some((r: any) => ["researcher", "admin"].includes(r.role_in_study))) {
    throw new Error("Forbidden: not assigned to this dataset");
  }
}

async function logAccess(supabase: any, actor: string, action: string, resource: string, meta?: any) {
  await supabase.from("audit_log").insert({
    actor_user_id: actor,
    subject_user_id: null,
    action,
    resource,
    metadata: meta ?? null,
  });
}

// ---------- Tickets ----------

export const openDatasetRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        kind: z.enum(["new_dataset", "access_request"]),
        title: z.string().min(2).max(200),
        source: z.string().max(200).optional(),
        dua_reference: z.string().max(500).optional(),
        study_id: z.string().uuid().optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dataset_requests").insert({
      requester_id: context.userId,
      kind: data.kind,
      title: data.title,
      source: data.source ?? null,
      dua_reference: data.dua_reference ?? null,
      study_id: data.study_id ?? null,
      notes: data.notes ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listMyDatasetRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dataset_requests")
      .select("*")
      .eq("requester_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const listAllDatasetRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: requests, error } = await context.supabase
      .from("dataset_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = requests ?? [];
    const requesterIds = Array.from(new Set(rows.map((r: any) => r.requester_id).filter(Boolean)));
    const studyIds = Array.from(new Set(rows.map((r: any) => r.study_id).filter(Boolean)));
    const [profilesRes, studiesRes] = await Promise.all([
      requesterIds.length
        ? context.supabase.from("profiles").select("id,display_name,pseudonym").in("id", requesterIds as string[])
        : Promise.resolve({ data: [] as any[] }),
      studyIds.length
        ? context.supabase.from("studies").select("id,name").in("id", studyIds as string[])
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const studyMap = new Map<string, any>((studiesRes.data ?? []).map((s: any) => [s.id, s]));
    return rows.map((r: any) => ({
      ...r,
      profiles: r.requester_id ? profileMap.get(r.requester_id) ?? null : null,
      studies: r.study_id ? studyMap.get(r.study_id) ?? null : null,
    }));
  });

export const decideDatasetRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        decision_notes: z.string().max(2000).optional(),
        // for approving new_dataset:
        study_name: z.string().max(200).optional(),
        study_description: z.string().max(2000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: req, error: reqErr } = await context.supabase
      .from("dataset_requests")
      .select("*")
      .eq("id", data.request_id)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Already decided");

    let studyId: string | null = req.study_id ?? null;

    if (data.decision === "approved") {
      if (req.kind === "new_dataset") {
        const { data: study, error: sErr } = await context.supabase
          .from("studies")
          .insert({
            name: data.study_name || req.title,
            description: data.study_description || req.notes || null,
            kind: "external_cohort",
            source: req.source,
            created_by: context.userId,
          })
          .select("id")
          .single();
        if (sErr) throw sErr;
        studyId = study.id;
        // enroll requester as researcher, admin as admin
        await context.supabase.from("study_participants").insert([
          { study_id: studyId, user_id: req.requester_id, role_in_study: "researcher" },
          { study_id: studyId, user_id: context.userId, role_in_study: "admin" },
        ]);
      } else if (req.kind === "access_request") {
        if (!studyId) throw new Error("access_request must reference a study_id");
        await context.supabase.from("study_participants").upsert(
          { study_id: studyId, user_id: req.requester_id, role_in_study: "researcher" },
          { onConflict: "study_id,user_id" },
        );
      }
    }

    const { error: uErr } = await context.supabase
      .from("dataset_requests")
      .update({
        status: data.decision,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        decision_notes: data.decision_notes ?? null,
        study_id: studyId,
      })
      .eq("id", data.request_id);
    if (uErr) throw uErr;

    await logAccess(context.supabase, context.userId, `dataset_request.${data.decision}`, `dataset_requests/${data.request_id}`, {
      study_id: studyId,
      kind: req.kind,
    });
    return { ok: true, study_id: studyId };
  });

// ---------- Datasets ----------

export const listMyDatasets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Studies where the user is a member (any role) AND kind=external_cohort; admins see all external cohorts.
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin) {
      const { data, error } = await context.supabase
        .from("studies")
        .select("id,name,description,source,kind,created_at")
        .eq("kind", "external_cohort")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
    const { data: memberships, error: mErr } = await context.supabase
      .from("study_participants")
      .select("study_id, role_in_study, studies:study_id(id,name,description,source,kind,created_at)")
      .eq("user_id", context.userId);
    if (mErr) throw mErr;
    const seen = new Set<string>();
    const out: any[] = [];
    for (const row of memberships ?? []) {
      const s: any = (row as any).studies;
      if (s && s.kind === "external_cohort" && !seen.has(s.id)) {
        seen.add(s.id);
        out.push({ ...s, role_in_study: row.role_in_study });
      }
    }
    return out;
  });

export const getDataset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ study_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: canAccess } = await context.supabase.rpc("has_dataset_access", {
      _actor: context.userId,
      _study_id: data.study_id,
    });
    if (!canAccess) throw new Error("Forbidden");
    const [study, subjects, files, counts] = await Promise.all([
      context.supabase.from("studies").select("*").eq("id", data.study_id).maybeSingle(),
      context.supabase.from("external_subjects").select("id,external_id,demographics,created_at").eq("study_id", data.study_id).order("external_id"),
      context.supabase.from("dataset_files").select("*").eq("study_id", data.study_id).order("created_at", { ascending: false }),
      context.supabase
        .from("study_participants")
        .select("user_id, role_in_study, profiles:user_id(display_name,pseudonym)")
        .eq("study_id", data.study_id),
    ]);
    return {
      study: study.data,
      subjects: subjects.data ?? [],
      files: files.data ?? [],
      members: counts.data ?? [],
    };
  });

export const createDatasetUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ study_id: z.string().uuid(), filename: z.string().min(1).max(200) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireDatasetWriter(context.supabase, context.userId, data.study_id);
    const safe = data.filename.replace(/[^\w.\-]/g, "_");
    const path = `${data.study_id}/${crypto.randomUUID()}_${safe}`;
    const { data: signed, error } = await context.supabase.storage
      .from("external-datasets")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, signedUrl: signed.signedUrl, token: signed.token };
  });

export const ingestDatasetFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        study_id: z.string().uuid(),
        storage_path: z.string().min(1),
        filename: z.string().min(1).max(200),
        bytes: z.number().int().nonnegative().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireDatasetWriter(context.supabase, context.userId, data.study_id);

    const { classify, normalizeFilename, parseCsv, pick, toIso, toNum } = await import(
      "@/lib/datasets.server"
    );
    const kind = classify(data.filename);
    let rowsIngested = 0;
    let subjectsUpserted = 0;

    if (kind === "mapped_source") {
      // Download file (RLS allows because we're the writer).
      const dl = await context.supabase.storage.from("external-datasets").download(data.storage_path);
      if (dl.error) throw dl.error;
      const text = await dl.data.text();
      const rows = parseCsv(text);
      const key = normalizeFilename(data.filename);

      // helper: get-or-create external_subject
      const cache = new Map<string, string>();
      async function subjectId(extId: string): Promise<string | null> {
        if (!extId) return null;
        if (cache.has(extId)) return cache.get(extId)!;
        const { data: existing } = await context.supabase
          .from("external_subjects")
          .select("id")
          .eq("study_id", data.study_id)
          .eq("external_id", extId)
          .maybeSingle();
        if (existing) { cache.set(extId, existing.id); return existing.id; }
        const { data: inserted, error } = await context.supabase
          .from("external_subjects")
          .insert({ study_id: data.study_id, external_id: extId, demographics: {} })
          .select("id")
          .single();
        if (error) throw error;
        subjectsUpserted++;
        cache.set(extId, inserted.id);
        return inserted.id;
      }

      const wearableBatch: any[] = [];
      const hormoneBatch: any[] = [];
      const symptomBatch: any[] = [];

      const wearableMetricFor = (fileKey: string, row: any): { metric: string; value: number | null; unit?: string } | null => {
        switch (fileKey) {
          case "sleep":
            return { metric: "sleep_min", value: toNum(pick(row, "sleep_min", "minutes", "duration", "value")), unit: "min" };
          case "sleep_score":
            return { metric: "sleep_score", value: toNum(pick(row, "overall_score", "score", "value")) };
          case "heart_rate":
            return { metric: "hr", value: toNum(pick(row, "bpm", "heart_rate", "value")), unit: "bpm" };
          case "resting_heart_rate":
            return { metric: "resting_hr", value: toNum(pick(row, "bpm", "resting_hr", "value")), unit: "bpm" };
          case "heart_rate_variability_details":
          case "hrv_details":
          case "hrv":
            return { metric: "hrv", value: toNum(pick(row, "rmssd", "hrv", "value")), unit: "ms" };
          case "stress_score":
            return { metric: "stress", value: toNum(pick(row, "stress_score", "score", "value")) };
          case "respiratory_rate_summary":
          case "respiratory_rate":
            return { metric: "respiratory_rate", value: toNum(pick(row, "breaths_per_min", "rr", "value")), unit: "bpm" };
          case "wrist_temperature":
            return { metric: "skin_temp", value: toNum(pick(row, "temperature", "value")), unit: "C" };
          case "computed_temperature":
            return { metric: "computed_temp", value: toNum(pick(row, "temperature", "value")), unit: "C" };
          case "steps":
            return { metric: "steps", value: toNum(pick(row, "steps", "value")) };
          default:
            return null;
        }
      };

      for (const row of rows) {
        const extId = pick(row, "id", "subject_id", "user_id", "participant_id", "subject");
        if (!extId) continue;
        const sid = await subjectId(extId);
        if (!sid) continue;

        if (key === "subject_info" || key === "subject-info" || key === "demographic" || key === "demographics" || key === "height_and_weight") {
          const { data: cur } = await context.supabase
            .from("external_subjects").select("demographics").eq("id", sid).maybeSingle();
          const merged: Record<string, unknown> = { ...((cur?.demographics as Record<string, unknown>) ?? {}), [key]: row };
          await context.supabase.from("external_subjects").update({ demographics: merged as any }).eq("id", sid);
          rowsIngested++;
          continue;
        }

        if (key === "hormones_and_selfreport" || key === "hormones") {
          const capturedAt = toIso(pick(row, "date", "timestamp", "captured_at", "collected_at")) ?? new Date().toISOString();
          const hormonesMap: Array<[string[], string]> = [
            [["estradiol", "e2"], "estradiol"],
            [["progesterone", "p4"], "progesterone"],
            [["lh"], "lh"],
            [["fsh"], "fsh"],
            [["testosterone"], "testosterone"],
            [["cortisol"], "cortisol"],
            [["basal_temp", "bbt"], "basal_temp"],
          ];
          for (const [aliases, hormone] of hormonesMap) {
            const v = toNum(pick(row, ...aliases));
            if (v != null) hormoneBatch.push({
              external_subject_id: sid, dataset_id: data.study_id, user_id: null,
              hormone, value: v, unit: "", method: "self_test", captured_at: capturedAt,
            });
          }
          const symptomsMap: Array<[string[], string]> = [
            [["migraine"], "migraine"],
            [["headache"], "headache"],
            [["fatigue"], "fatigue"],
            [["brain_fog"], "brain_fog"],
            [["mood"], "mood"],
            [["cramps"], "cramps"],
            [["anxiety"], "anxiety"],
            [["hot_flash", "hot_flashes"], "hot_flash"],
            [["nausea"], "nausea"],
            [["sleep_quality", "sleep"], "sleep"],
          ];
          for (const [aliases, sym] of symptomsMap) {
            const v = toNum(pick(row, ...aliases));
            if (v != null) {
              const sev = Math.max(0, Math.min(10, Math.round(v)));
              symptomBatch.push({
                external_subject_id: sid, dataset_id: data.study_id, user_id: null,
                symptom: sym, severity: sev, source: "external_dataset", recorded_at: capturedAt,
              });
            }
          }
          rowsIngested++;
          continue;
        }

        const mapping = wearableMetricFor(key, row);
        if (mapping && mapping.value != null) {
          const recorded = toIso(pick(row, "timestamp", "date", "recorded_at", "time", "start_time")) ?? new Date().toISOString();
          wearableBatch.push({
            external_subject_id: sid, dataset_id: data.study_id, user_id: null,
            source: "external_dataset", metric: mapping.metric, value: mapping.value, unit: mapping.unit ?? null,
            recorded_at: recorded,
          });
          rowsIngested++;
        }
      }

      const chunkInsert = async (table: string, rows: any[]) => {
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error } = await (context.supabase.from(table as any) as any).insert(chunk);
          if (error) throw error;
        }
      };
      await chunkInsert("wearable_samples", wearableBatch);
      await chunkInsert("hormone_entries", hormoneBatch);
      await chunkInsert("symptom_entries", symptomBatch);
    }

    // Always record the file, mapped or raw
    const { error: fErr } = await context.supabase.from("dataset_files").insert({
      study_id: data.study_id,
      filename: data.filename,
      kind,
      storage_path: data.storage_path,
      bytes: data.bytes ?? null,
      rows_ingested: rowsIngested,
      uploaded_by: context.userId,
    });
    if (fErr) throw fErr;

    await logAccess(context.supabase, context.userId, "dataset.ingest", `studies/${data.study_id}`, {
      filename: data.filename, kind, rows: rowsIngested, subjects: subjectsUpserted,
    });

    return { ok: true, kind, rows_ingested: rowsIngested, subjects_upserted: subjectsUpserted };
  });

export const getDatasetFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ study_id: z.string().uuid(), storage_path: z.string() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: canAccess } = await context.supabase.rpc("has_dataset_access", {
      _actor: context.userId,
      _study_id: data.study_id,
    });
    if (!canAccess) throw new Error("Forbidden");
    const { data: signed, error } = await context.supabase.storage
      .from("external-datasets")
      .createSignedUrl(data.storage_path, 300);
    if (error) throw error;
    return { url: signed.signedUrl };
  });
