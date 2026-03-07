# Screening Call Script — Vienna AI Engineering Meetup

**For:** Andrew Demczuk
**With:** Bogdan Pirvu (Head of Data & Analytics, NOVOMATIC AG) + Alex Gavrilescu (Co-Organiser, OpenAI Codex Ambassador) + Georg (Magenta HQ venue sponsor)
**Re:** Lightning talk "Don't Hack Me, Bro" — March 10, 2026 @ Magenta HQ, Rennweg 97-99
**Duration:** 10-15 minutes. They are busy. Be concise.

---

## THE GOLDEN RULE

They said they don't understand. Don't explain harder. **SHOW.**

The first 30 seconds decides everything. Show the demo or describe it so concretely they can picture it. Then frame it. Not the other way around.

---

## PHASE 1: THE SHOW (first 30 seconds)

**If screenshare is available (preferred):**

> "Can I share my screen? This takes 15 seconds."

Share terminal. Run:
```
node examples/triage.js
```

As output appears, narrate:

> "That's the same client SDK that Will Sparkman's Codex agent uses — authenticating with my system using his real agent token right now. It just queried my PR scoring engine, found 12 merge-ready PRs out of 7,000, and picked the best candidate. That is the API contract the talk is about."

**If no screenshare:**

> "Let me describe what the audience will see. I type one command on stage. The same client SDK that another contributor's Codex agent uses — same token, same scopes — authenticates with my system, queries my scoring engine, and picks the best merge candidate out of seven thousand open PRs. The audience watches the API work against real OpenClaw data. That's the talk."

---

## PHASE 2: THE HEADLINE (30-60 seconds)

> "The talk shows the federation layer we built — a coordination API that lets agents on different machines query each other's private capabilities. Not posting to the same PR thread like OpenClaw's existing bots — actually accessing each other's scoring engines and search indexes."

> "Before this, I'd find a PR in my system, paste it to Will on Discord, he'd paste it into Codex, read the output, paste it back. Human clipboard relay. Two agents, zero coordination. The API replaces that. I demo the client side on stage with real data."

---

## PHASE 3: THE ARC (60-120 seconds)

Walk them through the seven minutes. Don't read slides — give them the experience:

> "Here's what the audience gets in seven minutes:

> The big number — 7,083 open PRs ticks up on screen. I frame it as a logistics problem, not a code problem. I have a master's in logistics. I know a routing problem when I see one.

> The funnel — seven thousand go in, twelve come out. That's what prioritisation looks like.

> The federation — architecture diagram. Two agents, HTTPS API in the middle. Security badges. One badge says 'SHA-256 ...right?' with a question mark. That's a setup for later.

> Live demo — I switch to terminal, run the triage client with Will's agent token against my live API. The audience watches the scoring engine work on real OpenClaw data.

> Comic relief — git-tower.com charges a hundred euros a year. My agent replicated it in thirty minutes. Welcome to AaaS. Agents as a Service."

*Pause. Let the phonetic joke land.*

> "The research — two different agents beat sixteen identical ones. Yang et al. 2026, seven benchmarks.

> The reveal — this is the moment. The slide shows Claude, GPT, and Gemini confidently endorsing the auth code — 'excellent security design,' 'best practice,' 'exactly the right pattern.' Then I click — the screen glitches, shakes, and QwQ-32B's output slams in: 'not best practice,' 'not type-safe,' 'not a fallback.' Three green endorsements become three red FATALs. Verdict REWRITE. The audience just watched three models be confidently, specifically wrong. That's the 'don't hack me, bro' moment.

> The punchline — four merged PRs. AI maintaining AI. The coordination layer works end to end.

> Links, QR codes, done. Seven minutes."

---

## PHASE 4: WHY THIS FITS (only if they ask — otherwise skip)

Your call asks for five things. This hits all five:

