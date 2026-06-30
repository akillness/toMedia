/**
 * Shared request-input validation for the engine config and reporting windows,
 * used by the /api/analyze and /api/ingest routes so both sanitize identically.
 */
import type { Channel, EngineConfig } from "./types";
import { CHANNELS } from "./types";
import type { DateRange } from "./channels/types";

/** The tunable numeric knobs an external caller may override (all of EngineConfig). */
export const CONFIG_KEYS: (keyof EngineConfig)[] = [
  "targetRoas",
  "scaleTrigger",
  "scaleStep",
  "marginalEfficiency",
  "fatigueRatio",
  "fatigueDeclineRatio",
  "refreshCap",
  "minSpend",
  "minConversions",
  "pacingThreshold",
];

/** Accept only finite, non-negative numeric overrides; ignore everything else. */
export function sanitizeConfig(input: unknown): Partial<EngineConfig> {
  if (input == null || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const cfg: Partial<EngineConfig> = {};
  for (const key of CONFIG_KEYS) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) cfg[key] = v;
  }
  const ltv = raw.channelLtv;
  if (ltv != null && typeof ltv === "object") {
    const rawLtv = ltv as Record<string, unknown>;
    const clean: Partial<Record<Channel, number>> = {};
    for (const ch of CHANNELS) {
      const v = rawLtv[ch];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) clean[ch] = v;
    }
    if (Object.keys(clean).length > 0) cfg.channelLtv = clean;
  }
  return cfg;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a {start,end} window of ISO dates with start <= end, else null. */
export function parseRange(input: unknown): DateRange | null {
  if (input == null || typeof input !== "object") return null;
  const { start, end } = input as { start?: unknown; end?: unknown };
  if (typeof start !== "string" || typeof end !== "string") return null;
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end)) return null;
  if (start > end) return null;
  return { start, end };
}
