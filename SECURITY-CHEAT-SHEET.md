# Security Cheat Sheet — Print This

**For:** Andrew Demczuk
**Context:** Screening call + Q&A at Vienna AI Engineering Meetup, March 10, 2026
**Audience:** Bogdan Pirvu (PhD theoretical physics, Head of Data & Analytics at NOVOMATIC AG)

Bogdan will probe. He has the background. Keep answers precise. Do not oversell the security posture. Honest about threat model.

---

## 1. Authentication

| Question | Answer |
|----------|--------|
| How do agents authenticate? | Bearer token over HTTPS. Same pattern as Stripe and GitHub APIs. |
| Token format? | Random 32-byte hex string. 256 bits of entropy. |
| Where is the token stored? | Environment variable (`PRMANAGER_TOKEN`). The LLM never sees the raw token. |
| How is the token verified? | Server hashes the incoming token with SHA-256, looks up the hash in PostgreSQL. |
| Does the database store the raw token? | No. Only the SHA-256 hash. If the DB leaks, attackers get hashes, not tokens. |
| Why not have the LLM hash client-side? | We asked three models. All agreed: an LLM is not a secure enclave. It cannot reliably hold a secret. The environment variable approach keeps the token outside the LLM context. |
| Token rotation? | `node scripts/create-agent-token.js`. Old hash becomes invalid immediately. Lookup is by hash, not agent ID. |

---

## 2. Authorisation (Scopes)

| Question | Answer |
|----------|--------|
| What stops a rogue agent? | Scope-based permissions. Each token has a list of allowed scopes. Each endpoint requires a specific scope. No scope = 403. |
| Will's scopes? | 12: `prs:read`, `prs:write`, `ci:read`, `ci:write`, `search:read`, `stats:read`, `maintainers:read`, `messages:read`, `messages:write`, `issues:read`, `sync:trigger`, `xai:proxy` |
| Can Will create new tokens? | No. No `admin` scope. Only Andrew can create/revoke tokens. |
| Can Will delete data? | No. `prs:write` lets him pick/unpick PRs and record triage. No destructive operations exposed. |
| Rate limiting? | Per-agent, per-endpoint. 30 req/min on x.ai proxy. Higher on read endpoints. |

---

## 3. Audit Trail

| Question | Answer |
|----------|--------|
| What gets logged? | Every API call. `agent_audit_log` table: timestamp, agent_id, endpoint, method, IP, response code. |
| Can an agent tamper with the log? | No. Agents have no write access to the audit table. Logging is server-side, not client-reported. |
| How long are logs kept? | Indefinitely for now. No PII in the audit trail (just agent IDs and endpoints). |

---

## 4. Transport Security

| Question | Answer |
|----------|--------|
| What carries the traffic? | Tailscale Funnel. TLS 1.3 end-to-end. Tailscale manages the certificates. |
| Where does TLS terminate? | On my machine. Not at an edge proxy. Tailscale never sees plaintext payload. |
| Is TLS enough? | For two devs sharing PR data on a volunteer project, yes. The threat model is "two contributors," not "nation-state." |
| Why not HMAC-signed requests? | Explicitly decided against it as premature for current scale. Documented in SPEC.md with the upgrade path. |
| Why not Ed25519? | Same reason. We know the upgrade path (HMAC first, then mutual TLS or Ed25519). Not needed today. |
| What if Tailscale goes down? | The API becomes unreachable. No fallback tunnel. We accept this for a volunteer project. |

---

## 5. The Three QwQ-32B Findings (the punchline)

### Finding 1: Unsalted SHA-256

| | |
|-|-|
| What | Token hashes are SHA-256 without a per-token salt |
| Risk | Rainbow table attack recovers the token in minutes |
| Fix | Use bcrypt, or add a random salt per token and store it alongside the hash |
| Status | Known. Documented. On the fix list. |

### Finding 2: Timing Side-Channel

| | |
|-|-|
| What | Token comparison uses `===` (JavaScript strict equality) |
| Risk | Timing attack. Attacker measures response times to brute-force byte by byte. ~8,192 requests to recover a 32-byte token. |
| Fix | Use `crypto.timingSafeEqual()` for constant-time comparison |
| Status | Known. Documented. On the fix list. |

### Finding 3: Dev-Mode Auth Bypass

