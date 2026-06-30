# Brand asset provenance

Source-of-truth artifacts for Lever's identity (Cycle 56).

- `icon-raw.png` / `og-raw.png` — raw `god-tibo-imagen` (gti) generations from the
  prompts recorded in `../BRAND.md`.
- `icon-512.png`, `apple-icon-180.png` — the gti symbol trimmed/centered; copied to
  `src/app/icon.png`, `src/app/apple-icon.png`, and rasterized into `favicon.ico`.
- `build-og.sh` — regenerates `og-card.png` (the 1200×630 social card): hand-set
  vector typography composited over the gti symbol via `rsvg-convert`. Copied to
  `src/app/opengraph-image.png` and `src/app/twitter-image.png`.
- `og.svg` — the SVG emitted by `build-og.sh` (kept for inspection).

Reproduce the social card:  `bash build-og.sh`
