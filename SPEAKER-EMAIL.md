# Speaker Submission Email

**To:** viennaaiengineering+speakers@gmail.com
**Subject:** Lightning Talk Submission: "Don't Hack Me, Bro"

---

Hi Bogdan, Alex, and Georg,

Keen to submit a lightning talk for the March 10th OpenClaw & Codex night at Magenta HQ.

**Title:** Don't Hack Me, Bro

**Format:** 7 minutes. Live demo, couple of slides.

**The gist:** openclaw/openclaw has over 7,000 open pull requests. I built PRmanager to triage them. Then another contributor plugged his Codex agent into mine over HTTPS, and the results got better on both sides. His search gives my triage context it could never generate alone. My scoring gives his search a direction it never had. We're calling it ForceMultiplier because that is literally what it does. It's being packaged as an OpenClaw skill.

Here's what the talk actually covers:

- **Federation demo.** Two LLMs (my Claude Code, Will's Codex CLI), two different people, one API contract. Another person's agent making yours better, and vice versa. I'll run the live handshake on stage.
- **The anti-sycophant.** I red-teamed my own auth gateway with QwQ-32B because every other model kept telling me the code was solid. It wasn't. QwQ found three FATAL flaws that Claude, GPT, and Gemini missed. Turns out you need at least one model that doesn't care about your feelings.
- **AaaS.** My agent replicated git-tower.com in 30 minutes. Not a joke. SaaS is trivially copyable now, which means we've entered the age of Agents as a Service. Peter Steinberger says it smells like a clanker. I reckon it smells like what AaaS sounds like.

I'm a core contributor on openclaw with 3 merged PRs (#32128, #32183, #32311). Gateway routing, test infra, webchat fixes.

Slides: https://ademczuk.github.io/prmanager-federation/presentation/slides.html

If you need a stage intro, here's something short:

> Andrew Demczuk, MSc, is a Sydneysider in Vienna with 21 years in Australian government and three merged PRs on OpenClaw. He built an AI recruitment engine that sorts through a hundred thousand job listings, all in an effort to apply himself. Turns out OpenClaw had seven thousand open pull requests that needed the same treatment. "Don't Hack Me, Bro."

Cheers,
Andrew

GitHub: https://github.com/ademczuk
Repo: https://github.com/ademczuk/prmanager-federation
