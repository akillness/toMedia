import type { Channel } from "../types";
import type { ChannelConnector } from "./types";
import { googleConnector } from "./google";

// MVP SCOPE: Google Ads is the only channel wired into the running product.
// Meta/Taboola/Tiktok connectors are fully implemented and unit-tested
// (src/lib/channels/meta.ts, taboola.ts, tiktok.ts) but intentionally NOT
// registered below — the project's current goal is to prove the deployed
// service runs on *real* data for one channel end-to-end, not to onboard
// every channel at once. Re-enabling a channel post-MVP is a 3-line change:
// uncomment its import + the two array/record entries below.
//
// import { metaConnector } from "./meta";
// import { taboolaConnector } from "./taboola";
// import { tiktokConnector } from "./tiktok";

export type { ChannelConnector, DateRange, Fetcher, FreeTierInfo } from "./types";

/** Registry of real free-tier connectors, keyed by canonical channel. MVP: google only. */
export const CONNECTORS: Partial<Record<Exclude<Channel, "other">, ChannelConnector>> = {
  google: googleConnector,
  // meta: metaConnector,
  // taboola: taboolaConnector,
  // tiktok: tiktokConnector,
};

/** All connectors as a list (stable order). MVP: google only — see note above. */
export function allConnectors(): ChannelConnector[] {
  return [googleConnector /* , metaConnector, taboolaConnector, tiktokConnector */];
}

/** Look up a connector by channel, or undefined for "other"/unknown/not-yet-MVP channels. */
export function getConnector(channel: Channel): ChannelConnector | undefined {
  return (CONNECTORS as Record<string, ChannelConnector>)[channel];
}

/**
 * Free-tier onboarding catalog — what each channel needs and where to get it.
 * Drives docs and the /api/credentials introspection response.
 */
export function freeTierCatalog() {
  return allConnectors().map((c) => ({
    channel: c.channel,
    ...c.freeTier,
    requiredCredentials: c.requiredCredentials,
  }));
}
