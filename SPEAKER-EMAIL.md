# Speaker Submission Email

**To:** viennaaiengineering+speakers@gmail.com
**Subject:** Lightning Talk: "Don't Hack Me, Bro" — Agent-to-Agent Security for OpenClaw

---

Hi Bogdan, Alex, and Georg,

I'd like to submit a lightning talk for the March 10th OpenClaw & Codex night at Magenta HQ.

**Title:** Don't Hack Me, Bro — Agent-to-Agent Security for OpenClaw

**What I'll show (7 min, live demo + 2-3 slides):**

openclaw/openclaw has 7,000+ open PRs. I built PRmanager (80 MCP tools, 31 PostgreSQL tables) to triage them, then federated it with another contributor's Codex agent (Will/@sparkyrider) so our two agents — my Claude Code and his Codex CLI — collaborate on PR triage over HTTPS. No human clipboard relay. We're packaging this as an OpenClaw skill called ForceMultiplier.

The talk covers the real stuff:

- **The federation:** Two different LLMs, two different people, one API contract. Live demo of Will's agent authenticating, pulling stats, picking PRs, and reporting back to mine.
- **The fail:** I red-teamed my own auth gateway with a 32B model (QwQ) that doesn't do sycophancy. It found three FATAL security flaws in code that Claude, GPT, and Gemini all called "solid." Lesson: if every model tells you you're brilliant, you need a model that doesn't care about your feelings.
- **The punchline:** SaaS is copyable — my agent replicated git-tower.com in 30 minutes. Welcome to AaaS (Agents as a Service). It smells like what it sounds like.

I'm an openclaw core contributor with 3 merged PRs (#32128, #32183, #32311) — gateway routing, test infrastructure, and webchat fixes.

Slides are live: https://ademczuk.github.io/prmanager-federation/presentation/slides.html

Cheers,
Andrew

GitHub: https://github.com/ademczuk
PRmanager Federation: https://github.com/ademczuk/prmanager-federation
