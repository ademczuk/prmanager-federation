Multi-model orchestration via Trident proxy on Andrew's main workstation. Route prompts to Codex (GPT-5.4), Gemini (3.1 Pro), Grok (4.20), or all three.

The user wants: $ARGUMENTS

## Available Models
- **codex** — GPT-5.4, best for code generation, refactoring, tests
- **gemini** — Gemini 3.1 Pro, best for research, analysis, large context
- **gemini-flash** — Gemini 2.5 Flash, fastest, good for quick drafts
- **grok** — Grok 4.20, best for reasoning, math, code review

## How to Use

Parse the user's request to determine the model and prompt. Then call the proxy:

```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/trident \
  -H 'Content-Type: application/json' \
  -d '{"model":"MODEL","prompt":"PROMPT"}'
```

For JSON-formatted output, add `"flags":{"json":true}`.
For auto-fallback on failure, add `"flags":{"fallback":true}`.

The response has: `{"ok":true,"model":"...","response":"..."}`.

## Routing Rules (pick the best model)

1. Code generation, refactoring, tests → **codex**
2. Research, summarisation, analysis → **gemini**
3. Quick draft, fast answer → **gemini-flash**
4. Math, logic, hard reasoning, code review → **grok**
5. If the user says "ask all" or "consensus" → run ALL models sequentially, compare outputs
6. If unclear → default to **codex** for code tasks, **gemini** for everything else

## Steps

1. Determine which model to use based on the routing rules above
2. Run the curl command via Bash tool with the selected model and prompt
3. Parse the JSON response and extract the `response` field
4. Present the result to the user, noting which model was used
5. If the model fails (502 error), try the next model in the fallback chain: codex → grok → gemini → gemini-flash

## Check Proxy Health

```bash
curl -s http://192.168.0.36:3099/api/federation/proxy-status | python3 -m json.tool
```

## Examples

- `/trident ask codex to write a fibonacci function` → model=codex
- `/trident what are the trade-offs of Redis vs Memcached?` → model=gemini
- `/trident review this code for bugs` → model=grok
- `/trident quick summary of this error log` → model=gemini-flash
