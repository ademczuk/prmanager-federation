# PRmanager x GH Search Tool — Shared Platform Specification

**Date:** 2026-03-05
**Authors:** Andrew (PRmanager) + Will (@sparkyrider, GH Search Tool)
**Status:** Draft — reconciled against actual codebase

---

## 1. Problem Statement

Andrew and Will both build PR intelligence tools for `openclaw/openclaw`. They use different AI agents (Claude Code / Codex GPT-5.4) and currently relay findings between Claude Desktop sessions via manual copy-paste. This is slow, error-prone, and defeats the purpose of having AI agents.

**Goal:** Their agents talk directly over the internet. No human clipboard relay.

---

## 2. Critical Corrections (Plan vs Reality)

The original implementation plan (`pr-manager-implementation-plan.md`) was co-authored by Claude Desktop **without access to the actual codebase**. It describes a TypeScript monorepo that does not exist.

| Plan References | Actual Location | Status |
|----------------|-----------------|--------|
| `packages/github/src/sync.ts` | `dashboard/src/github-sync.js` | Exists (JS, not TS) |
| `packages/search/src/scoring.ts` | Inline in `mcp-server.js` (L1438, L2100) | Exists (different shape) |
| `packages/search/src/service.ts` | Inline in `mcp-server.js` (L235+) | Exists (different shape) |
| `apps/web/app/insights/page.tsx` | Does not exist | No Next.js app |
| `packages/db/migrations/0002_raw_capture.sql` | `dashboard/supabase/migrations/` (20 files) | Different naming |
| `apps/worker/src/main.ts` | `dashboard/src/github-sync.js` (adaptive setTimeout) | No separate worker |
| `apps/web/lib/auth.ts` | `dashboard/src/auth-gateway.js` | Exists (built today) |

**The plan's functional goals are valid. Its file paths are fiction.**

### Phase Status Against Actual Codebase

| Phase | Plan Says | Reality |
|-------|-----------|---------|
| **1. MCP Surface** | Build 6 tools | **DONE** — 68+ tools already exist |
| **2. PR Operational Signals** | Add reviewer_load, review_latency, merge_blocker, SLA | **NOT BUILT** — the real gap |
| **3. Auth + Job Queue** | Durable queue + scoped tokens | Auth: **DONE** (auth-gateway.js). Queue: **NOT BUILT** |
| **4. Workflow Definitions** | Triage, routing, blocker, stale rescue | **PARTIAL** — batch_triage, nominate_reviewer exist |
| **5. Observability** | Dashboard metrics | **PARTIAL** — briefing tool exists, no dead-letter dashboard |
| **6. Federation** | ARP transport over internet | **SCAFFOLDED** — agent_tokens + message bus in DB, no transport |

---

## 3. Architecture Decision: GitHub for Merges?

**Consensus across 3 AI models (Titan, Codex, Claude): NO shared repo. Two repos + federation.**

| Option | Verdict | Why |
|--------|---------|-----|
| Single shared repo | Reject | Merge conflicts inevitable, different LLM agents interfere with each other's config |
| Two repos + API contract | **Recommended** | Maximum autonomy, clean API boundaries, each agent has isolated sandbox |
| Monorepo with packages | Premature | Tooling overhead (Turborepo/Nx) unjustified until shared code reaches critical mass |

**What IS needed on GitHub:**
- PRmanager should be its own repo (currently has NO git at all)
- Will's GH Search Tool stays in its own repo
- A tiny shared protocol package (types, schemas) can live in a third repo if/when needed
- Collaboration happens at **API boundaries**, not shared mutable state

---

## 4. Identity: "Reason Layer" Reassessment

**Consensus across all models: The SHA-256 hash-of-API-key concept is obfuscation, not security.**

### Problems Identified

1. **Static hash is replayable** — no nonce/challenge means anyone who intercepts the hash can impersonate the agent forever
2. **LLM is not a secure enclave** — the raw key exists in plaintext in the provider's memory, API logs, and potentially training data
3. **Hash becomes the credential** — if `identity = SHA-256(key)`, then the hash itself IS the secret, but it's transmitted openly
4. **No non-repudiation** — anyone with the hash can claim to be that agent

### What We Built (Still Usable)

The `agent_tokens` table and `auth-gateway.js` we built today are still sound infrastructure — the token lookup, scope enforcement, audit logging, and rate limiting are all correct. The issue is only with the *generation* and *transmission* model.

### Recommended Fix Path

| Now (What We Have) | Next (Proper Auth) |
|--------------------|--------------------|
| Random 32-byte token, SHA-256 hash stored | Same — this is fine |
| Bearer token transmitted as hash | Bearer token transmitted as raw token (over TLS) |
| No challenge-response | Add HMAC-signed requests with server nonce |
| LLM holds secret in context | Move secret to environment variable, LLM never sees it |

