Work a claimed PR through its lifecycle: fix CI, address bot comments, update description, get it merge-ready.

The user wants: $ARGUMENTS

## Prerequisites

- PR already claimed via `/pr-triage` or manually
- `gh` CLI authenticated
- `PRMANAGER_URL` and `PRMANAGER_TOKEN` in `.env`
- Local clone of openclaw/openclaw

## Phase 1: Set Up Local Workspace

```bash
PR=12345  # replace

# Fetch the PR branch
gh pr checkout $PR -R openclaw/openclaw

# Check current state
git log --oneline -5
gh pr view $PR -R openclaw/openclaw --json title,state,headRefName,baseRefName,mergeable
```

## Phase 2: CI Triage

```bash
# Get CI status from PRmanager (enriched with bot analysis)
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/prs/$PR/checks" | jq '.data[] | {name, status, conclusion}'

# Or directly from GitHub
gh pr checks $PR -R openclaw/openclaw
```

### CI Fix Decision Tree

| CI Failure | Action |
|------------|--------|
| Lint/format | Auto-fix: `pnpm lint --fix`, commit |
| Type errors | Fix the types. Don't use `@ts-ignore` or `any` |
| Unit tests | Read the failing test, fix the code or update the test if the test is wrong |
| Integration tests | Check if it's a flaky test (search merged PRs for same failure) |
| Build failure | Usually a missing import or dependency — fix it |
| Unrelated failure | Note in PR comment, don't block on it |

```bash
# Common openclaw fix cycle
pnpm install
pnpm build
pnpm lint --fix
pnpm test -- --filter="affected-package"
```

**IMPORTANT**: Never use `@ts-nocheck`, `eslint-disable`, or skip tests to make CI green. Fix the actual issue.

## Phase 3: Address Bot Comments

```bash
# Get bot review comments from PRmanager
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/bot-review/comments/$PR" | jq '.data[] | {bot: .bot_name, file: .file_path, line: .line_number, body: .body[:200]}'

# Sync latest bot comments from GitHub (in case new ones appeared)
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/bot-review/sync/$PR"
```

### Bot Comment Response Strategy

| Bot | Typical Findings | Response |
|-----|-----------------|----------|
| **Greptile** | Code quality, patterns, suggestions | Address valid ones, ignore style-only |
| **Barnacle** | Stale PR warnings | Update PR to show activity |
| **Codex** | Auto-generated review | Address security/correctness, skip nits |
| **CodeRabbit** | Detailed review | Address substantive items |

For each actionable bot comment:
1. Read the suggestion
2. If valid, implement the fix
3. Reply to the thread confirming the fix (or explaining why you disagree)

```bash
# Reply to a review thread
gh api repos/openclaw/openclaw/pulls/$PR/comments \
  --method POST \
  -f body="Fixed in latest commit — [brief explanation]"
```

## Phase 4: Update PR Description

A good PR description speeds up reviewer approval. Check the existing one and improve if needed:

```bash
# Get current PR body
gh pr view $PR -R openclaw/openclaw --json body | jq -r '.body'
```

A merge-ready PR description should have:
- **What**: one-line summary of the change
- **Why**: link to issue or explain motivation
- **How**: brief technical approach
- **Testing**: what you tested and how
- **Screenshots**: if UI changes (use `gh pr edit` to update)

```bash
# Update PR description
gh pr edit $PR -R openclaw/openclaw --body "$(cat <<'EOF'
## What
[one-line summary]

## Why
Fixes #ISSUE_NUMBER
[or: explain the motivation]

## How
[brief technical approach - 2-3 sentences max]

## Testing
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] Manual testing: [describe what you tested]
EOF
)"
```

## Phase 5: Rebase and Resolve Conflicts

```bash
# Check if branch is behind main
gh pr view $PR -R openclaw/openclaw --json mergeStateStatus | jq -r '.mergeStateStatus'

# Rebase onto latest main
git fetch origin main
git rebase origin/main

# If conflicts:
# 1. Resolve manually
# 2. git add .
# 3. git rebase --continue
# 4. Force push (the PR branch, not main)
git push --force-with-lease
```

## Phase 6: Request Review / Final Push

```bash
# Verify all checks pass
gh pr checks $PR -R openclaw/openclaw

# If all green, request review from appropriate maintainer
# Domain mapping (openclaw/openclaw):
#   Agents/failover/auth -> altaywtf, frankekn
#   ACP/docs -> onutc, jalehman
#   Gateway/web-UI -> Takhoffman
#   CLI/Docker -> vincentkoc (fallback only)

gh pr edit $PR -R openclaw/openclaw --add-reviewer USERNAME

# Update PRmanager status
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/prs/$PR/triage" \
  -d '{"status": "review-requested"}'

# Notify Andy
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/agent/messages" \
  -d "{\"to_agent\":\"andrew\",\"subject\":\"PR #$PR ready for review\",\"body\":\"CI green, bot comments addressed, review requested from [reviewer]. Ready for merge.\"}"
```

## Phase 7: AI-Assisted Pre-Submit Check (Optional)

Before requesting review, run a quick adversarial check on your changes:

```bash
# Get your diff against main
DIFF=$(git diff origin/main...HEAD)

# Brutal code review
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -d "{\"server\":\"brutal-mcp\",\"tool\":\"brutal_redteam_code\",\"args\":{\"code\":$(echo "$DIFF" | head -300 | jq -Rs .),\"context\":\"PR #$PR openclaw contribution\",\"depth\":\"quick\"}}"
```

If the verdict is SHIP_WITH_FIXES or worse, address the findings before requesting review.

## Rules

- NEVER force-push to someone else's branch without asking
- NEVER add `@ts-nocheck` or `eslint-disable` to make CI pass
- NEVER touch files outside the PR's scope (scope creep = rejection)
- If you can't fix a CI failure, ask for help rather than hacking around it
- Keep commits clean: squash fixup commits before requesting review
- Reply to ALL unresolved review threads before requesting re-review
- If the PR has been open > 30 days, check if main has diverged significantly
