# Demo Script: Don't Hack Me, Bro
## Vienna AI Engineering Meetup — OpenClaw & Codex Night
### 7-Minute Lightning Talk

---

## PRE-FLIGHT CHECKLIST (15 minutes before stage)

### Network & API
- [ ] `curl https://prmanager.example.net/v1/health` returns `{"status":"ok"}`
- [ ] `node examples/triage.js` completes without error (run once to warm up)
- [ ] Tailscale is connected (check tray icon)
- [ ] WiFi is stable on venue network (test with a second curl)

### Terminal Setup
- [ ] Terminal font size: **20pt minimum** (audience at the back needs to read it)
- [ ] Dark background, light text (high contrast)
- [ ] Terminal width: 100 columns max (no line wrapping on projector)
- [ ] `cd C:\Projects\_Jobs\Collaborations\Andrew\Wil` already set
- [ ] `.env` loaded with `PRMANAGER_URL` and `PRMANAGER_TOKEN`
- [ ] Clear terminal history (`clear`)

### Browser Tabs (pre-opened, in order)
1. Dashboard at `http://localhost:3099` — PR overview tab visible
2. `https://github.com/openclaw/openclaw/pulls` — shows the PR count
3. Slides at `https://ademczuk.github.io/prmanager-federation/presentation/slides.html`

### Display
- [ ] Screen resolution: **1920x1080** (projectors choke on higher)
- [ ] Display mirroring ON (not extended)
- [ ] Night mode / f.lux / blue light filter OFF
- [ ] Notifications OFF (Do Not Disturb on Windows + phone)
- [ ] Close Slack, Discord, Teams, email

### Backup Plan
If the live demo fails (network down, API timeout, anything):
- [ ] **Screen recording** saved as `presentation/demo-recording.mp4`
  - Record the night before while the API is confirmed working
  - 30-45 seconds, terminal only, no commentary needed
- [ ] **Screenshot** saved as `presentation/demo-screenshot.png`
- [ ] Transition line: "The venue WiFi has opinions — let me show you the recording from this morning"
- [ ] Do NOT apologise more than once. Just switch and keep going.

### Gource Background Animation (PERSISTENT — plays behind every slide)
- [ ] `presentation/openclaw-gource.mp4` loaded and autoplaying behind all slides
- [ ] Video plays at 30% opacity with colour filter — visible but not distracting
- [ ] **Live stats overlay** ticks up in sync with video playback
- [ ] Stats are a visual reinforcement — you do NOT need to mention them
- [ ] If video fails to load, slides still work fine (transparent background falls back to dark)

### Mental
- [ ] Water bottle on stage
- [ ] Phone on silent, face down
- [ ] Know your first sentence by heart

---

## NARRATIVE THREAD

Everything you say hangs off one idea: **coordination is the bottleneck, not code.**

You have an MSc in Logistics. OpenClaw's 7,000 PRs is a supply chain problem. Agents already write code. What they cannot do is coordinate. You built the coordination layer. Then you red-teamed it because a coordination system that moves bad decisions faster is worse than no system at all.

That is the talk. Every slide supports this. Nothing else.

---

## THE SCRIPT

---

### [0:00 - 0:30] SLIDE 1 — Title

**SHOW:** Title slide. "Don't Hack Me, Bro." ForceMultiplier badge.

> "openclaw has seven thousand open pull requests. Not seven hundred. Seven *thousand*."

*Beat.*

> "That is not a code problem. There are already AI agents writing code, reviewing code, commenting on code. The problem is coordination. None of those agents can talk to each other. I have a master's in logistics. I know a routing problem when I see one."

**Timing note:** 30 seconds. This is the frame for the entire talk. "Not a code problem — a coordination problem" is the sentence the audience takes home.

---

### [0:30 - 1:30] SLIDE 2 — The Problem

**SHOW:** The big animated counter. 7,083 ticks up on screen.

Let the number animate. Point at it.

> "Seven thousand and eighty-three. A new PR lands every two minutes. Each one needs triaging — is CI passing? Are reviews done? Does it conflict with something else? Are the bot comments genuine or false positives?"

> "No human can route that. And right now, no agent can either, because every agent is stuck on one person's machine with no visibility into what anyone else is doing."

**Timing note:** 60 seconds. You are naming the bottleneck. The audience should be nodding.