**The simplest fix:** Don't hash the token at all. Generate a random token, store its hash in the DB, transmit the raw token over HTTPS. The server hashes on receipt to look up. This is the standard API key pattern (Stripe, GitHub, etc.). The auth-gateway.js code already does this correctly — the `Authorization: Bearer <token>` arrives, we just need to hash it server-side before lookup rather than expecting a pre-hashed value.

---

## 5. What Each System Brings

### PRmanager (Andrew)

| Capability | Scale | Tool |
|-----------|-------|------|
| PR listing + filtering | 4,705 open PRs | `prmanager_list_prs` |
| Full-text search | trgm + GIN indexes | `prmanager_search` |
| Merge readiness scoring | Composite score | `prmanager_pr_health` |
| Low-hanging fruit detection | Weighted signals | `prmanager_low_hanging_fruit` |
| CI check tracking | Per-PR snapshots | `prmanager_ci_checks` |
| Bot comment triage | barnacle/greptile/codex | `prmanager_batch_triage` |
| Reviewer nomination | By file path expertise | `prmanager_nominate_reviewer_by_files` |
| Stacked PR detection | Chain analysis | `prmanager_stacked_prs` |
| Gamification | XP, achievements, leaderboard | 10 gamification tools |
| Semantic search | pgvector 768-dim (Gemini) | `prmanager_semantic_search` |
| Agent messaging | PostgreSQL bus | `prmanager_agent_send_message` |

### GH Search Tool (Will)

| Capability | Scale |
|-----------|-------|
| Issue coverage | 5,139 issues |
| PR coverage | 6,265 PRs |
| Comment coverage | 20,485 comments |
| Vector search | pgvector 1536-dim (OpenAI) |
| Search chunks | 63,853 |
| Full-text search | FTS GIN indexes |

### Complementary Strengths

- **Will wins on breadth** — 3x more data, more comprehensive coverage
- **Andrew wins on depth** — operational intelligence (merge readiness, CI, bots, gamification)
- **Will's differentiator:** "Search finds things" (vector similarity over large corpus)
- **Andrew's differentiator:** "We tell you what to do next" (triage, routing, workflows)

---

## 6. Minimum Viable Federation (The Real MVP)

### What to Build First

Per Codex's recommendation: **One direct HTTP workflow. PRmanager asks GH Search Tool for historical context.**

```
PRmanager sends:
  - repo: "openclaw/openclaw"
  - pr_number: 12345
  - changed_files: ["src/foo.ts", "src/bar.ts"]
  - title: "Fix authentication race condition"

GH Search Tool returns:
  - top 5 similar PRs (by vector similarity)
  - top 5 related issues
  - top 5 semantically similar commits/files
  - evidence summary
```

PRmanager stores the response and surfaces it in the PR triage workflow. This is the simplest thing that eliminates copy-paste and demonstrates cross-agent value.

### Protocol Contract

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
    "files": ["src/foo.ts", "src/bar.ts"]
  },
  "top_k": 5,
  "deadline_ms": 10000
}

Response:
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

GET /v1/health
→ { "status": "ok", "agent": "gh-search", "version": "1.0" }
```

### Auth: HMAC (Not Hashed API Keys)

```
Authorization: Bearer <random-token>
X-Timestamp: <unix-ms>
X-Signature: HMAC-SHA256(shared_secret, timestamp + request_body)
```

Server validates: timestamp within 5 minutes, HMAC matches, token exists in DB.

### Transport

- HTTPS JSON over Tailscale Funnel (Andrew: `https://prmanager.example.net`) / any hosting (Will)
- Sync if response < 10s, otherwise `202 Accepted` + callback
- Idempotency via `request_id` (dedupe for 15 minutes)
- Timeouts: caller 12s, worker hard 60s

---

## 7. What We Built Today (Inventory)

### Files Created

| File | Purpose | Status |
|------|---------|--------|
| `PRmanager/dashboard/src/migrations/007-agent-federation.sql` | agent_tokens, agent_audit_log, agent_messages tables | Applied to DB |
| `PRmanager/dashboard/src/auth-gateway.js` | Multi-mode auth middleware (Bearer + x-api-key + dev) | Complete |
| `PRmanager/dashboard/scripts/create-agent-token.js` | Token generation CLI | Complete, tokens created |
| `Wil/prmanager-client.js` | HTTP client SDK for Will's Codex agent | Complete |
| `Wil/README.md` | Setup guide for Will | Complete |
| `Wil/.env.example` | Configuration template | Complete |
| `Wil/examples/triage.js` | Daily triage example | Complete |
| `Wil/examples/messages.js` | Messaging example | Complete |
| `Wil/openapi-spec.yaml` | OpenAPI 3.0 spec for all endpoints | Complete |

