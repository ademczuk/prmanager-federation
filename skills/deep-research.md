Google Deep Research on Andy's main workstation. Recursive web research with Gemini, YouTube transcripts, and project analysis.

The user wants: $ARGUMENTS

## Available Tools

### 1. Deep Research (recursive, thorough)
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"google-deep-research","tool":"deep_research","args":{"topic":"RESEARCH TOPIC","recursion_depth":2}}'
```

### 2. Quick Research (LLM knowledge only, no web)
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"google-deep-research","tool":"quick_research","args":{"topic":"TOPIC"}}'
```

### 3. Recursive Research (breaks into sub-questions)
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"google-deep-research","tool":"recursive_research","args":{"topic":"COMPLEX TOPIC"}}'
```

### 4. Guided Research (with template)
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"google-deep-research","tool":"guided_research","args":{"topic":"TOPIC","template":"technical_deep_dive"}}'
```

### 5. YouTube Transcript
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"google-deep-research","tool":"get_youtube_transcript","args":{"video_url":"https://youtube.com/watch?v=XXX"}}'
```

### 6. List Templates
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"google-deep-research","tool":"list_templates","args":{}}'
```

## Routing Rules

1. Quick factual question → quick_research (fast, no web)
2. Deep topic needing multiple sources → deep_research (recursion_depth 2-3)
3. Complex topic with sub-questions → recursive_research
4. Technical evaluation → guided_research with "technical_deep_dive" template
5. YouTube video summary → get_youtube_transcript

## Steps

1. Determine research depth needed
2. Build curl command with appropriate tool
3. Run via Bash tool (deep_research can take 60-120s)
4. Parse JSON response: `result.content[0].text`
5. Present findings to user

## Notes
- deep_research and recursive_research can take 1-3 minutes
- quick_research is fast (5-10s) but uses only LLM knowledge, no web
- All research uses Google Gemini models