---

### [1:30 - 2:30] SLIDE 3 — PRmanager

**SHOW:** "The Funnel" — 7,083 → 12 merge-ready.

> "PRmanager was my first fix. Seven thousand PRs go in, twelve merge-ready come out. It scores every PR from 0 to 100 on merge readiness — CI, reviews, conflicts, staleness, bot comments. The funnel does the routing."

*Point at the 12.*

> "That is what a logistics system looks like. Not more code. Better prioritisation."

**SHOW:** Quick flash of the dashboard. 3 seconds max.

**Timing note:** 60 seconds. DO NOT list tools or tables. The funnel visual tells the story. "Seven thousand in, twelve out" is the only number that matters.

---

### [2:30 - 4:00] SLIDE 4 — The Federation

**SHOW:** Architecture diagram. Two agents, HTTPS API in the middle.

> "But filtering on one machine is not enough. Will Sparkman built a completely separate tool — a PR search engine with 63,000 indexed chunks using Codex and OpenAI embeddings. He answers 'what has been done before?' I answer 'what should we do next?'"

> "The old workflow: I'd find a PR in PRmanager, paste it to Will on Discord, he'd paste it into Codex. Human clipboard relay. Two agents, zero coordination."

> "So we built federation. His agent authenticates with a scoped token and calls my system directly. My agent calls his search. Same pattern as Stripe — Bearer token, HTTPS, twelve scoped permissions."

