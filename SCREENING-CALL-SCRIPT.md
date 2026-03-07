# Screening Call Script — Vienna AI Engineering Meetup

**For:** Andrew Demczuk
**With:** Bogdan Pirvu (Head of Data & Analytics, NOVOMATIC AG) + Alex Gavrilescu (Co-Organiser, OpenAI Codex Ambassador) + Georg (Magenta HQ venue sponsor)
**Re:** Lightning talk "Don't Hack Me, Bro" — March 10, 2026 @ Magenta HQ, Rennweg 97-99
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

## What The Audience Sees (9 slides, 7 minutes)

| Time | Slide | The logistics thread |
|------|-------|---------------------|
| 0:00 | 1. Title | "7,000 PRs. Not a code problem. A coordination problem." |
| 0:30 | 2. The Problem | Counter animates to 7,083. Name the bottleneck. |
| 1:30 | 3. PRmanager | The funnel: 7,083 in, 12 out. Prioritisation, not features. |
| 2:30 | 4. Federation | Two agents accessing each other's private intelligence. |
| 4:00 | Terminal | **Live demo.** Handshake, PR pick, triage loop. |
| 5:00 | 5. AaaS | Features are copyable. The coordination layer is not. |
| 5:30 | 6. Bottleneck Rule | 2 different agents beat 16 identical ones. Yang et al. 2026. |
| 5:50 | 7. Anti-Sycophant | Red-teaming the coordination layer. 3 FATALs. |
| 6:25 | 8. Punchline | 4 merged PRs. AI maintaining AI. System works end to end. |
| 6:50 | 9. Close | Links, QR codes, done. |

Gource animation plays behind every slide. Fallback recording if wifi fails.

---

## Why This Fits the Evening

Your call asks for five things. This talk hits all five:

| You asked for | What I'm showing |
|--------------|------------------|
| "OpenClaw agents and automations you've built" | PRmanager — 7,000 PRs in, 12 merge-ready out. Live on OpenClaw data right now. |
| "Creative Codex workflows and coding setups" | Will Sparkman's Codex agent with 63K indexed chunks querying my system over HTTPS. |
| "Combinations of OpenClaw + Codex (or other AI tools)" | **Literally this.** My Claude agent + Will's Codex agent federating over a shared API. Two repos, two LLMs, one coordination layer. |
| "Lessons learned, fails, surprises — the real stuff" | I red-teamed my own auth gateway. Claude, GPT, and Gemini all said ship it. A local 32B model found three critical flaws they missed. |
| "Wait, you can do THAT?" | Two agents from different contributors' machines doing a full PR triage loop together. No human clipboard relay. The API is live, the demo runs against real OpenClaw data on stage. |

The demo runs against `openclaw/openclaw`. Not a toy repo. Not a mockup. Peter's repo, live.

---

## If They Ask

**"What will the audience learn?"**
How to get AI agents on different machines to share private capabilities over HTTPS. Not posting to the same PR thread - actually querying each other's scoring engines and search indexes. Why you need an adversarial model checking the coordination layer. What that looks like in practice on a real repo with 7,000 open PRs.

**"Is this just a REST API?"**
The API is the transport. The point is what happens at each end - his agent finds similar PRs across 63K indexed chunks, mine scores merge readiness across 7,000 open PRs. Neither was built for the other. A 200-line SDK and auth gateway bridged them. It found real issues neither caught alone. OpenClaw's existing bots all post to the same PR thread but can't query each other. This is different - agents accessing each other's actual intelligence.

**"Product pitch?"**
No. Technical. Live terminal. Nothing to sell. 2-3 slides and a demo, exactly what you asked for.

**"How does this connect to Peter's livestream?"**
We're running the demo against Peter's repo. Four merged PRs into openclaw/openclaw. The federation is built on top of the contributor community Peter started.

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

## Codex Questions (Alex — now Co-Organiser + Codex Ambassador)

Alex is the direct line to the OpenAI Codex team. Lean into the Codex integration angle.

**"How does Will use it?"**
Client SDK. Import, pass token, call methods. Also a daily triage script that runs the full loop autonomously. Will runs Codex GPT-5.4 with pgvector and 63K indexed chunks.

**"What does Codex get from the federation?"**
Merge-readiness scoring, bot comment triage, CI status. His Codex agent has breadth (63K chunks of OpenClaw history). My system has operational depth (real-time PR scoring, conflict detection, reviewer nomination). Separately they're useful. Together they coordinate - his search gives my triage context it can't generate alone, my scoring gives his search a direction it never had.

**"MCP or HTTP?"**
Both. MCP locally (80 tools). HTTP externally for remote agents. HTTP projects a subset of MCP. Will's Codex agent connects via HTTP with a scoped Bearer token.

**"How is this different from what OpenClaw's bots already do?"**
Barnacle, Greptile, Codex - they all post to the same PR thread. But none can query the others' analysis. They're co-located, not coordinated. Our agents access each other's private capabilities directly. That's the difference Alex could relay to the Codex team.

---

## OpenClaw Background (if needed)

**What:** Open-source AI agent gateway. 1,100+ contributors, 20K+ PRs, 357 maintainers.

**My PRs:** Four merged. #32128, #32183, #32311, plus daemon drift detection. Gateway routing, test infra, webchat, drift detection.

**Will:** Will Sparkman (@sparkyrider). Codex GPT-5.4, pgvector, 63K indexed chunks. Met through the contributor community.

**Peter Steinberger:** "The Clawfather." Livestream from SF. PSPDFKit founder. We run our demo against his repo.

**Georg:** Magenta HQ venue sponsor. Got the bigger venue approved fast when demand outgrew Greentube.

---

## Close the Call

Happy with the format? I'm ready for March 10. Slides are live, repo is public, API is running right now. You said you wanted "wait, you can do THAT?" - I'll give you two agents from different people's machines doing a live triage loop on Peter's repo. Seven minutes, done.

---

## Pre-Call Checklist

- [ ] Can explain the logistics angle in one sentence: "7,000 PRs is not a code problem, it is a coordination problem, and I built the coordination layer."
- [ ] Can explain the distinction: "OpenClaw's bots post to the same PR thread. Ours query each other's private intelligence. Co-located is not coordinated."
- [ ] Know the three QwQ findings cold (unsalted SHA-256, timing attack, dev-mode bypass)
- [ ] Know Will's name, tool, numbers (Will Sparkman, @sparkyrider, Codex GPT-5.4, pgvector, 63K chunks)
- [ ] Know the five meetup criteria and which part of the talk hits each one
- [ ] Bogdan: PhD theoretical physics, NOVOMATIC Head of Data & Analytics, organiser since 2015
- [ ] Alex: Co-Organiser + OpenAI Codex Ambassador, Backlog.md creator, direct line to Codex team
- [ ] Georg: Magenta HQ venue sponsor, got bigger venue approved when demand outgrew Greentube
- [ ] Peter Steinberger: "The Clawfather", livestream from SF, steipete, PSPDFKit founder
- [ ] Four merged PRs (not three): #32128, #32183, #32311 + daemon drift detection
