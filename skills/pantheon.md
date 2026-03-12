Pantheon multi-model orchestration on Andy's main workstation. Tier-based query routing, council deliberation, memory, and budget management.

The user wants: $ARGUMENTS

All calls use the **authenticated remote endpoint** (works over Tailscale Funnel).
Requires `PRMANAGER_URL` and `PRMANAGER_TOKEN` env vars (from `.env`).

## Available Tools

### 1. Query (auto-routes by complexity)
```bash
curl -s -X POST "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_query","args":{"query":"YOUR QUESTION","mode":"sync"}}'
```

For complex queries that may timeout, use async mode:
```bash
curl -s -X POST "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_query","args":{"query":"COMPLEX QUESTION","mode":"async"}}'
```

### 2. Council (multi-model deliberation with peer review)
For important decisions requiring consensus:
```bash
curl -s -X POST "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_council","args":{"query":"IMPORTANT QUESTION","mode":"async"}}'
```

### 3. Route (analyze without executing)
See which tier and model would handle a query:
```bash
curl -s -X POST "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_route","args":{"query":"TASK DESCRIPTION"}}'
```

### 4. Memory
Store and search knowledge:
```bash
# Store
curl -s -X POST "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_memory_store","args":{"content":"FACT TO REMEMBER","category":"fact"}}'

# Search
curl -s -X POST "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_memory_search","args":{"query":"SEARCH TERM"}}'
```

### 5. Budget Check
```bash
curl -s -X POST "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_budget","args":{}}'
```

### 6. Async Job Status
```bash
curl -s -X POST "$PRMANAGER_URL/api/federation/mcp-proxy-remote" \
  -H "Authorization: Bearer $PRMANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"server":"pantheon","tool":"pantheon_job_status","args":{"jobId":"JOB_ID"}}'
```

## Routing Rules

1. Simple factual query → pantheon_query (auto-routes to fast tier)
2. Important decision, architecture choice → pantheon_council (full deliberation)
3. Want to preview routing → pantheon_route (no execution)
4. Need to check async result → pantheon_job_status
5. Store learnings → pantheon_memory_store

## Steps

1. Determine complexity: simple question → query, important decision → council
2. Build curl command with appropriate tool and args
3. Run via Bash tool
4. Parse JSON response: `result.content[0].text` has the answer
5. For async jobs: extract jobId, poll with pantheon_job_status until complete
6. Present result to user
