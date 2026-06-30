# Lever — Brand & Product Identity Seed

> Frozen spec (ooo seed) for Cycle 30. Implementation must satisfy this contract.

## Character
Lever is a **deterministic, explainable profit copilot** for cross-platform media
buyers. Its personality is **precise, trustworthy, and quietly confident** — a
financial instrument, not a hype tool. Every pixel should read "the math is
already done; here is the one move that matters."

## Name meaning
A **lever** delivers mechanical advantage: small, well-placed force → outsized
result. The product finds the highest-**leverage** dollar move. The mark is a
**bar balanced on a fulcrum**, the short arm lifting the long arm — leverage made
literal, and a subtle upward profit lift.

## Voice
- Declarative, numeric, no fluff. "Pause leaks, scale winners — each move shown with the math."
- Confidence without hype. Show the dollars, show the reasoning.

## Color tokens
| Token | Hex | Role |
| --- | --- | --- |
| `--brand-ink` | `#0f172a` | Primary brand / text (slate-900) |
| `--brand-surface` | `#ffffff` | Cards / canvas |
| `--brand-line` | `#e2e8f0` | Hairline borders (slate-200) |
| `--brand-profit` | `#047857` | Positive / scale / profit (emerald-700) |
| `--brand-leak` | `#b91c1c` | Pause / loss (red-700) |
| `--brand-fatigue` | `#b45309` | Refresh creative (amber-700) |
| `--brand-review` | `#4338ca` | Review / reallocation (indigo-700) |

## Type
- UI: Geist Sans. Numerals/metrics: Geist Mono. Headings tight tracking, black weight for wordmark.

## Asset inventory (registered)
- `src/app/icon.png` — app icon / favicon (lever-on-fulcrum mark, ink on white).
- `src/app/apple-icon.png` — touch icon.
- `src/app/opengraph-image.png` — 1536×1024 social card.
- Inline header logomark — hand-authored SVG (vector, theme-aware, no network) in `page.tsx`.

## Acceptance criteria
1. A distinct, on-brand lever symbol replaces the default Next.js favicon.
2. The header carries an inline vector logomark (crisp at any DPI, currentColor-themeable).
3. Social/OG + apple-touch metadata resolve to real brand images.
4. Brand color tokens are defined once in `globals.css` and the UI references the identity consistently.
5. Build ✓ · all tests ✓ · lint 0 · live render verified.
