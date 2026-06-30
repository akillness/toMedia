import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { resetVaultCache } from "@/lib/secrets";
import { resetStorageCache } from "@/lib/storage";

const saved = {
  LEVER_SECRET_KEY: process.env.LEVER_SECRET_KEY,
  LEVER_DB_PATH: process.env.LEVER_DB_PATH,
  LEVER_SHEETS_WEBHOOK_URL: process.env.LEVER_SHEETS_WEBHOOK_URL,
  LEVER_ADMIN_TOKEN: process.env.LEVER_ADMIN_TOKEN,
};

beforeEach(() => {
  for (const k of Object.keys(saved)) delete process.env[k];
  resetVaultCache();
  resetStorageCache();
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetVaultCache();
  resetStorageCache();
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/ingest", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );

const winner = {
  id: "g1",
  name: "Winner",
  channel: "google",
  spend: 1000,
  revenue: 2500,
  conversions: 50,
  clicks: 2000,
  impressions: 40000,
};

describe("POST /api/ingest", () => {
  it("analyzes supplied rows, persists, and echoes the validated range", async () => {
    const res = await (
      await post({ range: { start: "2026-06-01", end: "2026-06-30" }, rows: [winner], name: "June" })
    ).json();
    expect(res.range).toEqual({ start: "2026-06-01", end: "2026-06-30" });
    expect(res.result.recommendations[0].action).toBe("SCALE");
    expect(res.ingest.rows).toBe(1);
    expect(res.datasetId).toMatch(/^ds-/);
    expect(res.sync).toEqual({ attempted: false, ok: false });
  });

  it("falls back to a default range and yields no rows when nothing is configured", async () => {
    const res = await (await post({})).json();
    expect(res.range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.ingest.rows).toBe(0);
    expect(res.ingest.sources.every((s: { configured: boolean }) => s.configured === false)).toBe(true);
    expect(res.datasetId).toBeNull();
  });

  it("rejects an invalid range by substituting the default rather than failing", async () => {
    const res = await (
      await post({ range: { start: "2026-13-99", end: "x" }, rows: [winner] })
    ).json();
    // bad range → default trailing window, but rows still analyzed
    expect(res.range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.result.recommendations).toHaveLength(1);
  });

  it("enforces LEVER_ADMIN_TOKEN when set", async () => {
    process.env.LEVER_ADMIN_TOKEN = "s3cret";
    const denied = await post({ rows: [winner] });
    expect(denied.status).toBe(401);
    const ok = await post({ rows: [winner] }, { "x-lever-admin": "s3cret" });
    expect(ok.status).toBe(200);
  });

  it("fails closed in production when no admin token is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.LEVER_ADMIN_TOKEN;
    try {
      const denied = await post({ rows: [winner] });
      expect(denied.status).toBe(401);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