**VERBALIZE (security badges on screen — talk through them, don't read them):**

> "TLS 1.3 end-to-end. Audit trail on every call. Tokens are SHA-256 hashed..." *(glance at the "...right?" badge, slight pause)* "...we'll come back to that."

**Note:** The "SHA-256 ...right?" badge is a deliberate setup for slide 6. Let the audience think the security is solid. Slide 6 pulls the rug.

> "Two separate repos. Two different LLMs. One shared API contract. That is the coordination layer."

**Timing note:** 90 seconds. "Human clipboard relay" gets the laugh. "Same pattern as Stripe" gives instant credibility. Move to demo.

---

### [4:00 - 5:00] LIVE DEMO (switch from slide 4 to terminal)

**SHOW:** Switch to terminal. Full screen. Font size 20+.

> "Let me show you the coordination happening."

**TYPE:**
```
node examples/triage.js
```

**Expected output (narrate as it appears):**

```
Authenticated as: will (Will's Codex Agent)
```

> "There is the handshake. Will's token, twelve scopes, over TLS."

```
--- Dashboard Stats ---
  Open PRs: 7,083
  Ready to merge: 12
```

> "Seven thousand in. Twelve ready to merge right now."

```
--- Ready to Merge (12) ---
  #33608: chore(ci): unblock audit + command spec checks (score: ...)
```

> "Score 89. CI passing, reviews approved, no conflicts. A bot could merge that right now. The coordination layer found it. No human triaged that."

**IF TIME ALLOWS (you're under 4:30):**

**TYPE:**
```
node examples/daily-triage.js
```

> "Full autonomous triage. Discover, pick, sync bot comments, check CI, report, release. The whole logistics loop."

---

**FALLBACK (if demo fails):**

> "The venue WiFi has opinions today — let me show you the recording from this morning."

**SHOW:** Play `presentation/demo-recording.mp4` or show `presentation/demo-screenshot.png`.

Keep narrating the same story. Don't dwell.

**Timing note:** 60 seconds for demo. If `triage.js` works fast, run `daily-triage.js` too. If flaky, triage only.

---

### [5:00 - 5:40] SLIDE 5 — SaaS is Copyable

**SHOW:** The git-tower vs "30 min" comparison. AaaS punchline.

> "Quick tangent on why coordination matters more than features. git-tower.com is a hundred euros a year. My agent replicated it in thirty minutes. And improved it."

> "Features are copyable. Dashboards are copyable. The thing that is not copyable is the coordination layer between agents — because that depends on trust, scoping, and shared data across different people's machines."

> "Welcome to AaaS. Agents as a Service."

*Pause for the phonetic joke.*

**Timing note:** 40 seconds. The AaaS joke lands better when it follows the "coordination is the real product" point.

---

### [5:40 - 6:20] SLIDE 6 — The Anti-Sycophant

**SHOW:** QwQ-32B brutal output next to Claude/GPT/Gemini "great work!" response.

> "Remember that SHA-256 badge with the question mark? Here's why."

> "A coordination system that moves bad decisions faster is worse than no system at all. So I red-teamed my own auth gateway. Asked Claude, GPT, and Gemini to review it. All three said ship it."

> "Then I pointed QwQ-32B at it — a 32 billion parameter model running locally, with the politeness trained out of it. It found three critical flaws. Unsalted SHA-256. Timing side-channel on the token comparison. Dev mode that silently disables auth when an env var is missing."

> "Verdict: REWRITE."

*Beat.*

> "If every model tells you you're brilliant, you need a model that does not care about your feelings. Especially when it is auditing the coordination layer that other agents depend on."

**Timing note:** 40 seconds. "A coordination system that moves bad decisions faster" is the line that ties this back to the logistics thread.

---

### [6:20 - 6:50] SLIDE 7 — The Punchline

**SHOW:** Three merged PR badges.

> "Three merged PRs. Gateway routing, test infra, webchat. Small scope. Real code. Shipped."

> "The coordination layer found them, the agents triaged them, the adversarial model checked them. AI maintaining AI. That is the logistics system working end to end."

**Timing note:** 30 seconds. "AI maintaining AI" is the soundbite. "Logistics system working end to end" closes the loop.

---

### [6:50 - 7:00] SLIDE 8 — Close

**SHOW:** Links. GitHub, slides URL, federation SDK.

> "The API is live right now. You literally just saw it. The whole thing is open source. Come find me after if you want to see the dashboard. I'm Andrew. Thanks."

**Walk off. Seven minutes means seven minutes.**

---

## TIMING CHEAT SHEET

| Time    | Section               | Duration | What's on screen            |
|---------|-----------------------|----------|-----------------------------|
| 0:00    | Title                 | 0:30     | Slide 1: Don't Hack Me, Bro |
| 0:30    | The Problem           | 1:00     | Slide 2: 7,083 counter      |
| 1:30    | PRmanager             | 1:00     | Slide 3: funnel + dashboard flash |
| 2:30    | Federation            | 1:30     | Slide 4: architecture diagram |
| 4:00    | Live Demo             | 1:00     | Terminal (full screen)      |
| 5:00    | SaaS / AaaS           | 0:40     | Slide 5: git-tower vs 30 min |
| 5:40    | Anti-Sycophant        | 0:40     | Slide 6: QwQ brutal output  |
| 6:20    | Punchline             | 0:30     | Slide 7: merged PRs         |
| 6:50    | Close                 | 0:10     | Slide 8: links              |
| **7:00** | **Done**             |          |                             |

## EMERGENCY TIME MANAGEMENT

- **Running long at 4:00?** Skip `daily-triage.js`, only run `triage.js`. Saves 30 seconds.
- **Running long at 5:00?** Compress slides 5+6: "I red-teamed my own auth, QwQ found three FATALs, every other model said ship it. Also SaaS is dead. Moving on."
- **Running short at 5:00?** Expand the demo. Scroll through output, talk about scoring.
- **Demo completely fails?** You gain 30 seconds. Expand QwQ section with more detail on the three findings.

## THE NARRATIVE IN ONE SENTENCE

"Seven thousand PRs is a coordination problem, not a code problem — so I built a logistics layer that lets AI agents share tools across different people's machines, then red-teamed it because coordination without verification is just faster mistakes."

## PHRASES TO AVOID

- "Um, so basically..." — Start with conviction
- "This is just a side project" — It runs against a repo with 7K PRs. Own it.
- "I know this is simple but..." — Simple and working beats complex and theoretical.
- "Can everyone see that?" — Fix the font size beforehand.
- "Let me just..." — Cut the filler. Do the thing or don't.
- "80 MCP tools, 31 tables" — Show one working flow. Nobody cares about a tool count.

## PHRASES THAT WORK

- "Not a code problem. A coordination problem." (The frame)
- "Seven thousand in, twelve out." (The funnel)
- "Human clipboard relay." (The laugh)
- "Same pattern as Stripe." (Instant credibility)
- "A coordination system that moves bad decisions faster is worse than nothing." (The QwQ setup)
- "You need a model that doesn't care about your feelings." (The hook)
- "AI maintaining AI." (The soundbite)
- "The API is live right now." (Proof over promises)
