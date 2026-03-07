# Screening Call Script — Vienna AI Engineering Meetup

**For:** Andrew Demczuk
**With:** Bogdan Pirvu (Head of Data & Analytics, NOVOMATIC AG) + Alex Gavrilescu (OpenAI Codex Ambassador)
**Re:** Lightning talk "Don't Hack Me, Bro" — March 10, 2026
**Duration:** 10-15 minutes. They are busy. Be concise.

---

## Opening

Thanks for taking the time. I know you said you did not really understand what I am presenting, so let me make it simple.

---

## The Talk in 30 Seconds

OpenClaw has 7,000 open PRs. That is not a code problem — agents already write code. It is a coordination problem. Every contributor's agent runs on their own machine with its own tools and no visibility into anyone else.

I have a master's in logistics. I built a coordination layer that lets agents share tools across machines. My Claude agent and another contributor's Codex agent now do PR triage together over HTTPS — his queries my database and red-team model, mine queries his vector search. No human relaying between chat windows.

Then I red-teamed the coordination layer itself with a local 32B model that found three flaws the commercial models missed. That is the punchline: if you build a system that coordinates agents, you had better verify the coordination layer is not broken.

---

## What The Audience Sees (8 slides, 7 minutes)

| Time | Slide | The logistics thread |
|------|-------|---------------------|
| 0:00 | 1. Title | "7,000 PRs. Not a code problem. A coordination problem." |
| 0:30 | 2. The Problem | Counter animates to 7,083. Name the bottleneck. |
| 1:30 | 3. PRmanager | The funnel: 7,083 in, 12 out. Prioritisation, not features. |
| 2:30 | 4. Federation | The bridge: two agents sharing tools across machines. |
| 4:00 | Terminal | **Live demo.** Handshake, PR pick, triage loop. |
| 5:00 | 5. AaaS | Features are copyable. The coordination layer is not. |
| 5:40 | 6. Anti-Sycophant | Red-teaming the coordination layer. 3 FATALs. |
| 6:20 | 7. Punchline | 3 merged PRs. AI maintaining AI. System works end to end. |
| 6:50 | 8. Close | Links, done. |

Gource animation plays behind every slide. Fallback recording if wifi fails.

---

## Why This Fits the Evening

The event asks for "OpenClaw agents and automations you've built" and "combinations of OpenClaw + Codex." This talk is literally both: an OpenClaw automation (PRmanager) combined with a Codex workflow (Will's search tool), bridged over HTTPS. The demo runs against live OpenClaw data. The "wait, you can do THAT?" moment is two agents from different people's machines doing a full triage loop together with no human in the middle.

---

## If They Ask

**"What will the audience learn?"**
How to get AI agents on different machines to share tools over HTTPS. Why you need an adversarial model checking the coordination layer. What that looks like in practice on a real repo.

**"Is this just a REST API?"**
The API is the transport. The point is what happens at each end — his agent finds similar PRs, mine scores merge readiness, neither was built for the other. A 200-line SDK and auth gateway bridged them. It found real issues neither caught alone.

**"Product pitch?"**
No. Technical. Live terminal. Nothing to sell.

---

## Security (Bogdan)

**"Auth?"**
Bearer token over HTTPS. Same as Stripe. Random 32-byte token, server hashes with SHA-256, looks up hash in Postgres. Raw token never in the database.

**"Compromised agent?"**
12 scoped permissions. Every call logged. Rate-limited per agent.

**"QwQ findings?"**
Unsalted SHA-256, timing attack on `===`, dev-mode auth bypass. Three commercial models missed all three.

**"Prompt injection?"**
Agents send structured JSON, not prompts. Schema-validated, scope-checked. One agent's output never becomes another's prompt.

**"TLS enough?"**
For two devs on a volunteer project, yes. Tailscale Funnel, TLS 1.3 end-to-end. Upgrade path documented.

*(Full security reference: SECURITY-CHEAT-SHEET.md — print it)*

---

## Codex Questions (Alex)

**"How does Will use it?"**
Client SDK. Import, pass token, call methods. Also a daily triage script that runs the full loop autonomously.

**"What does Codex get?"**
Merge-readiness scoring, bot comment triage, x.ai API via reverse proxy. His search has breadth (63K chunks). My system has operational depth. Together they coordinate.

**"MCP or HTTP?"**
Both. MCP locally (80 tools). HTTP externally for remote agents. HTTP projects a subset of MCP.

---

## OpenClaw Background (if needed)

**What:** Open-source AI agent gateway. 1,100+ contributors, 20K+ PRs, 357 maintainers.

**My PRs:** Three merged. #32128, #32183, #32311. Gateway routing, test infra, webchat.

**Will:** Will Sparkman. Codex GPT-5.4, pgvector, 63K indexed chunks. Met through the contributor community.

**Peter Steinberger:** Livestream from SF. PSPDFKit founder.

---

## Close the Call

Happy with the format? I am ready for March 10. Slides are live, repo is open if you want to look.

---

## Pre-Call Checklist

- [ ] Can explain the logistics angle in one sentence: "7,000 PRs is not a code problem, it is a coordination problem, and I built the coordination layer."
- [ ] Know the three QwQ findings cold
- [ ] Know Will's name, tool, numbers (63K chunks, Codex)
- [ ] Bogdan: PhD theoretical physics, NOVOMATIC, organiser since 2015
- [ ] Alex: OpenAI Codex Ambassador, Backlog.md
- [ ] Peter Steinberger: livestream SF, steipete, PSPDFKit
