Search openclaw/openclaw codebase using both your local vector search AND Andy's PRmanager intelligence to find context for PR work.

The user wants: $ARGUMENTS

## Your Search Arsenal

You have two search backends plus GitHub CLI:

### 1. Your Local Vector Search (598K chunks, fast)
Your GH Search Tool has 598K search chunks with OpenAI embeddings. Use it for:
- Finding similar code patterns
- Understanding how a function/module is used across the codebase
- Semantic search ("how does authentication work")

```bash
# Via your own /v1/search/context endpoint
curl -s -X POST http://localhost:YOUR_PORT/v1/search/context \
  -H 'Content-Type: application/json' \
  -d '{"query": "YOUR SEARCH", "repository": "openclaw/openclaw", "top_k": 10, "request_id": "'$(uuidgen)'"}'

# Via your /v1/search/query (NLP)
curl -s -X POST http://localhost:YOUR_PORT/v1/search/query \
  -H 'Content-Type: application/json' \
  -d '{"query": "What PRs touched the auth middleware in the last month?"}'
```

### 2. Andy's PRmanager (PR intelligence, CI, bot analysis)
For PR-specific intelligence that your vector search doesn't have:

```bash
# Search PRs by keyword
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/prs/search?q=KEYWORD&limit=10"

# Domain context for a specific PR
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/domain-context/$PR"

# Related merged PRs (find prior art)
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/domain-context/$PR/related"

# Federated search (queries YOUR vector search through Andy's proxy)
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/federation/search" \
  -d '{"query": "SEARCH TERM", "repository": "openclaw/openclaw", "top_k": 10}'
```

### 3. GitHub CLI (direct GitHub search)
For live GitHub state that may not be in either database yet:

```bash
# Search code
gh search code "PATTERN" -R openclaw/openclaw --limit 10

# Search issues
gh search issues "KEYWORD" -R openclaw/openclaw --limit 10

# Search PRs (including closed - important for prior art)
gh search prs "KEYWORD" -R openclaw/openclaw --limit 10

# Search commits
gh search commits "KEYWORD" -R openclaw/openclaw --limit 10

# Check if someone already attempted the same fix
gh search prs "ISSUE_NUMBER" -R openclaw/openclaw --match title,body --limit 20
```

### 4. Andy's AI Tools (deep analysis via MCP proxy)
For questions that need reasoning, not just search:

```bash
# Pantheon query (auto-routes to best model)
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -d '{"server":"pantheon","tool":"pantheon_query","args":{"query":"YOUR QUESTION","mode":"sync"}}'

# Deep research (multi-source synthesis)
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -d '{"server":"google-deep-research","tool":"quick_research","args":{"topic":"YOUR TOPIC"}}'

# Semantic search in Andy's Obsidian vault
curl -s -X POST -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -d '{"server":"hermes-unified","tool":"semantic_search","args":{"query":"YOUR QUERY","topK":5}}'
```

## Search Patterns for Common PR Tasks

### Finding Prior Art (MANDATORY before creating any PR)
```bash
ISSUE=12345
# Check if someone already attempted this
gh search prs "$ISSUE" -R openclaw/openclaw --match title,body --limit 20
gh search prs "KEYWORD FROM ISSUE" -R openclaw/openclaw --state closed --limit 10
# Check closed PRs - barnacle bot closes stale PRs, work may still be valid
```

### Understanding a Module Before Changing It
```bash
MODULE="auth-middleware"
# Your vector search for semantic understanding
# Andy's PRmanager for recent PR activity on the module
curl -s -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  "$PRMANAGER_URL/api/prs/search?q=$MODULE&limit=10" | jq '.data[] | {id: .pr_number, title, state, merged_at}'
# GitHub for code-level search
gh search code "$MODULE" -R openclaw/openclaw --limit 10
# Git log for recent changes
gh api repos/openclaw/openclaw/commits -q '.[].commit.message' --paginate | head -50 | grep -i "$MODULE"
```

### Checking for Competing PRs
```bash
FILE="src/path/to/file.ts"
# PRs that touch the same file
gh pr list -R openclaw/openclaw --search "involves:$FILE" --limit 10
# Or search by the function/class you're modifying
gh search prs "FUNCTION_NAME" -R openclaw/openclaw --state open --limit 10
```

### Understanding Reviewer Preferences
```bash
REVIEWER="altaywtf"
# What have they reviewed recently?
gh search prs "reviewed-by:$REVIEWER" -R openclaw/openclaw --state merged --limit 10
# What do they care about? (read their review comments)
gh api repos/openclaw/openclaw/pulls/comments --paginate -q '.[] | select(.user.login == "'$REVIEWER'") | .body' | head -50
```

## Rules

- ALWAYS check for prior art before creating a new PR
- Credit prior art authors if you build on their work
- Use your vector search for broad semantic queries, gh CLI for exact matches
- Combine sources: your search finds the context, PRmanager finds the PR intelligence, gh CLI finds the live state
- Don't over-search - if you found what you need, stop and act on it
