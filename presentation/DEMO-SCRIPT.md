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
2. `https://github.com/openclaw/openclaw/pulls` — shows the PR count for credibility
3. Slides at `https://ademczuk.github.io/prmanager-federation/presentation/slides.html`

### Display
- [ ] Screen resolution: **1920x1080** (projectors choke on higher)
- [ ] Display mirroring ON (not extended)
- [ ] Night mode / f.lux / blue light filter OFF
- [ ] Notifications OFF (Do Not Disturb on Windows + phone)
- [ ] Close Slack, Discord, Teams, email

### Backup Plan
If the live demo fails (network down, API timeout, anything):
- [ ] **Screen recording** of `node examples/triage.js` saved as `presentation/demo-recording.mp4`
  - Record this the night before while the API is confirmed working
  - 30-45 seconds, terminal only, no commentary needed
- [ ] **Screenshot** of triage output saved as `presentation/demo-screenshot.png`
- [ ] Transition line ready: "The venue WiFi has opinions — let me show you the recording from this morning"
- [ ] Do NOT apologise more than once. Just switch and keep going.

### Gource Background Animation (PERSISTENT — plays behind every slide)
- [ ] `presentation/openclaw-gource.mp4` loaded and autoplaying behind all slides
- [ ] Video plays at 30% opacity with colour filter — visible but not distracting
- [ ] **Live stats overlay** ticks up in sync with video playback:
  - Contributors, PRs, Issues, Maintainers counting up across 103 days of openclaw history
  - Nov 2025 → March 2026, synced to video timestamp
  - Overlay sits bottom-left, z-index 100, semi-transparent
- [ ] Stats are a visual reinforcement — you do NOT need to mention them verbally
- [ ] If video fails to load, slides still work fine (transparent background falls back to dark)

### Mental
- [ ] Water bottle on stage
- [ ] Phone on silent, face down
- [ ] Know your first sentence by heart (you never get a second chance at the opening)

---

## THE SCRIPT

---

### [0:00 - 0:30] SLIDE 1 — Title

**SHOW:** Title slide. "Don't Hack Me, Bro." ForceMultiplier badge. Your name.

> "openclaw/openclaw has seven thousand open pull requests. Not seven hundred. Seven *thousand*. A new one lands every two minutes. Nobody can keep up."

*Beat. Let that land.*

> "So I built a system where two AI agents triage those PRs together. My Claude Code and another contributor's Codex CLI. They talk over HTTPS. No human in the loop. We're calling it ForceMultiplier."

**Timing note:** 30 seconds. Don't rush "seven thousand." It's the punchline.

---

### [0:30 - 1:30] SLIDE 2 — The Problem

**SHOW:** The big animated counter. 7,083 ticks up on screen.

Let the number animate. Point at it.

> "That's not a typo. Seven thousand and eighty-three. Every single one needs triaging."

Move to next slide as you start the solution.

---

### [1:30 - 2:30] SLIDE 3 — PRmanager

**SHOW:** PRmanager stats. 80 MCP tools, 31 tables, 11 dashboard tabs.

> "PRmanager is the thing I built to make sense of this. Express API, PostgreSQL with 31 tables, 80 MCP tools so AI agents can drive it directly."

> "It scores every PR for merge readiness. CI status, review state, file complexity, staleness. Seven thousand PRs go in. Twelve merge-ready come out. That's the funnel."

**SHOW:** Quick flash of the dashboard if you've got the browser tab ready. 3 seconds max.

**Timing note:** 60 seconds. The dashboard flash is a teaser, not a demo.

---

### [2:30 - 4:00] SLIDE 4 — The Federation

**SHOW:** Architecture diagram. Andrew's Claude Code on one side, Will's Codex CLI on the other, HTTPS API in the middle.

> "I'm not the only person building tools for openclaw. Will built a completely separate PR search tool using Codex and OpenAI embeddings. Different LLM, different stack, different person."

> "The old workflow was embarrassing. I'd find something in PRmanager, paste it to Will on Discord, he'd paste it into Codex. Human clipboard relay. That's not AI collaboration, that's two people with extra steps."

