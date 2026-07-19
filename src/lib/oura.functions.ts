import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "oura";

const OURA_SCOPES = ["personal", "daily", "heartrate", "workout", "session", "spo2"];

// Start OAuth — returns an authorization URL for the client popup.
export const startOuraConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((targetOrigin: string) => z.string().url().parse(targetOrigin))
  .handler(async ({ data: targetOrigin, context }) => {
    const clientKey = process.env.OURA_APP_USER_CONNECTOR_CLIENT_API_KEY;
    if (!clientKey) {
      throw new Error(
        "Oura connector is not configured yet. A workspace admin must link the Oura App User Connector client to this project.",
      );
    }
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl: `${targetOrigin}/log/wearable`,
      responseMode: "web_message",
      webMessageTargetOrigin: targetOrigin,
      credentialsConfiguration: { scopes: OURA_SCOPES },
    });
    return { authorizationUrl };
  });

// Persist the per-user connection key after successful OAuth.
export const saveOuraConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ connectionAPIKey: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    await saveConnectionKeyForUser(context.userId, CONNECTOR_ID, data.connectionAPIKey);
    return { ok: true };
  });

// Check whether the current user has an Oura connection stored.
export const getOuraStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    return { connected: !!key };
  });

// Disconnect: revoke on gateway, delete local encrypted row.
export const disconnectOura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import(
      "@/server/appUserConnections.server"
    );
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      try {
        const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
        });
      } catch (e) {
        console.error("Oura disconnect gateway call failed", e);
      }
    }
    await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    return { ok: true };
  });

type WearableMetric =
  | "sleep_min" | "deep_sleep_min" | "rem_sleep_min"
  | "hrv" | "resting_hr" | "steps" | "stress" | "spo2" | "skin_temp";

type WearableRow = {
  user_id: string;
  source: "oura";
  metric: WearableMetric;
  value: number;
  unit: string | null;
  recorded_at: string;
};

// Pull the last N days of Oura data into wearable_samples.
export const syncOura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ days: z.number().int().min(1).max(90).default(14) }).parse(i))
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) throw new Error("Oura is not connected");

    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");

    const end = new Date();
    const start = new Date(end.getTime() - data.days * 24 * 60 * 60 * 1000);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    async function get(path: string): Promise<any> {
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key!,
        connectorId: CONNECTOR_ID,
        path,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Oura ${path} failed [${res.status}]: ${text.slice(0, 300)}`);
      try { return JSON.parse(text); } catch { return {}; }
    }

    const rows: WearableRow[] = [];
    const push = (metric: WearableMetric, value: number | null | undefined, day: string, unit: string | null) => {
      if (value == null || Number.isNaN(Number(value))) return;
      rows.push({
        user_id: context.userId,
        source: "oura",
        metric,
        value: Number(value),
        unit,
        recorded_at: new Date(`${day}T12:00:00Z`).toISOString(),
      });
    };

    // Sleep
    const sleep = await get(`/v2/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`);
    for (const item of sleep.data ?? []) {
      const day = item.day ?? item.bedtime_start?.slice(0, 10);
      if (!day) continue;
      if (item.total_sleep_duration) push("sleep_min", Math.round(item.total_sleep_duration / 60), day, "min");
      if (item.deep_sleep_duration) push("deep_sleep_min", Math.round(item.deep_sleep_duration / 60), day, "min");
      if (item.rem_sleep_duration) push("rem_sleep_min", Math.round(item.rem_sleep_duration / 60), day, "min");
      if (item.average_hrv) push("hrv", item.average_hrv, day, "ms");
      if (item.average_heart_rate) push("resting_hr", item.average_heart_rate, day, "bpm");
    }

    // Daily activity — steps
    const activity = await get(`/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`);
    for (const item of activity.data ?? []) {
      if (item.day && item.steps != null) push("steps", item.steps, item.day, "steps");
    }

    // Daily readiness — proxy for stress inverse; store readiness as "stress" inverse (0-100)
    const readiness = await get(`/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}`);
    for (const item of readiness.data ?? []) {
      if (item.day && item.score != null) push("stress", 100 - item.score, item.day, "score");
    }

    // Daily SpO2
    try {
      const spo2 = await get(`/v2/usercollection/daily_spo2?start_date=${startDate}&end_date=${endDate}`);
      for (const item of spo2.data ?? []) {
        const v = item.spo2_percentage?.average ?? item.average;
        if (item.day && v != null) push("spo2", v, item.day, "%");
      }
    } catch (e) {
      console.warn("Oura spo2 unavailable", e);
    }

    if (rows.length === 0) return { inserted: 0, days: data.days };

    // Dedup: delete existing oura samples in window then re-insert
    await context.supabase
      .from("wearable_samples")
      .delete()
      .eq("user_id", context.userId)
      .eq("source", "oura")
      .gte("recorded_at", `${startDate}T00:00:00Z`)
      .lte("recorded_at", `${endDate}T23:59:59Z`);

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error, count } = await context.supabase
        .from("wearable_samples")
        .insert(chunk, { count: "exact" });
      if (error) throw error;
      inserted += count ?? chunk.length;
    }
    return { inserted, days: data.days };
  });
