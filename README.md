# PRmanager Federation

**Two AI agents. Two machines. One coordination layer.**

OpenClaw has 7,000+ open pull requests. That is not a code problem — agents already write code. It is a coordination problem. Every contributor's agent runs on their own machine with no visibility into anyone else.

PRmanager Federation bridges Andrew's Claude Code agent (merge-readiness scoring, bot comment triage, CI analysis) with Will Sparkman's Codex GPT-5.4 agent (63,000 indexed chunks, vector similarity search) over a standard HTTPS API. Neither agent was designed for the other. A 200-line client SDK and an auth gateway connected them after the fact.

The result: autonomous PR triage across two different LLMs on two different machines, with no human relaying between chat windows.

## How it works

```
Will's Codex agent                    Andrew's Claude agent
(pgvector, 63K chunks)                (80 MCP tools, PostgreSQL)
        |                                      |
        |   Authorization: Bearer <token>       |
        +------>  HTTPS / TLS 1.3  <------------+
                       |
              PRmanager API server
              (Tailscale Funnel)
```

- **Auth:** Bearer token over HTTPS. Same pattern as Stripe. Token is SHA-256 hashed server-side; raw token never stored.
- **Scopes:** 12 named permissions per agent. No admin scope for external agents.
- **Audit:** Every API call logged. Agents cannot tamper with the audit trail.
- **Rate limiting:** Per-agent, per-endpoint.

## What each agent brings

| Andrew's PRmanager (Claude Code) | Will's GH Search (Codex GPT-5.4) |
|--------------------------------|----------------------------------|
| Merge-readiness scoring (0-100) | Vector similarity search (1536-dim OpenAI embeddings) |
| Bot comment triage (barnacle, greptile, codex-bot) | 6,265 PRs, 5,139 issues, 20,485 comments indexed |
| CI status tracking, conflict detection | Semantic code search across the full repo |
| "What should we do next?" | "What has been done before?" |

Running both on the same PR from different angles catches things either would miss alone. That is the force multiplier: Will's search gives Andrew's triage context it could never generate, and Andrew's scoring gives Will's search a direction it never had. Not two tools side by side. Two tools making each other stronger.

## Red-teaming the coordination layer

A coordination system that moves bad decisions faster is worse than no system at all. QwQ-32B (32B params, locally hosted, abliterated) reviewed the auth gateway and found three flaws that Claude, GPT-4, and Gemini all missed:

1. **Unsalted SHA-256** — rainbow table recovers the token in minutes
2. **Timing side-channel** — `===` comparison leaks token bytes (~8,192 requests)
3. **Dev-mode auth bypass** — missing `NODE_ENV` silently disables auth

Verdict: **REWRITE**. All three are documented and on the fix list.

## Setup (for Will's agent)

1. Copy `.env.example` to `.env`
2. Set `PRMANAGER_URL=https://prmanager.example.net`
3. Set `PRMANAGER_TOKEN` to the raw token Andrew shares with you
4. Run `node examples/triage.js` to verify connectivity
5. Run `node examples/daily-triage.js` for a full triage cycle

## Quick start

```javascript
import { PRManagerClient } from './prmanager-client.js';

const client = new PRManagerClient(process.env.PRMANAGER_URL, process.env.PRMANAGER_TOKEN);

// Check identity
const me = await client.whoami();

// Find low-hanging fruit PRs (excluding recently triaged)
const lhf = await client.getLowHangingFruit({ limit: 5, exclude_triaged_days: 7 });

// Pick, sync bot comments, check CI
await client.pickPR(33608);
await client.syncBotComments(33608);
const triage = await client.getBotTriage(33608);

// Record triage and report
await client.triagePR(33608);
await client.sendMessage('andrew', 'Triage complete', { picked: [33608] });
await client.unpickPR(33608);
```

## API endpoints

### Read

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/v1/health` | *none* | Server health |
| GET | `/api/agent/me` | *any* | Your identity + scopes |
| GET | `/api/prs` | prs:read | List PRs (state, category, author, sort) |
| GET | `/api/prs/:id` | prs:read | PR details |
| GET | `/api/prs/search?q=` | search:read | Full-text search |
| GET | `/api/issues` | issues:read | List issues |
| GET | `/api/stats` | stats:read | Dashboard statistics |
| GET | `/api/low-hanging-fruit` | prs:read | Scored PRs for easy wins |
| GET | `/api/queues/ready-to-merge` | prs:read | Merge-ready PRs |
| GET | `/api/queues/action-state` | prs:read | Segmented action queues |
| GET | `/api/maintainers` | maintainers:read | Maintainer rankings |
| GET | `/api/prs/:id/checks` | ci:read | CI check snapshots |
| GET | `/api/bot-review/comments/:pr` | ci:read | Bot review comments |
| GET | `/api/bot-review/triage/:pr` | ci:read | Bot triage recommendations |
| GET | `/api/prs/triage-history` | prs:read | Query triage history |
| GET | `/api/agent/messages` | messages:read | Unread messages |

### Write

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| POST | `/api/pick/:id` | prs:write | Claim a PR for triage |
| DELETE | `/api/pick/:id` | prs:write | Release a claimed PR |
| POST | `/api/prs/:id/triage` | prs:write | Record persistent triage |
| POST | `/api/bot-review/sync/:pr` | ci:write | Sync bot comments from GitHub |
| PUT | `/api/bot-review/classify/:id` | ci:write | Classify a bot comment |
| POST | `/api/pr-test/:id/start` | ci:write | Start a PR test run |
| POST | `/api/sync/trigger` | sync:trigger | Trigger GitHub data sync |
| POST | `/api/agent/messages` | messages:write | Send a message |

## Examples

```bash
node examples/triage.js         # Basic connectivity + merge queue
node examples/daily-triage.js   # Full autonomous triage cycle
node examples/messages.js       # Cross-agent messaging
node examples/grok-proxy.js     # Use Grok (x.ai) through the proxy
```

## Presentation

Lightning talk "Don't Hack Me, Bro" at the Vienna AI Engineering Meetup (OpenClaw & Codex Night), March 10, 2026.

- [Live slides](https://ademczuk.github.io/prmanager-federation/presentation/slides.html)
- [Demo script](presentation/DEMO-SCRIPT.md)

## Merged PRs

Three PRs merged into openclaw/openclaw so far:
- [#32128](https://github.com/openclaw/openclaw/pull/32128) — Gateway routing
- [#32183](https://github.com/openclaw/openclaw/pull/32183) — Test infrastructure
- [#32311](https://github.com/openclaw/openclaw/pull/32311) — Webchat

## Scopes

Will's token: `prs:read`, `prs:write`, `ci:read`, `ci:write`, `search:read`, `stats:read`, `maintainers:read`, `messages:read`, `messages:write`, `issues:read`, `sync:trigger`, `xai:proxy`

## x.ai proxy

Will's agent can use Grok models through PRmanager's proxy without needing an x.ai API key. Rate-limited to 30 requests/minute.

```javascript
const reply = await client.grokChat('Summarize PR #33608', { model: 'grok-3-mini' });
```

## Docs

| File | What |
|------|------|
| `SPEC.md` | Full platform specification |
| `HANDOVER.md` | Federation handover for Will's agent |
| `SECURITY-CHEAT-SHEET.md` | Auth, scopes, QwQ findings, threat model |
| `openapi-spec.yaml` | OpenAPI 3.0 spec |
| `prmanager-client.js` | HTTP client SDK |
