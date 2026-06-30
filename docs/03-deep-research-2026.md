# Deep Research — 2026 media-buying trends vs. Lever's differentiation

> Method note: this is a knowledge-based synthesis of where performance/affiliate
> media buying is heading into 2026, mapped directly against what Lever does and
> what It's Today Media already ships. Where a claim is a forward bet rather than
> established fact, it is marked (bet).

## The 2026 forces shaping a media buyer's day

| # | 2026 trend | What it does to the buyer | Implication for a tool |
|---|------------|---------------------------|------------------------|
| 1 | **Signal loss / privacy-first measurement** (cookie deprecation tail, ATT, consent mode) | Platform-reported ROAS drifts from truth; last-click lies | Decisions must lean on **profit + incrementality**, not platform ROAS alone |
| 2 | **AI creative saturation** | Everyone generates infinite creatives; CTR decays faster | Need **fatigue detection + refresh timing**, not more generation |
| 3 | **Agentic automation** (auto-bidding, auto-budget, MCP ad ops) | Execution is commoditizing; the *judgment* layer is the moat | Be the **decision brain** that drives the agents, explainably |
| 4 | **First-party data + server-side** | Buyers fuse CRM/LTV into the loop | Optimize to **downstream profit/LTV**, not surface conversions |
| 5 | **Incrementality & MMM revival** | "Would this have converted anyway?" becomes the central question | Recommend **holdouts / reallocation** with projected lift |
| 6 | **Explainability & trust pressure** | Black-box "AI says scale" is rejected by senior buyers/clients | **Show the math.** Every move defensible |
| 7 | **Cross-channel fragmentation persists** | Google/Meta/Taboola/TikTok still 4 schemas, 4 dashboards | **Normalize once**, decide across the portfolio |

## Direct comparison: Lever vs. the 2026 bar

| Trend | The 2026 expectation | Lever today | Gap to close (feeds roadmap) |
|-------|----------------------|-------------|------------------------------|
| Signal loss | Profit-objective, not vanity ROAS | ✅ engine optimizes profit vs target | Add incrementality-aware confidence (bet) |
| Creative saturation | Detect fatigue, time the refresh | ✅ REFRESH_CREATIVE via CTR-vs-median | Add time-series CTR decline detection |
| Agentic automation | Be the explainable driver | ✅ deterministic + `/api/analyze` entry | Expose as MCP-style action endpoint |
| First-party / LTV | Optimize downstream value | ⚠️ uses revenue/conversions | Allow LTV-weighted revenue input |
| Incrementality | Reallocation with projected lift | ✅ portfolio reallocation | Add confidence + what-if simulator |
| Explainability | Every move shows formula | ✅ formula-backed rationale on each rec | Surface formula in UI tooltips |
| Fragmentation | Normalize across 4 channels | ✅ schema-tolerant CSV → canonical rows | Live OAuth pulls (later) |

## Where Lever wins (the differentiation thesis)

It's Today Media already builds **creative generation, ad-upload-via-MCP, and landing/CMS** —
i.e. the *make* and *ship* layers. The 2026 moat is **not** more generation; it's the
**explainable judgment layer that decides where the next dollar goes** and *drives the agents
that execute it*. Lever is deliberately positioned there:

1. **Profit-objective, not vanity ROAS** — survives signal loss.
2. **Deterministic + formula-backed** — survives the explainability/trust backlash.
3. **Decision layer above their tools** — complements, doesn't clone.

## Roadmap deltas adopted from this research

- LTV-weighted revenue input (trend 4) → engine + types.
- Time-series creative-fatigue detection (trend 2) → engine.
- Recommendation **confidence** + **what-if simulator** (trends 5,6) → engine + UI.
- Formula surfaced in UI (trend 6) → dashboard.
- MCP-style action endpoint framing (trend 3) → API + README.
