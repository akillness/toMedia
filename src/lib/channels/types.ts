import type { AdRow, Channel } from "../types";

/** Inclusive reporting window in YYYY-MM-DD. */
export interface DateRange {
  start: string;
  end: string;
}

/** Injectable fetch so connectors are unit-testable offline. Matches global fetch. */
export type Fetcher = (
  url: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Free developer-API path for a channel — documented so onboarding is concrete. */
export interface FreeTierInfo {
  /** Human label, e.g. "Google Ads API (Basic Access)". */
  api: string;
  /** Where to request the free credentials. */
  docsUrl: string;
  /** Auth mechanism the connector expects. */
  authType: "oauth2-bearer" | "access-token" | "api-key";
  /** Plain-language notes about the free tier / quotas. */
  notes: string;
}

/**
 * A channel connector turns a platform's native reporting response into
 * canonical {@link AdRow}s. `normalize` is pure (offline-testable); `fetchRows`
 * builds the request and delegates the network call to an injectable fetcher.
 */
export interface ChannelConnector {
  channel: Channel;
  freeTier: FreeTierInfo;
  /** Credential field names this connector needs to operate. */
  requiredCredentials: string[];
  /** True when the supplied credential object has every required field. */
  isConfigured(creds: Record<string, unknown> | null | undefined): boolean;
  /** Pure transform: platform report JSON → canonical rows. Never throws on shape gaps. */
  normalize(raw: unknown): AdRow[];
  /** Fetch + normalize a reporting window. Throws if not configured or the API errors. */
  fetchRows(
    creds: Record<string, unknown>,
    range: DateRange,
    fetcher?: Fetcher,
  ): Promise<AdRow[]>;
}

/** Keep only non-null object elements of an array (untrusted report rows). */
export function objectRows<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? (value.filter((r) => r != null && typeof r === "object") as T[])
    : [];
}

/** Coerce any value to a finite, non-negative number (report cells are untrusted). */
export function num(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[$,%\s]/g, ""))
        : NaN;
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Verify every required field is present and non-empty on a credential object. */
export function hasFields(
  creds: Record<string, unknown> | null | undefined,
  fields: string[],
): boolean {
  if (!creds || typeof creds !== "object") return false;
  return fields.every((f) => {
    const v = (creds as Record<string, unknown>)[f];
    return typeof v === "string" ? v.length > 0 : v != null;
  });
}
