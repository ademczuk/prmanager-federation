# PRmanager — Will's Agent Access (GH Search Tool Integration)

Shared API access to PRmanager's PR intelligence platform for openclaw/openclaw.

## Setup

1. Copy `.env.example` to `.env`
2. Set `PRMANAGER_URL=https://prmanager.example.net`
3. Set `PRMANAGER_TOKEN` to the raw token Andrew shares with you
4. Run `node examples/triage.js` to verify connectivity
5. Run `node examples/daily-triage.js` for a full triage cycle

## How Auth Works

Standard API key pattern (same as Stripe, GitHub, etc.):

1. Andrew generates a random token and shares it with you securely
2. Your agent sends the raw token as `Authorization: Bearer <token>` over TLS
3. The server hashes it on receipt (`SHA-256`) and looks up the hash in `agent_tokens`
4. Raw tokens are never stored — only hashes exist in the database

```
Your Codex agent:  reads PRMANAGER_TOKEN from env
HTTP header:       Authorization: Bearer <your-token>
Server:            SHA-256("<your-token>") → looks up hash in DB
```

## Quick Start

```javascript
import { PRManagerClient } from './prmanager-client.js';

const client = new PRManagerClient(process.env.PRMANAGER_URL, process.env.PRMANAGER_TOKEN);

// Check identity
const me = await client.whoami();

// Find low-hanging fruit PRs
const lhf = await client.getLowHangingFruit({ limit: 5 });

// Pick a PR for triage
await client.pickPR(33608);

// Sync and triage bot comments
await client.syncBotComments(33608);
const triage = await client.getBotTriage(33608);

// Classify a bot comment
await client.classifyBotComment(commentId, 'false_positive');

// Check merge readiness
const ready = await client.getReadyToMerge({ limit: 10 });

// Report to Andrew
await client.sendMessage('andrew', 'Triage complete', {
  picked: [33608], merge_ready: ready.count,
});

// Release the PR when done
await client.unpickPR(33608);

// Trigger a GitHub data sync
await client.triggerSync();
```

## Available Endpoints

### Read Operations

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/v1/health` | *none* | Server health (no auth required) |
| GET | `/api/agent/me` | *any* | Your identity + scopes |
| GET | `/api/prs` | prs:read | List PRs (filters: state, category, author, sort) |
| GET | `/api/prs/:id` | prs:read | PR details |
| GET | `/api/prs/search?q=` | search:read | Full-text search |
| GET | `/api/issues` | issues:read | List issues |
| GET | `/api/stats` | stats:read | Dashboard statistics |
| GET | `/api/low-hanging-fruit` | prs:read | Scored PRs for easy wins |
| GET | `/api/alerts` | stats:read | Active alerts |
| GET | `/api/reviews/:pr` | prs:read | PR reviews |
| GET | `/api/queues/ready-to-merge` | prs:read | Merge-ready PRs |
| GET | `/api/queues/action-state` | prs:read | Segmented action queues |
| GET | `/api/maintainers` | maintainers:read | Maintainer rankings |
| GET | `/api/contributors` | stats:read | Contributor stats |
| GET | `/api/prs/:id/checks` | ci:read | CI check snapshots |
| GET | `/api/bot-review/comments/:pr` | ci:read | Bot review comments |
| GET | `/api/bot-review/triage/:pr` | ci:read | Bot triage recommendations |
| GET | `/api/sync/status` | *any* | Check sync progress |
| GET | `/api/agent/messages` | messages:read | Unread messages |

### Write Operations

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| POST | `/api/pick/:id` | prs:write | Claim a PR for triage |
| DELETE | `/api/pick/:id` | prs:write | Release a claimed PR |
| PUT | `/api/alerts/:id/resolve` | prs:write | Resolve an alert |
| POST | `/api/bot-review/sync/:pr` | ci:write | Sync bot comments from GitHub |
| PUT | `/api/bot-review/classify/:id` | ci:write | Classify a bot comment |
| POST | `/api/pr-test/:id/start` | ci:write | Start a PR test run |
| DELETE | `/api/pr-test/:id/cancel` | ci:write | Cancel a PR test run |
| POST | `/api/sync/trigger` | sync:trigger | Trigger GitHub data sync |
| POST | `/api/agent/messages` | messages:write | Send a message |
| PUT | `/api/agent/messages/:id/read` | messages:read | Mark message read |

## Examples

```bash
node examples/triage.js         # Basic connectivity test
node examples/daily-triage.js   # Full triage: find, pick, sync, report
node examples/messages.js       # Send/receive agent messages
node examples/grok-proxy.js     # Use Grok (x.ai) through the proxy
```

## Your Scopes

`prs:read`, `issues:read`, `search:read`, `stats:read`, `ci:read`, `ci:write`, `maintainers:read`, `messages:read`, `messages:write`, `prs:write`, `sync:trigger`, `xai:proxy`

You can read all data, pick/release PRs, sync and classify bot comments, start CI tests, trigger syncs, send messages, and use the x.ai (Grok) proxy. Admin operations (token management, integrations) are not in your scope.

## x.ai Proxy (Grok Access)

Your agent can use Grok models through PRmanager's proxy — no x.ai API key needed.
The proxy authenticates your token, then forwards requests to x.ai with Andrew's key.

```javascript
// Quick chat
const reply = await client.grokChat('Summarize PR #33608', {
  model: 'grok-3-mini',
  max_tokens: 200,
});

// Raw API call (any x.ai endpoint)
const resp = await client.xai('/v1/chat/completions', {
  model: 'grok-3',
  messages: [{ role: 'user', content: 'Your prompt' }],
});

// List available models
const models = await client.xaiModels();
```
