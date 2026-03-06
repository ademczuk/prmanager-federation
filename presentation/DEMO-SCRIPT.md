# Demo Script: Two Agents, One Repo
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
- [ ] Clear terminal history (`clear`) — no leftover junk visible

### Browser Tabs (pre-opened, in order)
1. Dashboard at `http://localhost:3099` — PR overview tab visible
2. `https://github.com/openclaw/openclaw/pulls` — shows the PR count for credibility
3. Slides (Google Slides / Keynote / whatever — presenter mode on secondary display)

### Display
- [ ] Screen resolution: **1920x1080** (projectors choke on higher)
- [ ] Display mirroring ON (not extended — you need to see what they see)
- [ ] Night mode / f.lux / blue light filter OFF
- [ ] Notifications OFF (Do Not Disturb on Windows + phone)
- [ ] Close Slack, Discord, Teams, email — anything that could pop a notification

### Backup Plan
If the live demo fails (network down, API timeout, anything):
- [ ] **Screen recording** of `node examples/triage.js` saved as `presentation/demo-recording.mp4`
  - Record this the night before while the API is confirmed working
  - 30-45 seconds, terminal only, no commentary needed
- [ ] **Screenshot** of triage output saved as `presentation/demo-screenshot.png`
- [ ] Transition line ready: "The venue WiFi has opinions — let me show you the recording from this morning"
- [ ] Do NOT apologise more than once. Just switch and keep going.

### Mental
- [ ] Water bottle on stage
- [ ] Phone on silent, face down
- [ ] Know your first sentence by heart (you never get a second chance at the opening)

---

## THE SCRIPT

---

### [0:00 - 0:30] HOOK — The Crisis

**SHOW:** Title slide. Just the title and your name. Nothing else.

> "openclaw/openclaw has seven thousand open pull requests. Not seven hundred — seven *thousand*. A new one lands every two minutes. Nobody can keep up. Not the maintainers, not the bots, definitely not me."

*Beat. Let that land.*

> "So I built a system where two AI agents — my Claude Code and another contributor's Codex CLI — triage those PRs together. No human in the loop. They talk to each other over an API I'll show you in about four minutes."

**Timing note:** This is 30 seconds. Don't rush the number. "Seven thousand" should hit like a punchline.

---

### [0:30 - 2:00] PRmanager Overview

**SHOW:** Architecture slide. Keep it simple: PostgreSQL -> Express API -> Vite Dashboard. Show the numbers: 48 MCP tools, 27 tables.

> "PRmanager is the thing I built to make sense of this. It's a PR intelligence platform — Express API backed by PostgreSQL with 27 tables, a Vite dashboard for the humans, and 48 MCP tools so AI agents can use it directly."

> "It does three things. First — it scores every PR for merge readiness. CI status, review state, file complexity, staleness. Second — it finds low-hanging fruit. PRs that are *almost* ready to merge but need one small push. Third — it lets agents claim PRs, triage bot comments, and report back."

**SHOW:** Quick flash of the dashboard — switch to browser, show the PR overview tab. 3 seconds max. Don't click around.

> "That's the dashboard. Ten tabs. But the interesting part isn't the UI — it's what happens when you take the human out."

**Timing note:** 90 seconds. The dashboard flash is a teaser, not a demo. Get in, show it exists, get out.

---

### [2:00 - 4:00] The Federation Concept

**SHOW:** Federation architecture slide. Two boxes: "Andrew's Claude Code + PRmanager" and "Will's Codex CLI + GH Search Tool". Arrow between them labeled "HTTPS JSON / Bearer auth".

> "Here's where it gets interesting. I'm not the only person building tools for openclaw. Will — @sparkyrider — built a completely separate PR search tool using Codex and OpenAI embeddings. Different LLM, different stack, different person."

> "The old workflow was embarrassing. I'd find something in PRmanager, copy it into a Claude Desktop chat, paste it to Will on Discord, he'd paste it into his Codex session. Human clipboard relay. That's not AI collaboration — that's two people with extra steps."

**SHOW:** Slide with the old workflow crossed out, new workflow below it.

> "So we built federation. Two independent systems, two repos, one API contract. Will's agent authenticates with a scoped API token — same pattern as Stripe or GitHub — and calls PRmanager directly over HTTPS through Tailscale. Eleven scopes. Read PRs, pick PRs, sync bot comments, send messages back to me. Standard stuff, nothing exotic."

> "The key insight: we don't share a codebase. We don't share a database. We share an *API contract*. His Codex agent and my Claude agent are just HTTP clients to each other."

**Timing note:** 2 minutes. This is the intellectual meat. Don't rush it, but don't over-explain the auth either. "Same pattern as Stripe" is enough — this audience knows what Bearer tokens are.

---

### [4:00 - 5:30] LIVE DEMO

**SHOW:** Switch to terminal. Full screen. Font size 20+.

> "Let me show you what Will's agent actually does."

**TYPE:**
```
node examples/triage.js
```

**Expected output (narrate as it appears):**

```
Authenticated as: will (Will's Codex Agent)
```

> "There's the handshake. Will's token, eleven scopes, authenticated over TLS."

```
--- Dashboard Stats ---
  Open PRs: 7,083
  Ready to merge: 12
  CI failing: ...
```

> "Seven thousand PRs. Twelve ready to merge right now. That's the funnel."

```
--- Ready to Merge (12) ---
  #33608: chore(ci): unblock audit + command spec checks (score: ...)
```

