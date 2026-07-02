# Lever — Google Ads API Integration Design Document

**Company:** Independent software product, operated by the account holder (contact: akillness38@gmail.com)

**Purpose of this document:** Supporting design documentation for a Google Ads API developer
token Basic Access application.

## 1. What Lever is

Lever is a media-buyer decision tool. A single media buyer typically runs paid spend across
several channels at once (Google Ads, Meta Ads, TikTok Ads, Taboola). Each channel has its own
dashboard and its own performance metrics schema, so answering the simple daily question — "what
should I do with the next dollar of budget?" — requires manually cross-referencing four separate
UIs.

Lever solves this by pulling read-only performance data from each connected ad channel on a
schedule, normalizing it into one common row shape, running it through a deterministic
profit-scoring engine, and presenting a single ranked list of "do this next" actions (e.g. shift
budget from Campaign A to Campaign B) with the dollar-impact math shown for every recommendation.

Live product: https://lever-sepia.vercel.app

## 2. How the Google Ads API is used

Lever's Google Ads integration lives in `src/lib/channels/google.ts` and is one of four channel
connectors sharing a common interface (`ChannelConnector`). It is **read-only**: Lever never
creates, edits, or pauses campaigns — it only reads reporting metrics.

### 2.1 Authentication

- Standard OAuth2 flow with a Google Cloud "Desktop app" OAuth client owned by the account
  holder.
- The user's `refreshToken`, `clientId`, and `clientSecret` are stored, encrypted at rest, in
  Lever's own credential vault (`/api/credentials`, `LEVER_SECRET_KEY`-encrypted).
- Before each ingest run, Lever exchanges the refresh token for a short-lived access token via
  Google's standard `https://oauth2.googleapis.com/token` endpoint (`mintGoogleAccessToken`) — no
  access token is ever stored long-term, avoiding manual token rotation while keeping the stored
  secret to a single long-lived refresh token.

### 2.2 Data retrieval

- A single GAQL `search` query is issued against
  `POST https://googleads.googleapis.com/v24/customers/{customerId}/googleAds:search`.
- The query selects campaign-level metrics only:
  `campaign.id`, `campaign.name`, `metrics.cost_micros`, `metrics.conversions`,
  `metrics.conversions_value`, `metrics.clicks`, `metrics.impressions`, filtered to a caller-
  supplied date range (`segments.date BETWEEN ...`).
- Pagination is followed via the API's own `nextPageToken` / `pageToken` mechanism, capped at a
  fixed maximum page count per ingest run to bound API usage.
- `login-customer-id` header is set when the account sits under a manager account (MCC), per
  Google's documented requirement for MCC-linked customer IDs.

### 2.3 What happens to the data after retrieval

- Rows are normalized into Lever's internal `AdRow` shape (id, name, channel, spend, revenue,
  conversions, clicks, impressions) — `costMicros` is converted to a dollar amount
  (`costMicros / 1_000_000`).
- Normalized rows feed a deterministic, explainable scoring engine (`src/lib/engine.ts`) that
  ranks actions by projected profit impact vs. a target. No campaign-management writes are ever
  issued back to Google Ads.
- Data is displayed to the authenticated account owner in Lever's own dashboard UI. It is not
  resold, shared with third parties, or used for any purpose other than the account owner's own
  reporting/decision-making.

## 3. Access scope and usage volume

- **Who uses this token:** the account owner only (single media buyer, internal use). Lever is
  presently a single-tenant tool run by its own developer/operator against their own Google Ads
  manager account and its linked client accounts.
- **Call volume:** one ingest run pulls one page (occasionally a few, if paginated) of
  campaign-level rows per connected customer account, on demand or on a lightweight schedule —
  well within Basic Access default quota for a single buyer's accounts.
- **No other developer's tool is wrapped or resold** — this is a first-party integration built
  directly against the Google Ads API by the account owner.

## 4. Security notes

- Credentials never touch client-side code; all Google Ads API calls are made server-side
  (Next.js route handlers).
- Secrets are encrypted at rest with `LEVER_SECRET_KEY` and gated behind an admin token
  (`LEVER_ADMIN_TOKEN`) for the credential-vault API.
- No secrets are committed to source control (`.env.local` is gitignored).
