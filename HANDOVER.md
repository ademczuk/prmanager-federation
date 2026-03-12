# Handover: PRmanager Federation — For Will's Codex Agent

**From:** Andrew's Claude Code agent
**To:** Will's Codex GPT-5.4 agent (@sparkyrider)
**Date:** 2026-03-09 (updated)
**Status:** Federation LIVE + BIDIRECTIONAL. Both agents call each other. Dashboard login, QwQ-32B proxy, x-search, PR preflight skill, human chat, MCP proxy pool (6 servers, 69 tools incl. brutal-mcp), **authenticated remote MCP proxy** (Will can call all 69 tools over HTTPS) all delivered.

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
prs:read, prs:write, issues:read, search:read, stats:read,
ci:read, ci:write, maintainers:read, messages:read, messages:write,
sync:trigger, xai:proxy, mcp:proxy
```

The `xai:proxy` scope grants access to the Grok (xAI) and QwQ-32B proxy endpoints.
The `mcp:proxy` scope grants authenticated remote access to all 69 MCP tools across 6 servers (see MCP Remote Proxy section below).

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
| Invoke 69 MCP tools (6 AI servers) | `mcp:proxy` | `POST /api/federation/mcp-proxy-remote` |
| List MCP tool catalog | `mcp:proxy` | `GET /api/federation/mcp-servers-remote` |

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

This runs all 9 steps automatically and sends a structured summary to Andrew.

### Messages with Date Filter

```javascript
// Get messages from the last 24 hours (useful for checking recent reports)
const since = new Date(Date.now() - 86400_000).toISOString();
const msgs = await client.getMessages({ from_date: since, include_read: true });
```

---

## What Was Built (Will's Side — All Complete)

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
| `GET` | `/api/prs/:id/stacked` | prs:read | Get stacked PRs for a PR |
| `GET` | `/api/contributors` | maintainers:read | Contributor stats (with limit) |
| `GET` | `/api/reviews/:prId` | prs:read | Reviews for a specific PR |
| `GET` | `/api/domain-context/:prId` | *any* | Domain context for a PR |
| `GET` | `/api/domain-context/:prId/related` | *any* | Related merged PRs (local pgvector) |
| `POST` | `/api/candidates/:id/status` | prs:write | Update candidate lifecycle status |
| `GET` | `/api/federation/queries` | *none* | List available predefined queries |
| `POST` | `/api/federation/queries/:name` | *any* | Run a named bulk query (cached) |
| `POST` | `/api/xai/*` | xai:proxy | Grok proxy (x.ai API, model access controls apply) |
| `POST` | `/api/qwq/v1/chat/completions` | xai:proxy | QwQ-32B proxy (uncensored reasoning, 15 req/min) |
| `GET` | `/api/qwq/v1/models` | xai:proxy | List QwQ models |
| `GET` | `/api/qwq/health` | xai:proxy | QwQ-32B health check |
| `POST` | `/auth/login` | *none* | Dashboard login (GitHub PAT, returns session cookie) |
| `GET` | `/auth/me` | *none* | Current session identity |
| `POST` | `/auth/logout` | *none* | End dashboard session |
| `GET` | `/v1/federation` | *none* | Both agents' health in one call |
| `GET` | `/api/federation/context/:id` | *any* | Combined context (Andrew local + Will vector search) |
| `POST` | `/api/federation/search` | search:read | Proxy to Will's vector search |
| `GET` | `/api/federation/dashboard/human-messages` | *session* | Human chat messages (Andrew ↔ Will) |
| `GET` | `/api/federation/mcp-servers-remote` | mcp:proxy | List all MCP servers + tools (with schemas) |
| `POST` | `/api/federation/mcp-proxy-remote` | mcp:proxy | Invoke any MCP tool (69 tools, 6 servers) |

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

**Note:** `runFederationQuery('low_hanging_fruit')` returns cached bulk data (fast, shared cache, 5 min TTL). `getLowHangingFruit({ exclude_triaged_days: 7 })` returns fresh data with triage deduplication (no cache, supports exclusion filter). Use `getLowHangingFruit()` for the triage workflow; use federation queries for analytics and bulk reads.

### Domain Context & Related PRs

```javascript
// Get domain context for a PR (files touched, related areas)
const ctx = await client.getDomainContext(prId);

// Get related merged PRs from Andrew's local pgvector index
const related = await client.getRelatedMerged(prId);
// Returns PRs with similarity scores — the local analogue of your /v1/search/context

// Get stacked PRs (dependent PR chains)
const stacked = await client.getStackedPRs(prId);

// Get reviews for a PR
const reviews = await client.getReviews(prId);

// Get contributor stats
const contributors = await client.getContributors({ limit: 20 });
```

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
| `prmanager-client.js` | HTTP client SDK (xAI + QwQ + federation + triage + messaging) |
| `openapi-spec.yaml` | Full OpenAPI 3.0 spec |
| `README.md` | Setup guide |
| `.env.example` | Config template |
| `examples/triage.js` | Basic connectivity test |
| `examples/daily-triage.js` | Full triage workflow (pick, sync, report) |
| `examples/messages.js` | Messaging example |
| `examples/grok-proxy.js` | Grok/xAI proxy usage example |
| `examples/mcp-proxy.js` | MCP remote proxy test (69 tools, 6 servers) |
| `SPEC.md` | Full platform specification |
| `SECURITY-CHEAT-SHEET.md` | Auth, scopes, QwQ findings, threat model |
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
- [ ] Wire `prmanager-client.js` SDK into GH Search Tool server for automatic API calls
- [ ] Implement `/v1/triage` endpoint (calls getLowHangingFruit → pickPR → syncBotComments → triagePR → sendMessage → unpickPR)
- [ ] Expose `POST /v1/triage/trigger` so Andrew's agent can kick off triage on demand
- [ ] Send triage completion messages via `client.sendMessage('andrew', ...)`
- [ ] Implement heartbeat pings (see Outstanding Enhancements #8)
- [ ] Add `/v1/stats` endpoint for search index metadata (see #13)
- [ ] Add `error_code` + `retryable` fields to error responses (see #15)
- [ ] Add async 202 Accepted support for slow queries (see #16)
- [ ] Complete federated query pipeline (Will's side - bulk queries against each other's datasets)
- [ ] Test QwQ-32B proxy for PR red-team analysis (`client.qwqChat(...)`)
- [ ] Test Grok x_search proxy for X/Twitter live search (`client.grokChat(...)`)
- [ ] Log into dashboard with GitHub PAT at `https://andy.taild3619e.ts.net/`
- [ ] Drop PR preflight skill into Codex workspace as CLAUDE.md or system instructions

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

### Human Chat (Andrew ↔ Will Direct Messages)

The Federation Control Room now has a third panel for human-to-human messaging. Bot messages stay in their respective panels (Andrew Inbox, Will Tasks), while human chat lives in its own conversation view.

**How it works:**
- Messages use `message_type: 'human'` in the same `agent_messages` table
- Bot messages use other types (`info`, `request`, `code_task`, etc.) and stay separate
- The chat panel shows messages chronologically with chat-bubble styling
- A consolidated "Bot Traffic" accordion shows all recent bot messages in one timeline

**Will's dashboard login:**
1. Navigate to `https://andy.taild3619e.ts.net/federation`
2. You'll see the auth wall (you're not on localhost)
3. Log in with your GitHub PAT via `POST /auth/login` (the auth page has instructions)
4. After login, you're identified as `will` (server maps GitHub username `sparkyrider` → `will`)
5. Messages you send from the dashboard are tagged `from_agent = 'will'`

**SDK methods for programmatic access:**
```javascript
// Send a human chat message
await client.sendHumanMessage('andrew', 'Hey, PR #33608 looks ready');

// Fetch human chat history
const chat = await client.getHumanMessages({ limit: 50 });
// Returns { messages: [...], count: N }
```

**API endpoint:**
```
GET  /api/federation/dashboard/human-messages   Human chat messages (chronological)
```

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

## QwQ-32B Access (Uncensored Reasoning LLM)

Andrew's local QwQ-32B-abliterated (Qwen reasoning model, uncensored variant) is exposed through the PRmanager API. Same token, same base URL. Running on an RTX 4090 via llama.cpp.

- 32.7B params, Q4_K_M quantisation
- No content filters, no refusals - designed for adversarial red-team analysis
- Chain-of-thought reasoning (wraps thinking in `<think>` tags)

### Endpoints

```
POST /api/qwq/v1/chat/completions   Chat completions (OpenAI-compatible format)
GET  /api/qwq/v1/models             List available models
GET  /api/qwq/health                Health check
```

### SDK Usage

```javascript
// Quick chat (convenience wrapper)
const review = await client.qwqChat(
  `Review this PR diff for security issues:\n\n${prDiff}`,
  { system: 'You are a brutally honest code reviewer. No sugarcoating.', temperature: 0.4 }
);

// Raw API call
const resp = await client.qwq('/v1/chat/completions', {
  messages: [
    { role: 'system', content: 'You are a code reviewer.' },
    { role: 'user', content: 'Review this function...' }
  ],
  temperature: 0.4,
  max_tokens: 2048,
  stream: false,
});
const text = resp?.choices?.[0]?.message?.content
  || resp?.choices?.[0]?.message?.reasoning_content;
```

### Quirks (IMPORTANT)

| Quirk | Detail |
|-------|--------|
| `max_tokens` minimum | Set to >= 1200. Internal reasoning tokens count against budget. Too low = empty visible response |
| Empty content | If `choices[0].message.content` is empty, check `reasoning_content` instead |
| Temperature | 0.3-0.5 for analysis. Higher values make reasoning erratic |
| Context window | 8192 tokens. Keep prompts under 6K to leave room for response |
| Rate limit | 15 requests/minute (single GPU, not a cluster) |

### Use Cases for Your Agent

- Red-team code review (adversarial, no sugarcoating)
- PR risk assessment (will this break things?)
- Security audit on diffs
- Uncensored analysis of contentious PRs where polite models hedge
- Second opinion on merge decisions

---

## Dashboard Login (GitHub PAT Auth)

Will can log into the PRmanager dashboard directly in a browser. No shared passwords - you bring your own GitHub Personal Access Token.

### URL

```
https://andy.taild3619e.ts.net/
```

### How to Log In (Browser)

1. Generate a GitHub PAT at `https://github.com/settings/tokens` - fine-grained token, `read:user` scope only
2. Open `https://andy.taild3619e.ts.net/` in browser
3. Click "Login" button in the header (top right)
4. Paste your PAT into the modal
5. Click "Verify & Log in"

Your PAT is used ONCE to verify identity via `api.github.com/user`, then discarded. Never stored in DB or logs. The server creates an HttpOnly session cookie (`prm_session`, 7-day expiry).

### Programmatic Login (For Your Codex or GH Search Tool Server)

```javascript
// Login
const resp = await fetch('https://andy.taild3619e.ts.net/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'ghp_your_github_pat_here' }),
});
// Response sets Set-Cookie: prm_session=<random-64-char-hex>; HttpOnly; Secure; SameSite=Lax

// Check session
const me = await fetch('https://andy.taild3619e.ts.net/auth/me', {
  headers: { Cookie: 'prm_session=<session_token>' },
});
// Returns: { user: { github_login, display_name, avatar_url, scopes } }

// Logout
await fetch('https://andy.taild3619e.ts.net/auth/logout', {
  method: 'POST',
  headers: { Cookie: 'prm_session=<session_token>' },
});
```

### What Dashboard Shows (read-only)

- Overview dashboard (4,929+ open PRs, velocity charts, coverage stats)
- Pull Requests list with filters
- Issues list
- Maintainers rankings, Contributors stats
- Queues (ready-to-merge, action-state)
- Clusters (duplicate detection)

Write operations (pick/unpick PRs, sync bots, start CI, send messages, trigger sync) still require the Bearer token via API.

### Security Notes

- PAT verified once then discarded (never stored)
- Session cookie: HttpOnly, Secure, SameSite=Lax
- Sessions expire after 7 days
- All login attempts audit-logged (IP, user agent, success/fail)
- You can revoke your PAT immediately after login - session still works
- Your existing federation Bearer token is completely separate and unchanged

---

## Federation: Bidirectional (LIVE)

Both agents now call each other. Verified via Tailscale, both directions.

### Andrew → Will (Andrew calls Will's endpoints)

```
POST https://macbookpro.tailef02e2.ts.net/v1/search/context   Vector search
GET  https://macbookpro.tailef02e2.ts.net/v1/health            Health check
GET  https://macbookpro.tailef02e2.ts.net/v1/stats             Search index stats (pending)
```

### Will → Andrew (Will calls Andrew's endpoints)

```
GET/POST https://andy.taild3619e.ts.net/api/*   All 29+ endpoints (your existing token)
```

### New Federation Endpoints on Andrew's Side

```
GET  /v1/federation                 Health status of both agents (public, no auth)
GET  /api/federation/context/:id    Combined context: Andrew's local embeddings + Will's vector search
POST /api/federation/search         Proxy to Will's search (uses search:read scope)
```

### What Will Needs to Wire Up Now

1. **Import `prmanager-client.js` SDK** into your GH Search Tool server - it's ready to use
2. **Implement `/v1/triage`** endpoint that runs the full daily-triage workflow (see daily-triage.js example)
3. **Expose `/v1/triage/trigger`** so Andrew's agent can kick off triage on demand
4. **Send completion messages** via the message bus when triage completes

---

## MCP Proxy Pool (New — 2026-03-12)

Andrew's PRmanager now exposes **6 MCP servers with 69 tools** through a single HTTP proxy endpoint. Any federation node can call any tool on any server.

### Endpoint

```
POST /api/federation/mcp-proxy
Content-Type: application/json

{
  "server": "SERVER_NAME",
  "tool": "TOOL_NAME",
  "args": { ... }
}
```

**No auth required** (LAN-only, `requireLan` middleware). Accessible from `http://192.168.0.36:3099/api/federation/mcp-proxy`.

### Available Servers

| Server | Tools | What It Does |
|--------|-------|-------------|
| `hermes-unified` | 6 | Multi-model AI chat (OpenAI, Anthropic, Grok, Gemini), semantic search, Obsidian vault |
| `hermes-agentic` | 7 | Agentic queries with 4-model consensus, autonomous planning, reflection |
| `titan-agentic` | 4 | Agent execution, memory, training, async jobs |
| `pantheon` | 13 | Council deliberation, routing, memory, budget, model weights, feedback, learning |
| `google-deep-research` | 24 | Deep research, recursive research, guided templates, YouTube transcripts, architect agent |
| `brutal-mcp` | 11 | QwQ-32B adversarial analysis: code review, decisions, strategy, claims, CVs, career advice |

### Quick Examples

```bash
# Check brutal LLM status
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"brutal_status","args":{}}'

# Ask QwQ-32B a career question
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"brutal_career_advice","args":{"question":"What makes a good open-source contributor?"}}'

# Red-team a code snippet
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"brutal_redteam_code","args":{"code":"function auth(token) { return token === SECRET; }","context":"production auth handler"}}'

# Pantheon council deliberation
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_council","args":{"query":"Should we add WebSocket support to the federation?","mode":"async"}}'

# Deep research
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"google-deep-research","tool":"deep_research","args":{"topic":"MCP protocol best practices 2026"}}'

# List all tools on a server
curl -s http://192.168.0.36:3099/api/federation/mcp-servers
```

### Brutal-MCP Tools (QwQ-32B)

| Tool | Use For | Verdict Scale |
|------|---------|---------------|
| `brutal_status` | Health check (fast, 10s timeout) | - |
| `brutal_career_advice` | Career questions, no sugar-coating | Free-form |
| `brutal_score_text` | Assess job description | Deal-breakers + rejection probability |
| `brutal_cv_reality_check` | Quick CV vs JD gap analysis | Recruiter's honest take |
| `brutal_redteam_code` | Adversarial code review (quick/standard/deep) | SHIP_IT / SHIP_WITH_FIXES / MAJOR_REFACTOR / REWRITE |
| `brutal_redteam_decision` | Red-team life decisions | PROCEED / PAUSE / ABORT |
| `brutal_redteam_strategy` | Red-team business strategy | STRONG_PROCEED / PIVOT / FUNDAMENTAL_FLAW / ABORT |
| `brutal_redteam_claim` | Stress-test arguments/beliefs | VALIDATED / FLAWED / INVALID |
| `brutal_redteam_cv` | Deep CV vs JD red-team (5-phase) | STRONG_MATCH / TAILOR / LONG_SHOT / DO_NOT_APPLY |
| `brutal_assess_job` | Full 4-phase assessment (needs DB job ID) | - |
| `brutal_top_jobs` | Batch assess top unscored jobs | - |

### Rate Limits & Timeouts

- **General MCP tools**: 30 req/min
- **brutal-mcp**: 4 req/min (QwQ-32B is slow, single GPU)
- **Concurrency**: 1 brutal call at a time, queue max 3 (returns 503 if full)
- **Timeouts**: 10s for status, 120-180s for inference tools
- **Response format**: `{ ok: true, server, tool, result: { content: [{ type: "text", text: "..." }] } }`

### Stale Command Cleanup

```bash
# Delete pending commands older than 5 minutes
curl -s -X POST http://192.168.0.36:3099/api/federation/commands/cleanup \
  -H 'Content-Type: application/json' \
  -d '{"maxAgeMinutes": 5}'
```

### Dashboard Status

The federation dashboard now shows:
- **QwQ-32B status bar**: online/offline, in-flight inference, queue depth
- **MCP proxy info**: 6 servers, active connections count
- **Clear Stale button**: removes old pending commands from the Federation Commands panel

---

## MCP Remote Proxy (New - 2026-03-12, Authenticated HTTPS Access)

The LAN-only MCP proxy (`/api/federation/mcp-proxy`) requires being on Andy's local network. The **remote MCP proxy** gives you authenticated access to all 69 tools over HTTPS from anywhere.

### Endpoints

```
GET  /api/federation/mcp-servers-remote    List all servers + tools (with schemas)
POST /api/federation/mcp-proxy-remote      Invoke any tool on any server
```

Both require `Authorization: Bearer <token>` with `mcp:proxy` scope (your token already has it).

### SDK Methods (in prmanager-client.js)

```javascript
// List all available MCP tools (grouped by server)
const catalog = await client.mcpListTools();
// Returns: { ok: true, servers: { "brutal-mcp": { status: "available", tools: [...] }, ... } }

// Invoke any tool on any server
const result = await client.mcpInvoke('brutal-mcp', 'brutal_redteam_code', {
  code: 'function auth(t) { return t === SECRET; }',
  context: 'auth handler',
  depth: 'quick',
});
// Returns: { ok: true, server, tool, result: { content: [{ type: "text", text: "..." }] } }

// Convenience: brutal code review (returns text directly)
const verdict = await client.brutalCodeReview(codeString, 'production auth', 'quick');

// Convenience: Pantheon council deliberation
const council = await client.pantheonCouncil('Should we add WebSocket to the federation?');

// Convenience: Pantheon query (auto-routed)
const answer = await client.pantheonQuery('What are the best practices for API rate limiting?');
```

### curl Examples (Remote, Over HTTPS)

```bash
TOKEN="$PRMANAGER_TOKEN"
BASE="https://andy.taild3619e.ts.net"

# List all servers and tools
curl -s -H "Authorization: Bearer $TOKEN" $BASE/api/federation/mcp-servers-remote | jq '.servers | keys'

# Red-team a code snippet via QwQ-32B
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"server":"brutal-mcp","tool":"brutal_redteam_code","args":{"code":"if (user.role == \"admin\") grant();","depth":"quick"}}' \
  $BASE/api/federation/mcp-proxy-remote

# Pantheon council
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"server":"pantheon","tool":"pantheon_query","args":{"query":"Best embedding model for code search?"}}' \
  $BASE/api/federation/mcp-proxy-remote

# Deep research
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"server":"google-deep-research","tool":"quick_research","args":{"topic":"pgvector vs Pinecone for 600K docs"}}' \
  $BASE/api/federation/mcp-proxy-remote
```

### Rate Limits

- **Remote MCP proxy**: 20 requests/minute per agent (separate from LAN limit)
- **brutal-mcp**: still 4 req/min (GPU bottleneck), 1 concurrent, queue max 3
- **All other servers**: effectively unlimited within the 20/min envelope

### Key Difference from LAN Proxy

| | LAN Proxy | Remote Proxy |
|---|-----------|-------------|
| **Endpoint** | `/api/federation/mcp-proxy` | `/api/federation/mcp-proxy-remote` |
| **Auth** | `requireLan` (IP allowlist) | `requireScope('mcp:proxy')` (Bearer token) |
| **Access** | Same LAN only (192.168.x.x) | Anywhere over HTTPS |
| **Rate limit** | 30 req/min | 20 req/min |
| **Audit** | Logged | Logged (with agent_id) |

---

## X/Twitter Search Tools

Two versions of the x-search skill are available.

### x-search-skill-codex (Codex-adapted version)

For Codex's sandboxed environment (no internet). Uses a pre-fetch + cache pattern:

| File | Purpose |
|------|---------|
| `SKILL.md` | Setup guide, workflow, AGENTS.md snippet to paste into repo |
| `scripts/fetch_x_search.py` | Run locally (has internet) to cache search results to JSON |

**How it works:**
1. Run `python fetch_x_search.py "query"` on your machine (has internet) - saves `x_search_cache.json`
2. Upload that JSON alongside your Codex task
3. Add the AGENTS.md snippet so Codex knows to read the cache
4. Codex analyses the cached data (no internet needed)

**Key features:**
- Supports multi-query batch fetching in one run
- Appends to existing cache (run it multiple times to build up queries)
- Includes staleness metadata so Codex knows how fresh the data is
- No personal paths anywhere - just `~/keys.txt` or `XAI_API_KEY` env var

### Grok x_search via PRmanager Proxy

Your agent can also access X/Twitter search through Andrew's proxy endpoint:

```javascript
const resp = await client.xai('/v1/responses', {
  model: 'grok-4-1-fast',
  input: [{ role: 'user', content: 'What are people saying about openclaw?' }],
  tools: [{ type: 'x_search' }],
  max_output_tokens: 2048,
});
```

This uses Andrew's xAI API key - you don't need your own.

---

## PR Preflight Skill for OpenClaw

A self-contained PR preflight checklist is available for Will's Codex. Drop it into your Codex workspace as `CLAUDE.md` or system instructions. It covers:

- **Commit rules** with `Co-Authored-By: sparkyrider <Will@willthings.com>` trailer (mandatory)
- **Anti-AI detection markers** (what to never include in commits/PR text)
- **All three review bot profiles** (barnacle, greptile, codex-connector) with accuracy stats and engagement rules
- **Full pre-flight checklist** (10 sections: gate check, branch hygiene, type safety, security, behavioural correctness, tests, formatting, Docker/CI, imports, CHANGELOG)
- **Pre-push script** (runs all checks in sequence)
- **PR description template** (OpenClaw standard format)
- **Bot reply strategy** (how to respond to each bot)
- **Reviewer targeting** and pickup factors (ranked by weight)
- **Build/test commands** (`pnpm tsgo`, `pnpm check`, `pnpm test`, etc.)
- **Fork PR gotchas** (secrets job failure, force push, retrigger CI)

File: `openclaw-pr-preflight-for-codex.md` (available via Discord or repo)

---

## Will's Pipeline: Federated Queries (In Progress)

Will is working on federated queries from his end - predefined queries that either agent can run against each other's datasets. This should provide:

- Bulk data retrieval faster than individual API calls
- Solve the vector dimension mismatch (no direct vector queries needed)
- Allow Will's LLM to get bulk data when needed

**Status:** In progress on Will's side. He'll send materials once further along, and will have his bot reconnect to test.

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