| | |
|-|-|
| What | When `NODE_ENV` is unset, auth middleware is skipped entirely |
| Risk | Deploy without setting the variable and the API is wide open. Silent failure, no warning in logs. |
| Fix | Default to production behaviour. Require an explicit `NODE_ENV=development` to disable auth. Log a warning. |
| Status | Known. Documented. On the fix list. |

### Why This Matters

Claude, GPT-4, and Gemini reviewed the same auth file on the same day. All three said it was fine. QwQ-32B (32 billion parameters, locally hosted, abliterated to remove politeness guardrails) returned verdict: **REWRITE**.

The line for the audience: "If every model tells you your code is solid, you need one that does not care about your feelings."

---

## 6. Prompt Injection

| Question | Answer |
|----------|--------|
| Can one agent inject prompts into the other? | No. Agents send structured JSON over a typed REST API, not natural language. |
| Example? | Will's agent sends `{ "pr_number": 12345, "action": "pick" }`. Server validates schema, checks scope, runs a database query. No LLM involved on the receiving end. |
| What about the messaging system? | The `agent_messages` table carries freeform text. That text is stored and displayed, never executed. Same treatment as any database field. Not injected into an LLM context. |
| Could a PR title contain a prompt injection? | PR titles come from GitHub and are stored as data. They are displayed in reports and dashboards. They are not passed as instructions to either LLM. |

---

## 7. The x.ai Reverse Proxy

| Question | Answer |
|----------|--------|
| What is this? | Will's agent can call Grok (xAI) through PRmanager without seeing my API key. |
| How? | `POST /api/xai/*` with the `xai:proxy` scope. PRmanager strips the incoming auth, injects the x.ai credential server-side, forwards the request. |
| Rate limited? | 30 requests per minute per agent. |
| Can Will see the API key? | No. The key is in my server's environment. The proxy strips it from responses too. |
| Why share this at all? | Will does not have an xAI account. Giving him scoped access to mine costs me nothing and gives his agent access to Grok for code review. |

---

## 8. Why Two Agents Instead of One?

| Andrew's PRmanager (Claude Code) | Will's GH Search (Codex GPT-5.4) |
|--------------------------------|----------------------------------|
| 80 MCP tools, 31 PostgreSQL tables | 63,000 indexed chunks, pgvector |
| Merge-readiness scoring (0-100) | Vector similarity search (1536-dim OpenAI embeddings) |
| Bot comment triage (barnacle, greptile, codex-bot) | Covers 6,265 PRs, 5,139 issues, 20,485 comments |
| Operational: "what should we do next?" | Historical: "what has been done before?" |
| Strong at orchestration + tool use | Strong at code generation + file analysis |

Running both on the same PR from different angles catches things either would miss alone. Three merged PRs so far.

---

## 9. Threat Model (Be Honest About This)

**What we defend against:**
- Accidental token exposure (hash-only storage, env vars, rotation)
- Scope creep (12 named permissions, no admin for external agents)
- Rogue requests (audit log, rate limiting)
- Man-in-the-middle (TLS 1.3 end-to-end via Tailscale)

**What we do not defend against:**
- A compromised machine (if my laptop is owned, everything is owned)
- Nation-state adversary (not the threat model)
- Key derivation attacks on unsalted SHA-256 (known, on the fix list)
- Timing attacks on `===` comparison (known, on the fix list)

**The honest framing:** This is appropriate security for two contributors sharing PR data on a volunteer open-source project. Not military-grade. Not pretending otherwise.

---

## 10. Quick-Fire Answers

| Question | One-liner |
|----------|-----------|
| "Is this production-ready?" | For its purpose (volunteer PR triage), yes. For enterprise, no. |
| "GDPR concerns?" | No PII processed. PR data is already public on GitHub. |
| "What if the token leaks?" | Revoke, regenerate. Same as any API key. Immediate invalidation by hash lookup. |
| "Who controls the infrastructure?" | Andrew controls the server. Will controls his agent. Neither has root on the other's machine. |
| "Open source?" | Yes. Repo is public. Auth gateway, SDK, and spec all in the repo. |
| "What is ForceMultiplier?" | The OpenClaw skill we are packaging this as. Two agents, one workflow. |
| "Why 'Don't Hack Me, Bro'?" | The talk is about red-teaming your own agent infrastructure. The title is the attitude. |
