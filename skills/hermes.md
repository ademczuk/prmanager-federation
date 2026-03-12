Multi-model AI chat and agentic queries via Hermes on Andy's main workstation. Route prompts to OpenAI, Anthropic, Grok, or Gemini. Includes agentic mode with 4-model consensus and autonomous planning.

The user wants: $ARGUMENTS

## Available Modes

### 1. Quick Chat (hermes-unified: ai_chat_send)
Send a prompt to any AI model:
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"hermes-unified","tool":"ai_chat_send","args":{"model":"MODEL","message":"PROMPT"}}'
```

**Models**: `openai/gpt-4`, `anthropic/claude-sonnet-4-5`, `grok`, `gemini`
**Aliases**: `chatgpt`, `claude`, `sonnet`, `grok`, `gemini`

### 2. Semantic Search (hermes-unified: semantic_search)
Search Andy's Obsidian vault using RAG with reranking:
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"hermes-unified","tool":"semantic_search","args":{"query":"SEARCH QUERY","topK":5}}'
```

### 3. Agentic Query (hermes-agentic: agentic_query)
Complex queries with intelligent delegation (4-model consensus for hard problems):
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"hermes-agentic","tool":"agentic_query","args":{"query":"COMPLEX QUESTION","mode":"sync","timeout":120000}}'
```

Complexity tiers: <20 = fast single-model, 20-50 = enhanced, 50-70 = Claude 4K, 70+ = full 4-model consensus.

### 4. List Providers
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"hermes-unified","tool":"ai_chat_list_providers","args":{}}'
```

## Routing Rules

1. Simple question, quick answer needed → ai_chat_send with `gemini` (fast)
2. Code generation or review → ai_chat_send with `chatgpt` or `claude`
3. Complex analysis, multi-step reasoning → agentic_query (auto-delegates)
4. Search Andy's notes/documentation → semantic_search
5. If user says "ask all" or "consensus" → agentic_query (triggers 4-model consensus)

## Steps

1. Parse the user's request to determine which mode and model
2. Build the curl command with the right server, tool, and args
3. Run via Bash tool
4. Parse JSON response: `result.content[0].text` contains the answer
5. Present the result to the user

## Check Health
```bash
curl -s http://192.168.0.36:3099/api/federation/proxy-status | python3 -m json.tool
```
