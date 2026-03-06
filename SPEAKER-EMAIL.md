# Speaker Submission Email

**To:** viennaaiengineering+speakers@gmail.com
**Subject:** Lightning Talk: Two AI Agents Maintaining OpenClaw — PRmanager Federation

---

Hi Bogdan, Alex, and Georg,

I'd like to submit a lightning talk for the March 10th OpenClaw & Codex night.

**Title:** Two Agents, One Repo — How We Built Agent-to-Agent PR Triage for OpenClaw

**What I'll show:**

openclaw/openclaw gets a new PR every two minutes — 6,800+ open right now. I built PRmanager, a PR intelligence platform with 48 MCP tools that reduces that firehose to a prioritised merge-ready queue. But the interesting part: I've federated it with another contributor's Codex agent (Will/@sparkyrider) so our two agents — my Claude Code and his Codex CLI — collaborate on PR triage over a secure HTTP API, no human intermediary.

The demo: two different LLMs, two different people, working the same GitHub repo autonomously. Agent picks PR, syncs bot comments, classifies false positives, checks merge readiness, sends a structured report to the other agent. Standard API key auth (SHA-256 hashed tokens, same pattern as Stripe).

I'm an openclaw core contributor with 3 merged PRs (#32128, #32183, #32311) — gateway routing, test infrastructure, and webchat fixes.

**Why the audience needs to see this:**

This isn't a hypothetical — it's running in production right now against the real openclaw repo. It's the first example I know of where two people's AI agents (Claude + Codex) coordinate autonomously on open-source maintenance. Directly on-theme for the meetup.

Happy to do a live demo or have a recorded fallback ready.

Cheers,
Andrew

GitHub: https://github.com/ademczuk
PRmanager Federation: https://github.com/ademczuk/prmanager-federation
