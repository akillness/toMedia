import type { Channel } from "../types";
import type { ChannelConnector } from "./types";
import { googleConnector } from "./google";
import { metaConnector } from "./meta";
import { taboolaConnector } from "./taboola";
import { tiktokConnector } from "./tiktok";

export type { ChannelConnector, DateRange, Fetcher, FreeTierInfo } from "./types";

/** Registry of real free-tier connectors, keyed by canonical channel. */
export const CONNECTORS: Record<
  Exclude<Channel, "other">,
  ChannelConnector
> = {
  google: googleConnector,
  meta: metaConnector,
  taboola: taboolaConnector,
  tiktok: tiktokConnector,
};

/** All connectors as a list (stable order). */
export function allConnectors(): ChannelConnector[] {
  return [googleConnector, metaConnector, taboolaConnector, tiktokConnector];
}

/** Look up a connector by channel, or undefined for "other"/unknown. */
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
