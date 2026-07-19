// Server-only helpers for parsing external dataset CSVs (mcPHASES-style).
// Blocked from client bundles by the .server.ts extension.

export type ParsedRow = Record<string, string>;

// Naive CSV/TSV parser that handles quoted fields and commas or tabs.
export function parseCsv(text: string): ParsedRow[] {
  const stripped = text.replace(/^\uFEFF/, "");
  const lines = stripped.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const delim = lines[0].includes("\t") && !lines[0].includes(",") ? "\t" : ",";
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === delim) { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseLine(lines[i]);
    const obj: ParsedRow = {};
    headers.forEach((h, idx) => { obj[h] = parts[idx] ?? ""; });
    rows.push(obj);
  }
  return rows;
}

export function pick(row: ParsedRow, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k.toLowerCase()];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

export function toIso(v: string | undefined): string | null {
  if (!v) return null;
  // Try dates like YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, ISO, or epoch seconds
  if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000).toISOString();
  if (/^\d{13}$/.test(v)) return new Date(Number(v)).toISOString();
  const d = new Date(v.replace(" ", "T"));
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

export function toNum(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Map filename → target ingester key
export const CORE_FILES = new Set([
  "subject-info", "subject_info", "demographic", "demographics", "height_and_weight",
  "hormones_and_selfreport", "hormones",
  "sleep", "sleep_score",
  "heart_rate", "resting_heart_rate", "heart_rate_variability_details", "hrv_details", "hrv",
  "stress_score", "respiratory_rate_summary", "respiratory_rate",
  "wrist_temperature", "computed_temperature", "steps",
]);

export function normalizeFilename(name: string): string {
  return name.toLowerCase().replace(/\.(csv|txt|tsv)$/i, "").replace(/[\s-]+/g, "_");
}

export function classify(name: string): "mapped_source" | "raw_archive" {
  const n = normalizeFilename(name);
  return CORE_FILES.has(n) ? "mapped_source" : "raw_archive";
}