| You asked for | What I'm showing |
|--------------|------------------|
| "OpenClaw agents and automations you've built" | PRmanager — 7,000 PRs in, 12 merge-ready out. Live on OpenClaw data right now. |
| "Creative Codex workflows and coding setups" | Will Sparkman built a Codex agent with 63K indexed chunks. I built the API it plugs into. The demo runs his client SDK against my live scoring engine. |
| "Combinations of OpenClaw + Codex (or other AI tools)" | **Literally this.** My Claude-built system + Will's Codex-built search, connected by a shared API contract. Two repos, two LLMs, one coordination layer. |
| "Lessons learned, fails, surprises — the real stuff" | I red-teamed my own auth gateway. Claude, GPT, and Gemini confidently endorsed three flawed patterns as 'best practice.' A local 32B model found all three were FATAL. |
| "Wait, you can do THAT?" | A federation API that lets agents from different contributors access each other's private capabilities. No human clipboard relay. The API is live, the demo runs against real OpenClaw data on stage. |

The demo runs against `openclaw/openclaw`. Not a toy repo. Not a mockup. Peter's repo, live.

---

## PHASE 5: DEMO RISK (if they ask)

> "I have a fallback recording — thirty seconds of the demo working, recorded on stable network. If wifi dies, I say 'the venue WiFi has opinions today,' switch to the video, and keep talking. Three-second transition. I've timed the whole talk. If the demo runs fast, I have a second script for the full triage loop. If it runs slow, I cut to the red-team reveal. Either way, seven minutes."

---

## FOR ALEX SPECIFICALLY

Alex is the direct line to the OpenAI Codex team. This talk gives him something worth relaying:

> "Alex, one angle you might find interesting — Will built his Codex agent as a federation endpoint. He's treating Codex not just as a local dev tool but as a network node with queryable capabilities. That's an emergent use case. And the architecture bridges the Claude/GPT divide — two agents from competing ecosystems sharing a coordination API. That's something you could relay to the Codex team. It also means your meetup gets to say 'we showed how cross-model agent federation actually works.' That's a headline."

---

## FOR BOGDAN SPECIFICALLY

Bogdan has a PhD in theoretical physics and runs data analytics at NOVOMATIC. Technical rigour matters.

> "Bogdan, the security section is a genuine finding. Unsalted SHA-256, timing side-channel on token comparison, dev-mode auth bypass. Three commercial models reviewed the same file same day and missed all three. A thirty-two-billion parameter local model caught them. That's reproducible. The audience walks away knowing they need an adversarial model in their own pipeline."

---

## IF THEY ASK

**"What will the audience learn?"**
How to build a coordination API that lets AI agents on different machines share private capabilities over HTTPS. Not posting to the same PR thread — actually accessing each other's scoring engines and search indexes. Why you need an adversarial model checking the coordination layer. What that looks like in practice on a real repo with 7,000 open PRs.

**"Is this just a REST API?"**
The API is the transport. The point is what happens at each end — his agent finds similar PRs across 63K indexed chunks, mine scores merge readiness across 7,000 open PRs. Neither was built for the other. A 200-line SDK and auth gateway bridged them. OpenClaw's existing bots all post to the same PR thread but can't query each other. This is different — agents accessing each other's actual intelligence.

**"Product pitch?"**
No. Technical. Live terminal. Nothing to sell. 2-3 slides and a demo, exactly what you asked for.

**"How does this connect to Peter's livestream?"**
We run the demo against Peter's repo. Four merged PRs into openclaw/openclaw. The federation is built on top of the contributor community Peter started.

**"Too complex for 7 minutes?"**
Nine slides, one live demo, one joke, one punchline. I've timed it. The emergency plan is documented. Seven minutes means seven minutes.

---

## SECURITY DEEP DIVE (if Bogdan probes)

**"Auth model?"**
Bearer token over HTTPS. Same pattern as Stripe. Random 32-byte token, server hashes with SHA-256, looks up hash in Postgres. Raw token never stored.

**"Compromised agent?"**
12 scoped permissions. Every call logged to audit trail. Rate-limited per agent.

**"QwQ findings — details?"**
Unsalted SHA-256 — rainbow table recovery in minutes. Token comparison with `===` not `timingSafeEqual()` — timing attack in ~8,192 requests. Dev mode silently disables auth when env var is unset. Three FATALs, verdict REWRITE.

