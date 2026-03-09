# Handover: PRmanager Federation — For Will's Codex Agent

**From:** Andrew's Claude Code agent
**To:** Will's Codex GPT-5.4 agent (@sparkyrider)
**Date:** 2026-03-09 (updated)
**Status:** Federation LIVE. Both sides connected. Dashboard at /federation.

---

## What's Done (Andrew's Side)

PRmanager's API server is live on the public internet:

```
Base URL: https://andy.taild3619e.ts.net
Health:   GET /v1/health  (no auth)
Auth:     Authorization: Bearer <raw-token>
```

### Verified Working

| Test | Result |
|------|--------|
| `GET /v1/health` (no auth) | `{"status":"ok","agent":"prmanager","version":"1.0"}` |
| `GET /api/agent/me` (Will's token) | Returns agent_id, 12 scopes, display_name |
| `GET /api/prs?limit=2` | Returns PR data (5,084 open PRs available) |
| `GET /api/stats` | Returns dashboard statistics |
| `GET /api/low-hanging-fruit` | Returns scored PRs (fruit_score 85-89) |
| `POST /api/pick/:id` (Will's token) | 200 OK (prs:write scope works) |
| `POST /api/bot-review/sync/:pr` (Will's token) | 200 OK (ci:write scope works) |
| `POST /api/agent/messages` | Cross-agent messaging works |
| `POST /api/sync/trigger` | Triggers GitHub data sync |

### Your Token

Your raw token is shared by Andrew securely out-of-band. The token gives you these scopes:

```
prs:read, issues:read, search:read, stats:read, ci:read, ci:write,
maintainers:read, messages:read, messages:write, prs:write, sync:trigger
```

### What You Can Do

| Capability | Scope | How |
|-----------|-------|-----|
| Read PRs, issues, stats, CI, maintainers | `*:read` | GET endpoints |
| Find low-hanging fruit PRs | `prs:read` | `GET /api/low-hanging-fruit` |
| Pick/claim PRs for triage | `prs:write` | `POST /api/pick/:id` |
| Sync bot comments from GitHub | `ci:write` | `POST /api/bot-review/sync/:pr` |
| Classify bot comments | `ci:write` | `PUT /api/bot-review/classify/:id` |
| Start/cancel PR test runs | `ci:write` | `POST /api/pr-test/:id/start` |
| Send/receive agent messages | `messages:*` | `/api/agent/messages` |
| Trigger GitHub data sync | `sync:trigger` | `POST /api/sync/trigger` |

### Auth Pattern

Standard API key auth (same as Stripe, GitHub):
1. Store the raw token in `PRMANAGER_TOKEN` environment variable
2. Send it as `Authorization: Bearer <token>` over HTTPS
3. The server hashes it (SHA-256) on receipt for DB lookup
4. Never store or log the raw token — treat it like a password

---

## Daily Triage Workflow v2 (Your Primary Use Case)

This is the recommended workflow for your agent. See `examples/daily-triage.js` for runnable code.

**Key feature:** Triage state is persistent. Running the workflow twice picks DIFFERENT PRs because previously-triaged PRs are excluded for 7 days.

### Step 0.5: Check Triage History

```javascript
// What have I already triaged recently?
const since = new Date(Date.now() - 7 * 86400_000).toISOString();
const history = await client.getTriageHistory({ agent_id: 'will', since });
// Returns { data: [...], count: N }
// Each entry: { id, title, triaged_by, triaged_at, triage_status, fruit_score, ... }
```

### Step 1: Discover Low-Hanging Fruit (excluding recently triaged)

```javascript
const lhf = await client.getLowHangingFruit({
  limit: 10,
  exclude_triaged_days: 7,  // NEW: skip PRs triaged in last 7 days
});
// Returns PRs scored 0-100 with: fruit_score, ci_status, review_status,
// next_action, ai_complexity, merge_readiness_score
```

Each PR has a `fruit_score` based on:
- CI passing (25 pts)
- Approved reviews (20 pts)
- Small size (20 pts)
- No merge conflicts (20 pts)
- Bot comments resolved (15 pts)

PRs with `fruit_score >= 80` and `next_action: "ready_to_merge"` are your targets.

### Step 2: Pick Top PRs

```javascript
// Claim PRs so no other agent double-processes them
await client.pickPR(prId);

// Release when done (triage record survives unpick)
await client.unpickPR(prId);
```

### Step 3: Sync & Triage Bot Comments

```javascript
// Pull latest bot comments from GitHub
const sync = await client.syncBotComments(prId);
// { synced: 3, total_comments: 5, bot_originals: 3 }

// Get triage recommendations
const triage = await client.getBotTriage(prId);

// Classify individual comments
await client.classifyBotComment(commentId, 'false_positive');
// Valid: genuine_fix, false_positive, by_design, repeated_fp,
//        acknowledged, reverted, bulk_dismissed
```

### Step 4: Check CI & Merge Readiness

```javascript
const ready = await client.getReadyToMerge({ limit: 10 });
// Returns: CI passing + approved + no conflicts + not draft

const actionState = await client.getActionState();
// Returns segmented queues: ready_to_merge, needs_review,
//                           needs_revision, blocked
```

### Step 5: Record Triage (permanent breadcrumb)

```javascript
// Record BEFORE unpicking — this is the persistent state
await client.triagePR(prId);
// Returns { data: { id, title, triaged_by, triaged_at, triage_status } }

// Optional: record with a custom status
await client.triagePR(prId, 'needs_maintainer');
```

### Step 6: Report to Andrew

```javascript
await client.sendMessage('andrew', 'Daily triage complete', {
  picked: [{ id: 33608, title: '...', score: 89 }],
  merge_ready_count: 12,
  bot_comments_synced: 5,
  previously_triaged: 5,
  recommendation: 'Top 3 fresh PRs triaged. 5 skipped (already done). #33608 is merge-ready.',
});
```

### Step 7: Unpick (release transient lock — triage record survives)

```javascript
await client.unpickPR(prId);
// Pick is cleared, but triaged_by/triaged_at/triage_status persist
```

### Full Example

```bash
node examples/daily-triage.js
```

This runs all 8 steps automatically and sends a structured summary to Andrew.

### Messages with Date Filter

```javascript
// Get messages from the last 24 hours (useful for checking recent reports)
const since = new Date(Date.now() - 86400_000).toISOString();
const msgs = await client.getMessages({ from_date: since, include_read: true });
```

---

## What You Need to Build (Will's Side)

### 1. Expose `/v1/search/context` endpoint

This is the MVP federation workflow. PRmanager will call YOUR endpoint to get historical context for PRs.

```
POST /v1/search/context
Authorization: Bearer <token>
Content-Type: application/json

{
  "request_id": "uuid",
  "caller_agent": "prmanager",
  "repository": "openclaw/openclaw",
  "pr_number": 12345,
  "query": "authentication race condition",
  "context": {
    "files": ["src/foo.ts", "src/bar.ts"],
    "commit_sha": "abc123",
    "branch": "fix/auth-race"
  },
  "top_k": 5,
  "deadline_ms": 10000
}
```

**Expected response:**

```json
{
  "request_id": "uuid",
  "status": "ok",
  "results": [
    {
      "type": "pr",
      "id": "6789",
      "url": "https://github.com/openclaw/openclaw/pull/6789",
      "title": "Previous auth fix",
      "score": 0.87,
      "snippet": "Fixed race condition in session handler...",
      "reason": "Similar file changes + semantic match"
    }
  ],
  "summary": "3 prior PRs addressed similar auth patterns"
}
```

**Result types:** `pr`, `issue`, `commit`, `file`, `discussion`

### 2. Expose `/v1/health` endpoint

```
GET /v1/health
→ { "status": "ok", "agent": "gh-search", "version": "1.0" }
```

### 3. How to Use the Search

Given the request fields, your search should:
1. Use `query` for semantic/vector search (your 1536-dim OpenAI embeddings)
2. Use `context.files` for file-path overlap matching
3. Use `pr_number` to exclude the requesting PR from results
4. Return at most `top_k` results sorted by score descending
5. Include a `summary` field with a one-line explanation

### 4. Expose Your Server to the Internet

Options:
- Tailscale Funnel (if you have Tailscale): `tailscale funnel --bg <port>`
- ngrok: `ngrok http <port>`
- Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:<port>`
- Any HTTPS-capable hosting

Share your public URL with Andrew so PRmanager can call you.

### 5. Auth for YOUR Endpoint

Create a token for Andrew's agent to authenticate when calling your API. Same pattern:
- Generate a random 32-byte token
- Share the raw token with Andrew
- Your server validates `Authorization: Bearer <token>`

---

## Available PRmanager Endpoints (Your Client SDK)

A complete client SDK is at `prmanager-client.js`. Full OpenAPI spec at `openapi-spec.yaml`.

### Quick Start

```javascript
import { PRManagerClient } from './prmanager-client.js';

const client = new PRManagerClient(
  'https://andy.taild3619e.ts.net',
  process.env.PRMANAGER_TOKEN
);

// Verify connectivity
const me = await client.whoami();
console.log(me); // { agent_id: "will", scopes: [...] }

// Find easy wins
const lhf = await client.getLowHangingFruit({ limit: 5 });

// Pick and triage
await client.pickPR(33608);
await client.syncBotComments(33608);
const ci = await client.getCIChecks(33608);

// Check merge queue
const ready = await client.getReadyToMerge({ limit: 10 });

// Report findings
await client.sendMessage('andrew', 'Triage complete', {
  picked: [33608], merge_ready: ready.count,
});

// Trigger a data refresh
await client.triggerSync();
```

### All Endpoints

| Method | Path | Scope | What It Does |
|--------|------|-------|-------------|
| `GET` | `/v1/health` | *none* | Server health (no auth) |
| `GET` | `/api/agent/me` | *any* | Your identity + scopes |
| `GET` | `/api/prs` | prs:read | List PRs (state, category, author, sort, limit) |
| `GET` | `/api/prs/:id` | prs:read | PR details |
| `GET` | `/api/prs/search?q=` | search:read | Full-text search |
| `GET` | `/api/issues` | issues:read | List issues |
| `GET` | `/api/stats` | stats:read | Dashboard stats |
| `GET` | `/api/low-hanging-fruit` | prs:read | Scored PRs for easy wins |
| `GET` | `/api/queues/ready-to-merge` | prs:read | Merge-ready PRs |
| `GET` | `/api/queues/action-state` | prs:read | Segmented action queues |
| `GET` | `/api/prs/:id/checks` | ci:read | CI check snapshots |
| `GET` | `/api/bot-review/comments/:pr` | ci:read | Bot review comments |
| `GET` | `/api/bot-review/triage/:pr` | ci:read | Bot triage recommendations |
| `GET` | `/api/maintainers` | maintainers:read | Maintainer rankings |
| `GET` | `/api/alerts` | stats:read | Active alerts |
| `POST` | `/api/pick/:id` | prs:write | Claim a PR for triage |
| `DELETE` | `/api/pick/:id` | prs:write | Release a claimed PR |
| `POST` | `/api/prs/:id/triage` | prs:write | Record persistent triage (survives unpick) |
| `GET` | `/api/prs/triage-history` | prs:read | Query triage history (agent_id, since, limit) |
| `PUT` | `/api/alerts/:id/resolve` | prs:write | Resolve an alert |
| `POST` | `/api/bot-review/sync/:pr` | ci:write | Sync bot comments from GitHub |
| `PUT` | `/api/bot-review/classify/:id` | ci:write | Classify a bot comment |
| `POST` | `/api/pr-test/:id/start` | ci:write | Start a PR test run |
| `DELETE` | `/api/pr-test/:id/cancel` | ci:write | Cancel a PR test run |
| `POST` | `/api/sync/trigger` | sync:trigger | Trigger GitHub data sync |
| `GET` | `/api/sync/status` | *any* | Check sync progress |
| `GET` | `/api/agent/messages` | messages:read | Your unread messages |
| `POST` | `/api/agent/messages` | messages:write | Send message to Andrew |
| `PUT` | `/api/agent/messages/:id/read` | messages:read | Mark message read |
| `GET` | `/api/federation/queries` | *none* | List available predefined queries |
| `POST` | `/api/federation/queries/:name` | *any* | Run a named bulk query (cached) |

### Federation Queries (Bulk Data, Cached)

Use these instead of paginating `/api/prs` for large data pulls. Cached server-side, shared across callers.

```javascript
// List available queries (no auth)
const { queries } = await client.listFederationQueries();

// Run a query
const result = await client.runFederationQuery('low_hanging_fruit', 10);
// Returns: { query, generated_at, cached, ttl_seconds, count, data: [...] }
```

| Query | Description | Cache TTL |
|-------|-------------|-----------|
| `low_hanging_fruit` | Scored PRs ready for easy wins (fruit_score desc) | 5 min |
| `merge_ready` | PRs with CI passing + approved reviews | 5 min |
| `stale_prs` | PRs untouched for 30+ days | 5 min |
| `needs_review` | PRs needing reviewer attention (open, no recent review) | 5 min |
| `category_summary` | PR count by AI category | 2 min |
| `pr_velocity` | Merge + creation rate (merged_7d, merged_30d, open_total, created_7d) | 1 min |

### Model Access Controls (on `/api/agent/me`)

Your token can have per-model controls. Check these before calling the xAI/QwQ proxy:

```javascript
const me = await client.whoami();
// {
//   allowed_models: null,          // null = all models allowed; ['grok-3'] = restricted
//   daily_token_budget: null,      // null = no limit; integer = daily cap
//   tokens_used_today: 0,          // running total (resets UTC midnight)
//   budget_reset_at: "2026-..."    // timestamp of last reset
// }
```

If `allowed_models` is set and the model you request isn't in the list, you'll get `403 Model not permitted`.
If `daily_token_budget` is set and exceeded, you'll get `429 Daily token budget exceeded` with `resets_at`.

### Triage Endpoint — Federated Context

`POST /api/prs/:id/triage` now returns optional `federated_context` enriching the triage record with similar PRs from Will's vector search and Andrew's local embeddings:

```javascript
const result = await client.triagePR(prId);
// result.federated_context may include:
// {
//   local: [{ pr_id, title, similarity_score, ... }],       // from Andrew's pgvector
//   federated: { results: [{ type, id, title, score, snippet }], summary },  // from Will's search
//   combined_summary: "3 related merged PRs from local DB + 2 similar items from federated search"
// }
```

This field is omitted if no context found or if Will's search is offline (times out after 3s).

---

## Protocol Details

### Request ID and Idempotency

Every `/v1/search/context` request must include a `request_id` (UUID v4). The server should deduplicate requests with the same ID for 15 minutes.

### Timeout Behavior

- If your search completes in < 10 seconds, return `200` with inline results
- If it will take longer, return `202 Accepted` with:
  ```json
  { "request_id": "...", "status": "accepted", "estimated_ms": 15000 }
  ```
  PRmanager will poll or use a callback URL (future).

### Error Responses

```json
{ "request_id": "...", "status": "error", "error_code": "TIMEOUT", "retryable": true }
```

Error codes: `TIMEOUT`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`

### Bot Comment Classifications

When classifying bot comments via `PUT /api/bot-review/classify/:id`:

| Classification | Meaning |
|---------------|---------|
| `genuine_fix` | Bot found a real issue that needs fixing |
| `false_positive` | Bot flagged something that isn't actually wrong |
| `by_design` | Code is intentionally written this way |
| `repeated_fp` | Same false positive seen before |
| `acknowledged` | Noted but won't fix now |
| `reverted` | Change was reverted |
| `bulk_dismissed` | Dismissed as part of batch triage |

---

## File Inventory (This Workspace)

| File | Purpose |
|------|---------|
| `prmanager-client.js` | HTTP client SDK — import and use |
| `openapi-spec.yaml` | Full OpenAPI 3.0 spec |
| `README.md` | Setup guide |
| `.env.example` | Config template |
| `examples/triage.js` | Basic connectivity test |
| `examples/daily-triage.js` | Full triage workflow (pick, sync, report) |
| `examples/messages.js` | Messaging example |
| `SPEC.md` | Full platform specification |
| `HANDOVER.md` | This file |

---

## Next Steps (Checklist)

- [x] Get raw token from Andrew (secure channel) — DONE
- [x] Set up `.env` with `PRMANAGER_URL=https://andy.taild3619e.ts.net` and token — DONE
- [x] Implement `POST /v1/search/context` on GH Search Tool — DONE
- [x] Implement `GET /v1/health` on GH Search Tool — DONE
- [x] Expose GH Search Tool via Tailscale Funnel at `https://macbookpro.tailef02e2.ts.net` — DONE
- [x] Generate auth token for Andrew — DONE
- [x] Bidirectional federation handshake verified — DONE (2026-03-08)
- [ ] Run `node examples/triage.js` to verify connectivity
- [ ] Run `node examples/daily-triage.js` to test full triage workflow
- [ ] Pick low-hanging fruit PRs and triage bot comments
- [ ] Implement heartbeat pings (see Outstanding Enhancements #8)
- [ ] Add `/v1/stats` endpoint for search index metadata (see #13)
- [ ] Add `error_code` + `retryable` fields to error responses (see #15)
- [ ] Add async 202 Accepted support for slow queries (see #16)

---

## Federation Control Room (New — 2026-03-09)

Andrew has a live dashboard at `GET /federation` that shows:
- Andrew's inbox (unread messages addressed to 'andrew')
- Will's pending task queue (your unread messages + code_task items)
- Query cache status (which named queries are warm)
- Recent audit log
- Will's health + search index stats

### Federation Dashboard API

```
GET  /api/federation/dashboard         Poll endpoint — returns combined state
POST /api/federation/dashboard/messages        Send message (from_agent auto-set from token)
PUT  /api/federation/dashboard/messages/:id/read   Mark message as read
POST /api/federation/dashboard/seed-tasks     Seed code_task items for Will (requires messages:write)
```

All four endpoints are behind `authGateway`. Your agent token (which has `messages:write`) can call all of them.

### Queued Tasks For You

You have 3+ `code_task` messages in the queue. Fetch them with:
```javascript
const msgs = await client.getMessages({ include_read: false });
const tasks = msgs.messages.filter(m => m.message_type === 'code_task');
```

Each task body is a JSON object with `description`, `code`, and `language` fields.

### Security Model (For Reference)

Mark-read endpoint ownership: you can only mark messages where `to_agent = 'will'` (your own inbox). Andrew's browser can mark any message (admin bypass). Attempting to mark someone else's message returns 403.

---

## Contact

PRmanager messages go through the API:
```javascript
await client.sendMessage('andrew', 'Subject', { your: 'data' });
```

Or check your inbox:
```javascript
const inbox = await client.getMessages();
```

---

## Outstanding Enhancements (For Will's Codex Context)

These items were identified by a fleet red-team analysis (Brutal QwQ-32B, Codex GPT-5.4, Gemini 3.1 Pro, Pantheon Grok 4.20) on 2026-03-09. Andrew will work on the server-side items. Items marked **(Will)** need your attention.

### Priority 1 — Security (Andrew working on these)

1. **CSRF protection on mutation endpoints** — mark-read, send-message, seed-tasks, run-query need `SameSite=Strict` cookies + Origin header validation
2. **Rate limiting** on `/api/federation/dashboard` and polling endpoints via `express-rate-limit`
3. **Alpine.js CSP migration** — replace Alpine v3 CDN with `@alpinejs/csp` build to remove `unsafe-eval` from Content-Security-Policy
4. **Tailscale Funnel → Serve evaluation** — consider restricting to tailnet-only access if public internet exposure isn't needed

### Priority 2 — Reliability

5. **Replace 3s polling with SSE (Server-Sent Events)** — all four red-team models recommend this. Reduces load, provides real-time updates, eliminates stale data windows
6. **Message TTL/cleanup** in PostgreSQL — old messages should age out
7. **Agent heartbeat monitoring** — last-seen timestamps, dead agent detection
8. **(Will) Implement heartbeat ping** — your agent should call `POST /api/agent/messages` with a periodic `heartbeat` message type, or hit `GET /v1/health` on Andrew's side so we can track your uptime

### Priority 3 — Operational

9. **Agent kill switch / pause controls** in federation dashboard UI
10. **Dead-letter queue + retry controls** for failed message deliveries
11. **Data freshness badges** — show how old each data panel is
12. **OpenTelemetry instrumentation** — distributed tracing across both agents

### Priority 4 — Will's Side Improvements

13. **(Will) Search index stats endpoint** — expose `GET /v1/stats` returning chunk count, last-indexed timestamp, embedding model version. Andrew's dashboard already has a panel waiting for this data
14. **(Will) Configurable top_k** — honour the `top_k` field in `/v1/search/context` requests (currently defaults to internal value)
15. **(Will) Error detail in responses** — include `error_code` field (TIMEOUT, NOT_FOUND, RATE_LIMITED, INTERNAL_ERROR) and `retryable` boolean per the protocol spec in this doc
16. **(Will) Async search support** — for queries exceeding 10s, return `202 Accepted` with `estimated_ms` so PRmanager can poll or use callback

### Already Done (This Session)

- [x] CSP nonce injection for inline scripts (federation dashboard)
- [x] Alpine.js `unsafe-eval` scoped to `/federation` route only
- [x] Tailscale header trust removed (was spoofable via Funnel)
- [x] Empty IP localhost bypass removed
- [x] Auth wall keyboard bypass fixed (`inert` attribute)
- [x] Silent catch blocks replaced with logged errors
- [x] `fs.readFile` callback migrated to `fs/promises` async pattern
