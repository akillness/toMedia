#!/usr/bin/env bash
# Deterministically build the Lever Open Graph card.
# Composition: hand-set vector typography (guaranteed-correct text) + the
# god-tibo-imagen lever symbol embedded on the right. Output 1200x630.
set -euo pipefail
cd "$(dirname "$0")"

SYM_B64=$(base64 -i icon-512.png | tr -d '\n')

cat > og.svg <<SVG
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect x="0" y="0" width="1200" height="10" fill="#0f172a"/>
  <rect x="0" y="620" width="1200" height="10" fill="#047857"/>

  <!-- wordmark -->
  <text x="80" y="210" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="128" letter-spacing="-4" fill="#0f172a">Lever</text>
  <!-- profit-copilot pill -->
  <rect x="378" y="120" rx="22" ry="22" width="246" height="46" fill="#0f172a"/>
  <text x="501" y="152" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="24" letter-spacing="1" fill="#ffffff">PROFIT COPILOT</text>

  <!-- tagline -->
  <text x="82" y="290" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="500" font-size="34" fill="#334155">Pause leaks. Scale winners. Refresh fatigue.</text>
  <text x="82" y="338" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="500" font-size="34" fill="#334155">Every move ranked &#8212; shown with the math.</text>

  <!-- metric chips -->
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="26">
    <rect x="80"  y="430" rx="14" ry="14" width="290" height="64" fill="#ecfdf5" stroke="#047857" stroke-width="2"/>
    <text x="106" y="471" fill="#047857">\$8,269 projected lift</text>

    <rect x="392" y="430" rx="14" ry="14" width="196" height="64" fill="#eef2ff" stroke="#4338ca" stroke-width="2"/>
    <text x="418" y="471" fill="#4338ca">80/100 health</text>

    <rect x="610" y="430" rx="14" ry="14" width="300" height="64" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
    <text x="636" y="471" fill="#334155">deterministic &#183; explainable</text>
  </g>

  <!-- god-tibo-imagen lever symbol -->
  <image x="812" y="150" width="330" height="330" xlink:href="data:image/png;base64,${SYM_B64}"/>
</svg>
SVG

rsvg-convert -w 1200 -h 630 og.svg -o og-card.png
echo "built og-card.png:"
identify -format "%wx%h\n" og-card.png