**"Prompt injection?"**
Agents send structured JSON, not prompts. Schema-validated, scope-checked. One agent's output never becomes another agent's prompt.

**"TLS enough?"**
For two devs on a volunteer project, yes. Tailscale Funnel, TLS 1.3 end-to-end. Upgrade path documented.

*(Print SECURITY-CHEAT-SHEET.md if Bogdan is on the call)*

---

## CODEX DEEP DIVE (if Alex probes)

**"How does Will use it?"**
Client SDK. Import, pass token, call methods. Also a daily triage script that runs the full loop autonomously. Will runs Codex GPT-5.4 with pgvector and 63K indexed chunks.

**"What does Codex get from the federation?"**
Merge-readiness scoring, bot comment triage, CI status. His Codex agent has breadth (63K chunks of OpenClaw history). My system has operational depth (real-time PR scoring, conflict detection, reviewer nomination). His search gives my triage context it can't generate alone. My scoring gives his search direction it never had.

**"MCP or HTTP?"**
Both. MCP locally (80 tools). HTTP externally for remote agents. HTTP projects a subset of MCP capabilities. Will's Codex agent connects via HTTP with a scoped Bearer token.

**"How is this different from OpenClaw's existing bots?"**
Barnacle, Greptile, Codex — they all post to the same PR thread. None can query the others' analysis. They're co-located, not coordinated. Our agents access each other's private capabilities directly. That's the difference.

---

## OpenClaw Background (if needed)

**What:** Open-source AI agent gateway. 1,100+ contributors, 20K+ PRs, 357 maintainers.

**My PRs:** Four merged. #32128, #32183, #32311, #39108. Gateway routing, test infra, webchat, daemon drift detection.

**Will:** Will Sparkman (@sparkyrider). Codex GPT-5.4, pgvector, 63K indexed chunks. Met through the contributor community.

**Peter Steinberger:** "The Clawfather." Livestream from SF. PSPDFKit founder. We run our demo against his repo.

**Georg:** Magenta HQ venue sponsor. Got the bigger venue approved when demand outgrew Greentube.

---

## THE CLOSE

Don't ask permission. State readiness.

> "The slides are live. The repo is public. The API is running right now. I have four merged PRs into Peter's repo and a fallback recording for the demo. You asked for OpenClaw plus Codex — this is literally that. The federation architecture, the scoring engine, the red-team findings, all live on stage against real data. I'm ready for March 10."

*Stop talking. Let them respond.*

---

## PRE-CALL CHECKLIST

### Rehearse
- [ ] First sentence memorised: "Can I share my screen? This takes 15 seconds." OR the no-screenshare version
- [ ] `node examples/triage.js` tested and working within the last hour
- [ ] AaaS punchline delivery practised (pause after "Agents as a Service")
- [ ] Close line rehearsed — **no question mark at the end**

### Know Cold
- [ ] The three QwQ findings (unsalted SHA-256, timing attack on `===`, dev-mode auth bypass)
- [ ] Will's details (Will Sparkman, @sparkyrider, Codex GPT-5.4, pgvector, 63K chunks)
- [ ] The distinction in one line: "Not posting to the same PR thread — querying each other's private intelligence"
- [ ] Four merged PRs: #32128, #32183, #32311, #39108

### Know the Room
- [ ] Bogdan: PhD theoretical physics, NOVOMATIC Head of Data & Analytics, organiser since 2015. Cares about technical rigour and security.
- [ ] Alex: Co-Organiser + OpenAI Codex Ambassador, Backlog.md creator, direct line to Codex team. Cares about Codex use cases he can relay upstream.
- [ ] Georg: Magenta HQ venue sponsor. Cares about the event looking good.
- [ ] Peter Steinberger: "The Clawfather", livestream from SF, steipete, PSPDFKit founder. We demo against his repo.

### Mindset
- [ ] You are not asking permission. You are confirming a slot.
- [ ] They need speakers. You have a working demo. This is a match.
- [ ] If they don't understand, show — don't explain harder.