> "And there's the top candidate. Score 89. CI passing, reviews approved, no merge conflicts. That's a PR a bot could merge *right now*."

**IF TIME ALLOWS (you're under 5:00):**

> "Let me show the full workflow."

**TYPE:**
```
node examples/daily-triage.js
```

> "This is the seven-step daily triage. Discover low-hanging fruit, pick the top three, sync their bot comments from GitHub, check CI, assess merge readiness, send a structured report to me, then release the picks. Fully autonomous."

**Let it run. Don't narrate every line — let the output speak. Point at key moments:**
- "There — it just picked three PRs"
- "Syncing bot comments from GitHub live"
- "And there's the summary sent to my agent's inbox"

---

**FALLBACK (if demo fails):**

> "The venue WiFi has opinions today — let me show you the recording from this morning."

**SHOW:** Play `presentation/demo-recording.mp4` or show `presentation/demo-screenshot.png`.

> "Same output. Will's agent authenticated, pulled the stats — seven thousand PRs, twelve ready to merge — picked the top three, triaged them, sent me a report."

**Keep narrating the same story. The recording has the same data. Don't dwell on the failure.**

**Timing note:** 90 seconds for the demo. If `triage.js` works and finishes fast (it takes ~3 seconds), run `daily-triage.js` too. If it's slow or flaky, stick with `triage.js` only and move on.

---

### [5:30 - 6:30] THE PUNCHLINE

**SHOW:** Slide with the three merged PRs. PR numbers, titles, green "merged" badges.

> "This isn't a prototype. I'm an openclaw core contributor. Three merged PRs — gateway routing, test infrastructure, webchat fixes. PRmanager is how I found them. The low-hanging fruit detector flagged them, I triaged them with the same workflow you just saw, and they shipped."

> "So here's the thing nobody talks about at AI meetups: AI is now maintaining AI. openclaw is an AI project. Its PRs are written by AI agents. And now AI agents are *triaging and merging* those PRs. The ouroboros is real."

*Let that sit for a beat.*

> "Two different LLMs — Claude and Codex — built by two different people, running on two different machines, coordinating over a plain HTTP API to maintain a repo that neither of us owns. No orchestrator. No shared memory. Just an API contract and scoped tokens."

**Timing note:** 60 seconds. This is the emotional peak. "AI maintaining AI" is the soundbite they'll remember. Don't undercut it with caveats.

---

### [6:30 - 7:00] CLOSE

**SHOW:** Final slide. GitHub URL, your handle, a QR code if you have one.

> "PRmanager is open source. The federation spec is in the repo — if you're building agent tools and want your agent to talk to mine, the API is live right now. Literally right now — you saw the curl."

> "I'm Andrew. Come find me after if you want to see the dashboard or talk about agent-to-agent auth. Thanks."

**Walk off. Don't linger. Seven minutes means seven minutes.**

---

## TIMING CHEAT SHEET

| Time    | Section               | Duration | What's on screen          |
|---------|-----------------------|----------|---------------------------|
| 0:00    | Hook                  | 0:30     | Title slide               |
| 0:30    | PRmanager overview    | 1:30     | Architecture slide + dashboard flash |
| 2:00    | Federation concept    | 2:00     | Federation diagram slides |
| 4:00    | Live demo             | 1:30     | Terminal (full screen)    |
| 5:30    | Punchline             | 1:00     | Merged PRs slide          |
| 6:30    | Close                 | 0:30     | Final slide + CTA         |
| **7:00** | **Done**             |          |                           |

## EMERGENCY TIME MANAGEMENT

- **Running long at 4:00?** Skip `daily-triage.js`, only run `triage.js`. Saves 30-40 seconds.
- **Running long at 5:30?** Cut the ouroboros line. Go straight to "Two different LLMs..." and then close.
- **Running short at 5:00?** Expand the demo — scroll back through the output, point at specific PR titles, talk about the scoring algorithm.
- **Demo completely fails?** You gain 30 seconds. Use them on the punchline section — tell the story of the three merged PRs in more detail.

## SLIDE INVENTORY

You need exactly 5 slides:

1. **Title** — "Two Agents, One Repo" / Andrew / Vienna AI Engineering / date
2. **Architecture** — PRmanager stack diagram (PostgreSQL, Express, Vite, 48 MCP tools, 27 tables)
3. **Federation** — Two-box diagram showing Andrew's stack and Will's stack connected by HTTPS
4. **Old vs New** — Crossed-out clipboard relay vs direct API (optional — can merge into slide 3)
5. **The Receipts** — Three merged PR screenshots with green badges (#32128, #32183, #32311)
6. **Close** — GitHub URL, handle, "API is live right now"

## PHRASES TO AVOID

- "Um, so basically..." — Start sentences with conviction
- "This is just a side project" — It's running against a real repo with 7K PRs. Own it.
- "I know this is simple but..." — The audience is here to see real things. Simple and working beats complex and theoretical.
- "Can everyone see that?" — If they can't, fix the font size beforehand. Don't ask during the talk.
- "Let me just..." — Cut the filler. Do the thing or don't.

## PHRASES THAT WORK

- "Seven thousand open pull requests." (Let numbers do the work)
- "Same pattern as Stripe." (Instant credibility with this audience)
- "AI maintaining AI." (The soundbite)
- "Two LLMs, two people, one API contract." (The summary)
- "The API is live right now." (Proof over promises)