> "So we built federation. Two repos, one API contract. Will's agent authenticates with a scoped token and calls PRmanager directly. Same pattern as Stripe. Twelve scopes. Standard stuff."

**VERBALIZE (security badges are on screen — talk through them, don't read them):**

> "The connection is TLS 1.3 end-to-end. Not terminated at some edge — it terminates on my machine. Tailscale never sees plaintext. Twelve scoped permissions. Full audit trail on every call. And the tokens are SHA-256 hashed…" *(glance at the "…right?" badge, slight pause)* "…we'll come back to that."

**Note:** The "SHA-256 hashing …right?" badge is a deliberate setup for slide 6 (QwQ-32B finding unsalted SHA-256 as FATAL). Don't oversell the security here. Let the audience think everything's solid. Slide 6 pulls the rug.

> "The key insight: we don't share a codebase. We don't share a database. We share an *API contract*."

**Timing note:** 90 seconds. This is the intellectual core. "Same pattern as Stripe" is enough for this audience. The Tailscale detail is 10 seconds max — don't lecture.

---

### [4:00 - 5:00] LIVE DEMO (from slide 4, switch to terminal)

**SHOW:** Switch to terminal. Full screen. Font size 20+.

> "Let me show you the handshake."

**TYPE:**
```
node examples/triage.js
```

**Expected output (narrate as it appears):**

```
Authenticated as: will (Will's Codex Agent)
```

> "There's the auth. Will's token, twelve scopes, over TLS."

```
--- Dashboard Stats ---
  Open PRs: 7,083
  Ready to merge: 12
```

> "Seven thousand PRs. Twelve ready to merge right now."

```
--- Ready to Merge (12) ---
  #33608: chore(ci): unblock audit + command spec checks (score: ...)
```

> "Score 89. CI passing, reviews approved, no merge conflicts. A bot could merge that right now."

**IF TIME ALLOWS (you're under 4:30):**

**TYPE:**
```
node examples/daily-triage.js
```

> "Full triage. Discover low-hanging fruit, pick top three, sync bot comments, check CI, send me a report, release the picks. Autonomous."

Point at key moments. Don't narrate every line.

---

**FALLBACK (if demo fails):**

> "The venue WiFi has opinions today — let me show you the recording from this morning."

**SHOW:** Play `presentation/demo-recording.mp4` or show `presentation/demo-screenshot.png`.

Keep narrating the same story. Don't dwell on the failure.

**Timing note:** 60 seconds for demo. If `triage.js` works fast, run `daily-triage.js` too. If flaky, stick with triage only.

---

### [5:00 - 5:40] SLIDE 5 — SaaS is Copyable

**SHOW:** The git-tower vs "30 min" comparison. AaaS punchline.

> "Quick tangent. git-tower.com is a hundred euros a year. My agent replicated it in thirty minutes. And improved it."

> "SaaS is trivially copyable now. Welcome to AaaS. Agents as a Service."

*Pause for the phonetic joke to land.*

> "Peter Steinberger says OpenClaw smells like a clanker. I reckon this smells like AaaS."

**Timing note:** 40 seconds. Let the audience laugh. Don't step on it.

---

### [5:40 - 6:20] SLIDE 6 — The Anti-Sycophant

**SHOW:** The QwQ-32B brutal output next to the Claude/GPT/Gemini "great work!" response.

> "Remember that SHA-256 badge with the question mark? Here's why."

> "I built the auth gateway for this federation. Asked Claude, GPT, and Gemini to review it. All three said it was solid. Great work, minor suggestion, ship it."

> "Then I pointed QwQ-32B at it. A 32-billion parameter model that doesn't do sycophancy. It found three FATAL flaws. Unsalted SHA-256, timing-side-channel on the token comparison, dev mode that bypasses auth entirely when an env var is unset."

> "Verdict: REWRITE. A junior wrote this, a senior would have caught it."

*Beat.*

> "If every model tells you you're brilliant, you need a model that doesn't care about your feelings."

**Timing note:** 40 seconds. This is the real talk. The audience knows sycophancy is a problem. Give them the receipts.

---

### [6:20 - 6:50] SLIDE 7 — The Punchline

**SHOW:** Three merged PR badges. The "$1M app" joke.

> "This isn't a prototype. Three merged PRs on openclaw. Gateway routing, test infra, webchat fixes. PRmanager found them. The low-hanging fruit detector flagged them. They shipped."

> "AI is now maintaining AI. openclaw is an AI project. Its PRs are written by agents. And now agents are *triaging* those PRs."

**Timing note:** 30 seconds. "AI maintaining AI" is the soundbite.

---

### [6:50 - 7:00] SLIDE 8 — Close

**SHOW:** Links. GitHub, slides URL, federation SDK.

> "PRmanager is open source. The API is live right now. You literally just saw the curl. Come find me after if you want to see the dashboard. I'm Andrew. Thanks."

**Walk off. Seven minutes means seven minutes.**

---

## TIMING CHEAT SHEET

| Time    | Section               | Duration | What's on screen          |
|---------|-----------------------|----------|---------------------------|
| 0:00    | Title                 | 0:30     | Slide 1: Don't Hack Me, Bro |
| 0:30    | The Problem           | 1:00     | Slide 2: 7,083 counter     |
| 1:30    | PRmanager             | 1:00     | Slide 3: stats + dashboard flash |
| 2:30    | Federation            | 1:30     | Slide 4: architecture diagram |
| 4:00    | Live Demo             | 1:00     | Terminal (full screen)    |
| 5:00    | SaaS / AaaS           | 0:40     | Slide 5: git-tower vs 30 min |
| 5:40    | Anti-Sycophant        | 0:40     | Slide 6: QwQ brutal output |
| 6:20    | Punchline             | 0:30     | Slide 7: merged PRs + joke |
| 6:50    | Close                 | 0:10     | Slide 8: links            |
| **7:00** | **Done**             |          |                           |

## EMERGENCY TIME MANAGEMENT

- **Running long at 4:00?** Skip `daily-triage.js`, only run `triage.js`. Saves 30-40 seconds.
- **Running long at 5:00?** Compress slides 5+6 into one beat: "I red-teamed my own auth, QwQ found three FATALs, every other model said ship it. Also SaaS is dead. Moving on."
- **Running short at 5:00?** Expand the demo. Scroll through output, point at PR titles, talk about the scoring algorithm.
- **Demo completely fails?** You gain 30-40 seconds. Use them on anti-sycophant section with more detail on the three FATALs.

## SLIDE INVENTORY

8 slides total:

1. **Title** — "Don't Hack Me, Bro" / Andrew / ForceMultiplier badge
2. **The Problem** — Animated 7,083 counter
3. **PRmanager** — 80 MCP tools, 31 tables, 11 tabs, merge readiness score
4. **The Federation** — Architecture diagram + security badges (TLS 1.3, 12 scopes, audit trail, "SHA-256 …right?")
5. **SaaS is Copyable** — git-tower €100/yr vs 30 min agent clone, AaaS joke
6. **The Anti-Sycophant** — QwQ-32B brutal output vs Claude/GPT/Gemini praise
7. **The Punchline** — Three merged PRs, "$1M app for $2M in tokens"
8. **Close** — GitHub link, slides URL, federation SDK

## PHRASES TO AVOID

- "Um, so basically..." — Start sentences with conviction
- "This is just a side project" — It's running against a real repo with 7K PRs. Own it.
- "I know this is simple but..." — Simple and working beats complex and theoretical.
- "Can everyone see that?" — Fix the font size beforehand.
- "Let me just..." — Cut the filler. Do the thing or don't.

## PHRASES THAT WORK

- "Seven thousand open pull requests." (Let numbers do the work)
- "Same pattern as Stripe." (Instant credibility with this audience)
- "AI maintaining AI." (The soundbite)
- "Two LLMs, two people, one API contract." (The summary)
- "The API is live right now." (Proof over promises)
- "It smells like AaaS." (The laugh)
- "You need a model that doesn't care about your feelings." (The anti-sycophant hook)