### Files Modified

| File | Change |
|------|--------|
| `PRmanager/dashboard/src/api-server.js` | Auth middleware replaced, CORS expanded, 6 new endpoints, scope enforcement on 13 write routes, rate limiting |
| `PRmanager/dashboard/src/auth-gateway.js` | Fixed: now hashes incoming Bearer token server-side (standard API key pattern) |
| `PRmanager/dashboard/src/mcp-server.js` | 3 new message-bus tools |
| `PRmanager/dashboard/package.json` | Added express-rate-limit |
| `Wil/prmanager-client.js` | Fixed: sends raw token over TLS instead of client-side hashing |
| `Wil/README.md` | Fixed: replaced "reason layer" docs with standard API key pattern |

### Database State

| Table | Rows |
|-------|------|
| `agent_tokens` | 2 (andrew: admin, will: read/write collaborator) |
| `agent_audit_log` | 0 (ready for use) |
| `agent_messages` | 0 (ready for use) |

### Tokens Generated

| Agent | Scopes | Raw Token |
|-------|--------|-----------|
| andrew | admin | *(redacted — stored locally, shared out-of-band)* |
| will | prs:read, issues:read, search:read, stats:read, ci:read, ci:write, maintainers:read, messages:read, messages:write, prs:write, sync:trigger | *(redacted — shared with Will out-of-band)* |

> **Note:** Raw tokens must NEVER be committed to version control. Regenerate with `node scripts/create-agent-token.js` if compromised.

---

## 8. What Remains To Build

### Priority 1: Prerequisites

1. **Initialize git repo** for PRmanager — it currently has NO version control
2. ~~**Fix auth model**~~ — **DONE**: auth-gateway.js now hashes incoming Bearer tokens server-side (standard API key pattern). Client SDK sends raw token over TLS.
3. ~~**Restart API server**~~ — **DONE**: Server restarted with new auth, `/v1/health` endpoint added, SPA fallback added, bugs fixed.
4. ~~**Tailscale Funnel**~~ — **DONE**: Live at `https://prmanager.example.net` (port 3099). Tested end-to-end with Will's token.

### Priority 2: Cross-Agent MVP

5. **Will exposes `/v1/search/context`** on GH Search Tool (his side) — see `HANDOVER.md`
6. **PRmanager adds a client** to call Will's endpoint

### Priority 3: Product Gaps (Phase 2 from plan)

7. **Migration 008:** `reviewer_load`, `first_review_at`, `review_latency_hours`, `merge_blocker_reason`, `sla_breach_at`
8. **Sync extension** to capture operational signals from GitHub reviews + checks API
9. **`trigger_sync` MCP tool** — no tool currently lets an agent enqueue a sync

### Priority 4: Hardening

10. **Auth on MCP tools** — `mcp-server.js` has no token validation (any stdio caller gets full access)
11. **Durable job queue** (Phase 3 worker half) — only needed if sync reliability becomes a problem

---

## 9. Decision Log

| Decision | Chosen | Alternatives Rejected | Rationale |
|----------|--------|-----------------------|-----------|
| Repo strategy | Two separate repos | Shared repo, monorepo | Different LLM agents, competing tools, autonomy > coupling |
| Auth | Standard API key (raw over TLS) | SHA-256 hash-as-identity, Ed25519/ARP | Simplicity, industry standard, proper TLS |
| Transport | HTTPS JSON + Tailscale Funnel | Cloudflare Tunnel, ARP relay, Nostr, OpenClaw A2A | Tailscale already running w/ Funnel enabled; Cloudflare not installed; ARP not production-hardened |
| First workflow | PRmanager → GH Search Tool context query | Full message bus, agent autonomy | Minimal, proves value, no infrastructure |
| Merge strategy | Federation (API contracts) | Codebase merge | Tools complement, don't duplicate |

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **Reason Layer** | The concept that an LLM holds a secret and performs cryptographic operations in its context. Evaluated as obfuscation, not security. Replaced with standard API key auth. |
| **GH Search Tool** | Will's (@sparkyrider) PR intelligence tool — pgvector, OpenAI embeddings, 63K search chunks |
| **PRmanager** | Andrew's PR intelligence tool — 68+ MCP tools, PostgreSQL, Express API, gamification |
| **Federation** | Two independent systems communicating via API contracts, each owning their own data |
| **Agent Token** | Random 32-byte hex string used as API key. SHA-256 hash stored in DB, raw token transmitted over TLS. |
