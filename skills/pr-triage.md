Find, evaluate, and claim PRs on openclaw/openclaw for contribution.

The user wants: $ARGUMENTS

## Prerequisites

- `gh` CLI authenticated with GitHub
- `PRMANAGER_URL` and `PRMANAGER_TOKEN` in `.env`
- Node.js 18+ (for prmanager-client.js SDK calls)

## Phase 1: Discover What Needs Attention

Run these in parallel to build a picture of what's available:

```bash
# Low-hanging fruit - PRs scored for easy wins
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/low-hanging-fruit?limit=15" | jq '.data[:10] | .[] | {id: .pr_number, title: .title, score: .score, category: .category, state: .action_state}'

# Merge-ready PRs (CI pass + approved, just need someone to push them over)
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -X POST "$PRMANAGER_URL/api/federation/queries/merge_ready" | jq '.data[:10] | .[] | {id: .pr_number, title: .title}'

# PRs needing review
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -X POST "$PRMANAGER_URL/api/federation/queries/needs_review" | jq '.data[:10] | .[] | {id: .pr_number, title: .title}'

# Category breakdown
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -X POST "$PRMANAGER_URL/api/federation/queries/category_summary" | jq '.data'

# Stale PRs (30+ days untouched - might be abandoned, ripe for taking over)
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -X POST "$PRMANAGER_URL/api/federation/queries/stale_prs?limit=10" | jq '.data[:5] | .[] | {id: .pr_number, title: .title, days_stale: .days_since_update}'
```

Also check GitHub directly:
```bash
# Open issues labeled "good first issue" or "help wanted"
gh issue list -R openclaw/openclaw -l "good first issue" --limit 10
gh issue list -R openclaw/openclaw -l "help wanted" --limit 10

# Recently merged PRs (understand what's landing, avoid conflicts)
gh pr list -R openclaw/openclaw --state merged --limit 10
```

## Phase 2: Evaluate a Candidate PR

For each interesting PR, gather deep context:

```bash
PR=12345  # replace with actual PR number

# PRmanager enriched data (bot comments, CI, readiness, domain context)
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" "$PRMANAGER_URL/api/prs/$PR" | jq '{title, state, category, action_state, ci_status, review_state}'

# Bot triage recommendation
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" "$PRMANAGER_URL/api/bot-review/triage/$PR" | jq '.'

# CI checks
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" "$PRMANAGER_URL/api/prs/$PR/checks" | jq '.data[] | {name, status, conclusion}'

# Domain context (what area of the codebase, related PRs)
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" "$PRMANAGER_URL/api/domain-context/$PR" | jq '.'

# GitHub diff size
gh pr view $PR -R openclaw/openclaw --json additions,deletions,changedFiles | jq '{additions, deletions, changedFiles}'

# GitHub review threads (check for unresolved conversations)
gh pr view $PR -R openclaw/openclaw --json reviewThreads | jq '.reviewThreads | length as $total | [.[] | select(.isResolved == false)] | length as $unresolved | {total: $total, unresolved: $unresolved}'
```

### Evaluation Criteria (pick PRs that score well)

| Signal | Good | Bad |
|--------|------|-----|
| Changed files | < 10 | > 30 |
| Additions | < 500 | > 2000 |
| CI status | passing or fixable | systemic failures |
| Bot comments | cosmetic/style only | security, architecture |
| Review threads | few, resolved | many unresolved |
| Last activity | < 14 days | > 30 days (may be abandoned) |
| Category | bug-fix, docs, tests | core-refactor, breaking-change |
| Stacked PRs | none | deep dependency chain |

## Phase 3: AI-Powered Deep Analysis (Optional)

Use Andy's MCP proxy for adversarial analysis:

```bash
# Get the diff
DIFF=$(gh pr diff $PR -R openclaw/openclaw)

# Brutal code review (QwQ-32B adversarial analysis)
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -d "{\"server\":\"brutal-mcp\",\"tool\":\"brutal_redteam_code\",\"args\":{\"code\":$(echo "$DIFF" | head -200 | jq -Rs .),\"context\":\"PR #$PR on openclaw/openclaw\",\"depth\":\"quick\"}}"

# Pantheon query for architectural concerns
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -d "{\"server\":\"pantheon\",\"tool\":\"pantheon_query\",\"args\":{\"query\":\"Analyze this PR diff for openclaw. Is it safe to merge? Key concerns? $(echo "$DIFF" | head -100)\"}}"
```

## Phase 4: Claim and Report

Once you've chosen a PR to work on:

```bash
PR=12345

# Claim it in PRmanager (prevents double-work with Andy)
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/prs/$PR/pick"

# Record triage assessment
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/prs/$PR/triage" \
  -d '{"status": "triaged"}'

# Let Andy know what you're working on
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/agent/messages" \
  -d "{\"to_agent\":\"andrew\",\"subject\":\"Claimed PR #$PR\",\"body\":\"Working on PR #$PR. Plan: [brief description of your approach]\"}"
```

## Phase 5: Produce a Triage Report

Output a structured summary:

```
## PR Triage Report

**PR**: #12345 — Title
**Category**: bug-fix | feature | refactor | docs | tests
**Risk**: LOW | MEDIUM | HIGH
**Effort**: SMALL (< 2h) | MEDIUM (2-8h) | LARGE (> 8h)

### Why This PR
- [reason it's a good pick]

### CI Status
- [list check results]

### Bot Findings
- [summarize bot comments, if any]

### Plan
1. [step 1]
2. [step 2]

### Blockers
- [any blockers or dependencies]
```

## Rules

- NEVER claim more than 3 PRs simultaneously
- If a PR has unresolved review threads from maintainers, address those first
- Check for stacked/dependent PRs before starting work
- If CI is failing on things unrelated to the PR, note it but don't let it block triage
- Always message Andy when claiming/unclaiming to avoid stepping on each other
