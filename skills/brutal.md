Brutal LLM (QwQ-32B) via MCP proxy on Andrew's main workstation. No sugar-coating adversarial analysis for code review, decisions, strategy, claims, CVs, and career advice.

The user wants: $ARGUMENTS

## How It Works

Brutal-mcp is now registered in the MCP proxy pool. All calls go through the unified proxy endpoint:

```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"TOOL_NAME","args":{...}}'
```

## Available Tools

| Tool | Use for | Verdicts |
|------|---------|----------|
| `brutal_status` | Health check (fast, 10s) | `llm_ready: true/false` |
| `brutal_redteam_code` | Adversarial code review | SHIP_IT / SHIP_WITH_FIXES / MAJOR_REFACTOR / REWRITE |
| `brutal_redteam_decision` | Life/career decisions | PROCEED / PROCEED_WITH_CONDITIONS / PAUSE_AND_RECONSIDER / ABORT |
| `brutal_redteam_strategy` | Business strategy, startup ideas | STRONG_PROCEED / PIVOT_REQUIRED / FUNDAMENTAL_FLAW / ABORT |
| `brutal_redteam_claim` | Arguments, beliefs, claims | VALIDATED / CONDITIONALLY_VALID / FLAWED / INVALID |
| `brutal_redteam_cv` | Deep CV vs job description (5-phase) | STRONG_MATCH / TAILOR_AND_APPLY / LONG_SHOT / DO_NOT_APPLY |
| `brutal_career_advice` | Career questions, no sugar-coating | Free-form advice |
| `brutal_cv_reality_check` | Quick CV gap analysis | Recruiter's honest assessment |
| `brutal_score_text` | Job description assessment | Deal-breakers + rejection probability |
| `brutal_assess_job` | Full 4-phase assessment (needs DB job ID) | Multi-phase report |
| `brutal_top_jobs` | Batch assess top unscored jobs | Batch results |

## Steps

1. Parse the user's request to determine which tool
2. If the user mentions code review, decision, strategy, claim, CV, career - use the matching tool
3. If general question - use `brutal_career_advice` with the question as `question` arg
4. Build the curl command with `server: "brutal-mcp"` and the tool name
5. Run via Bash tool
6. Parse JSON response: `result.result.content[0].text` contains the answer
7. Present the result. Brutal responses are intentionally harsh - that's the point.

## Examples

```bash
# Code review
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"brutal_redteam_code","args":{"code":"THE CODE","context":"production auth handler","depth":"standard"}}'

# Career advice
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"brutal_career_advice","args":{"question":"Should I switch to Rust?"}}'

# Red-team a decision
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"brutal_redteam_decision","args":{"decision":"Quit my job to build a startup","context":"5 years savings, no dependents","depth":"standard"}}'

# CV vs job description
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"brutal_redteam_cv","args":{"cv_text":"CV TEXT","job_description":"JD TEXT","depth":"quick"}}'
```

## Rate Limits

- 4 requests/minute (QwQ-32B single GPU)
- 1 concurrent call (queue max 3, then 503)
- Timeouts: 10s status, 120-180s inference tools

## Check Health

```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"brutal-mcp","tool":"brutal_status","args":{}}'
```
