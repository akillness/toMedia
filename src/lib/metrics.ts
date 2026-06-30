import type { AdRow, Channel, ChannelSummary, Metrics } from "./types";

/** Safe divide: returns 0 when the denominator is 0 (avoids NaN/Infinity in the UI). */
export function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/** Round to a fixed number of decimals (default 2). */
export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Revenue the engine should optimize against, in precedence order:
 *  1. a row's own first-party `ltvPerConversion` (`conversions × ltv`);
 *  2. a channel-level LTV default (`conversions × channelLtv[channel]`);
 *  3. the immediately-attributed revenue.
 * So downstream value drives profit decisions whenever it is known — per entity
 * if available, else per channel — and falls back to attributed revenue otherwise.
 */
export function effectiveRevenue(
  row: AdRow,
  channelLtv?: Partial<Record<Channel, number>>,
): number {
  if (row.ltvPerConversion != null) {
    return round(row.conversions * row.ltvPerConversion);
  }
  const ltv = channelLtv?.[row.channel];
  if (ltv != null && Number.isFinite(ltv) && ltv > 0) {
    return round(row.conversions * ltv);
  }
  return row.revenue;
}

/** Derive performance metrics for a single ad row. Pure, no side effects. */
export function computeMetrics(
  row: AdRow,
  channelLtv?: Partial<Record<Channel, number>>,
): Metrics {
  const revenue = effectiveRevenue(row, channelLtv);
  return {
    cpa: round(safeDiv(row.spend, row.conversions)),
    epc: round(safeDiv(revenue, row.clicks)),
    roas: round(safeDiv(revenue, row.spend), 3),
    cvr: round(safeDiv(row.conversions, row.clicks), 4),
    ctr: round(safeDiv(row.clicks, row.impressions), 4),
    cpc: round(safeDiv(row.spend, row.clicks)),
    profit: round(revenue - row.spend),
  };
}

/**
 * Signal-strength confidence in a recommendation, 0..1.
 *
 * Combines spend depth (vs the actionable threshold) and conversion volume
 * (statistical mass): a $5k campaign with 50 conversions is far more trustworthy
 * than a $260 campaign with 6. Returns a smooth score so the UI can grade trust.
 */
export function signalConfidence(
  spend: number,
  conversions: number,
  minSpend: number,
  minConversions: number,
): number {
  const spendScore = Math.min(1, safeDiv(spend, minSpend * 4));
  const convScore = Math.min(1, safeDiv(conversions, minConversions * 4));
  return round(0.4 * spendScore + 0.6 * convScore, 2);
}

/**
 * Confidence derived from spend depth alone, 0..1.
 *
 * Used for the zero-conversion budget leak: a high-spend entity returning nothing
 * is among the *most* certain waste, so its trust must scale with how much money
 * is being burned — not be dragged to the floor by the missing conversion volume
 * that `signalConfidence` (conversion-weighted) would penalize it for.
 */
export function spendConfidence(spend: number, minSpend: number): number {
  return round(Math.min(1, safeDiv(spend, minSpend * 4)), 2);
}

/** Result of a multi-period creative-fatigue assessment. */
export interface FatigueTrend {
  /**
   * A sustained decline: ≥2 consecutive non-increasing periods ending now AND the
   * current CTR is at least `declineRatio` below the recent peak. Distinguishes
   * genuine fatigue from a one-period dip the single-period rule would over-fire on.
   */
  declining: boolean;
  /** Total periods observed (prior history + current). */
  periods: number;
  /** Consecutive non-increasing steps ending at the current period. */
  consecutiveDrops: number;
  /** The entity's best CTR across the prior window — the recovery target. */
  peak: number;
  /** Percent decline from that peak to the current period. */
  dropPct: number;
}

/**
 * Assess multi-period creative fatigue from a CTR series. Pure, no side effects.
 *
 * `history` is the entity's CTR in consecutive prior periods (oldest→newest,
 * excluding the current period). Needs ≥2 valid prior points (so a 3+ period
 * series) to speak; otherwise it stays silent and the single-period signal stands.
 * Fatigue is measured against the recent *peak*, not the first point, so the
 * recovery target is robust to where in the window the best period landed.
 */
export function sustainedFatigue(
  currentCtr: number,
  history: number[] | undefined,
  declineRatio: number,
): FatigueTrend {
  const none: FatigueTrend = {
    declining: false,
    periods: 0,
    consecutiveDrops: 0,
    peak: 0,
    dropPct: 0,
  };
  const clean = (history ?? []).filter((c) => Number.isFinite(c) && c > 0);
  if (clean.length < 2 || !(currentCtr > 0)) return none;

  const series = [...clean, currentCtr];
  const peak = Math.max(...clean);
  let consecutiveDrops = 0;
  for (let i = series.length - 1; i > 0; i--) {
    if (series[i] <= series[i - 1]) consecutiveDrops++;
    else break;
  }
  return {
    declining: consecutiveDrops >= 2 && currentCtr <= peak * (1 - declineRatio),
    periods: series.length,
    consecutiveDrops,
    peak: round(peak, 4),
    dropPct: round((1 - currentCtr / peak) * 100, 1),
  };
}

/** Median of a numeric list (returns 0 for empty input). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Median CTR per channel across the dataset — the fatigue baseline.
 * Zero-impression rows are excluded: they have an undefined (not zero) CTR and
 * would otherwise drag the median down and suppress legitimate REFRESH signals.
 */
export function channelMedianCtr(rows: AdRow[]): Record<Channel, number> {
  const byChannel = new Map<Channel, number[]>();
  for (const row of rows) {
    if (row.impressions === 0) continue;
    const ctr = safeDiv(row.clicks, row.impressions);
    const list = byChannel.get(row.channel) ?? [];
    list.push(ctr);
    byChannel.set(row.channel, list);
  }
  const result = {} as Record<Channel, number>;
  for (const [channel, ctrs] of byChannel) {
    result[channel] = median(ctrs);
  }
  return result;
}

/** Aggregate spend/revenue/profit/ROAS per channel — the portfolio breakdown. */
export function summarizeByChannel(
  rows: AdRow[],
  channelLtv?: Partial<Record<Channel, number>>,
): ChannelSummary[] {
  const acc = new Map<
    Channel,
    { spend: number; revenue: number; entities: number }
  >();
  for (const row of rows) {
    const cur = acc.get(row.channel) ?? { spend: 0, revenue: 0, entities: 0 };
    cur.spend += row.spend;
    cur.revenue += effectiveRevenue(row, channelLtv);
    cur.entities += 1;
    acc.set(row.channel, cur);
  }
  return [...acc.entries()]
    .map(([channel, v]) => ({
      channel,
      spend: round(v.spend),
      revenue: round(v.revenue),
      profit: round(v.revenue - v.spend),
      roas: round(safeDiv(v.revenue, v.spend), 3),
      entities: v.entities,
    }))
    .sort((a, b) => b.spend - a.spend);
}
