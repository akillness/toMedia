// e2e/smoke.mjs — Playwright smoke test for a locally running Lever instance.
//
// Drives a real Chromium against the dev server (default http://localhost:3000,
// override with BASE_URL) and asserts the seeded demo actually renders and the
// real-data API seams respond. Exits non-zero on the first failed expectation so
// it doubles as a CI/manual gate:
//
//   ./dev.sh --port 3100 &           # start the server
//   BASE_URL=http://localhost:3100 node e2e/smoke.mjs
//
// Playwright is resolved from the global install (this project doesn't depend on
// it), so no extra devDependency is needed.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const globalRoot = process.env.PW_GLOBAL_ROOT || "/Users/jangyoung/.nvm/versions/node/v22.19.0/lib/node_modules";
const { chromium } = require(require.resolve("playwright", { paths: [globalRoot] }));

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

let passed = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  console.log(`\n[1] Home page renders the seeded demo (${BASE})`);
  const resp = await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  check("GET / returns 200", resp?.status() === 200, `status ${resp?.status()}`);

  // Brand + tagline
  await page.getByText("profit copilot").waitFor({ timeout: 10000 });
  check("brand wordmark 'Lever' present", (await page.getByText("Lever", { exact: true }).count()) >= 1);
  check("'profit copilot' badge present", await page.getByText("profit copilot").isVisible());

  // KPI tiles driven by the analysis engine
  for (const label of ["Spend", "Revenue", "Profit", "Blended ROAS", "Account health"]) {
    check(`KPI '${label}' rendered`, (await page.getByText(label, { exact: true }).count()) >= 1);
  }
  // ROAS value formatted like "x.xxx" / "x.xx x"
  // ROAS is rendered as "n.nn×" (multiplication sign) in KPI + channel tiles; accept ASCII 'x' too.
  const roasOk = /\d+\.\d{2}\s*[x\u00d7]/i.test(await page.locator("body").innerText());
  check("a ROAS value (n.nn×) is shown", roasOk);

  // Prioritized actions list — seeded data must produce at least one move
  const actionBadges = await page
    .locator("section ul li span")
    .filter({ hasText: /^(Pause|Scale|Refresh creative|Review|Keep)$/ })
    .count();
  check("at least one prioritized action renders", actionBadges >= 1, `found ${actionBadges}`);
  check("a high-leverage Pause or Scale exists", (await page.getByText(/^(Pause|Scale)$/).count()) >= 1);

  console.log("\n[2] What-if controls are interactive");
  const exportBtn = page.getByRole("button", { name: "Export CSV" });
  check("Export CSV button enabled with seeded data", await exportBtn.isEnabled());
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.waitForTimeout(200);
  check("Source line shows the seeded dataset after reset", (await page.getByText(/Seeded demo dataset/).count()) >= 1);

  console.log("\n[3] Credential catalog API serves the free-tier channels");
  const credResp = await page.request.get(`${BASE}/api/credentials`);
  check("GET /api/credentials returns 200", credResp.status() === 200, `status ${credResp.status()}`);
  const credJson = await credResp.json().catch(() => ({}));
  const channelNames = JSON.stringify(credJson).toLowerCase();
  check("response carries a channels array", Array.isArray(credJson.channels), `keys: ${Object.keys(credJson).join(",")}`);
  for (const ch of ["google", "meta", "tiktok", "taboola"]) {
    check(`catalog advertises '${ch}'`, channelNames.includes(ch));
  }

  console.log("\n[4] Real-data ingest ranks rows end to end");
  const ingestBody = {
    source: "smoke",
    rows: [
      { entityId: "w1", entityName: "Winner", channel: "google", spend: 200, revenue: 800, clicks: 400, impressions: 8000, conversions: 40 },
      { entityId: "l1", entityName: "Loser", channel: "meta", spend: 1000, revenue: 450, clicks: 600, impressions: 9000, conversions: 18 },
    ],
  };
  const ingestResp = await page.request.post(`${BASE}/api/ingest`, {
    data: ingestBody,
    headers: { "content-type": "application/json" },
  });
  // In dev with no LEVER_ADMIN_TOKEN, ingest is open; in a locked env it returns 401.
  if (ingestResp.status() === 401) {
    check("POST /api/ingest fails closed without admin token (locked env)", true);
  } else {
    check("POST /api/ingest returns 200", ingestResp.status() === 200, `status ${ingestResp.status()}`);
    const ing = await ingestResp.json().catch(() => ({}));
    const text = JSON.stringify(ing).toLowerCase();
    check("response references recommendations/actions", /recommend|action|scale|pause/.test(text));
  }

  console.log("\n[5] Analyze API is reachable");
  const analyzeResp = await page.request.post(`${BASE}/api/analyze`, {
    data: { rows: ingestBody.rows },
    headers: { "content-type": "application/json" },
  });
  check("POST /api/analyze returns 200", analyzeResp.status() === 200, `status ${analyzeResp.status()}`);

  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n──────────────────────────────────────────`);
if (failures.length) {
  console.log(`✗ ${failures.length} check(s) FAILED, ${passed} passed:`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exit(1);
}
console.log(`✓ All ${passed} checks passed against ${BASE}`);
