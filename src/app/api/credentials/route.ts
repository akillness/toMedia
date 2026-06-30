import { NextResponse } from "next/server";
import { allConnectors, freeTierCatalog, getConnector } from "@/lib/channels";
import { getVault } from "@/lib/secrets";
import { isAdminAuthorized } from "@/lib/adminAuth";
import type { Channel } from "@/lib/types";

/**
 * Channel credential administration. Secrets are written into the encrypted
 * vault and NEVER read back over HTTP — GET reports only which channels are
 * configured plus the free-tier onboarding catalog.
 *
 * Writes (POST/DELETE) are gated by LEVER_ADMIN_TOKEN via isAdminAuthorized:
 * callers must send a matching `x-lever-admin` header (compared in constant
 * time). With no token set, writes are open in dev but FAIL CLOSED in
 * production, so a forgotten token never silently exposes credential writes.
 */

function isChannel(value: unknown): value is Exclude<Channel, "other"> {
  return (
    value === "google" ||
    value === "meta" ||
    value === "taboola" ||
    value === "tiktok"
  );
}

/** GET → onboarding catalog + per-channel configured flag (no secret values). */
export async function GET() {
  const vault = getVault();
  let stored: string[] = [];
  try {
    stored = await vault.list();
  } catch {
    stored = [];
  }
  const channels = await Promise.all(
    allConnectors().map(async (c) => {
      let configured = false;
      try {
        configured = c.isConfigured(await vault.get(c.channel));
      } catch {
        configured = false;
      }
      return {
        channel: c.channel,
        configured,
        requiredCredentials: c.requiredCredentials,
        freeTier: c.freeTier,
      };
    }),
  );
  return NextResponse.json({ channels, catalog: freeTierCatalog(), stored });
}

/** POST { channel, credentials } → seal credentials into the vault. */
export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    channel?: unknown;
    credentials?: unknown;
  } | null;
  if (!body || !isChannel(body.channel)) {
    return NextResponse.json({ error: "unknown channel" }, { status: 400 });
  }
  const creds = body.credentials;
  if (!creds || typeof creds !== "object" || Array.isArray(creds)) {
    return NextResponse.json({ error: "credentials object required" }, { status: 400 });
  }
  const connector = getConnector(body.channel);
  const value = creds as Record<string, unknown>;
  try {
    await getVault().set(body.channel, value);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to store credentials" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    channel: body.channel,
    configured: connector ? connector.isConfigured(value) : false,
  });
}

/** DELETE ?channel=... → remove stored credentials for a channel. */
export async function DELETE(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const channel = new URL(request.url).searchParams.get("channel");
  if (!isChannel(channel)) {
    return NextResponse.json({ error: "unknown channel" }, { status: 400 });
  }
  const removed = await getVault().remove(channel);
  return NextResponse.json({ ok: true, channel, removed });
}
