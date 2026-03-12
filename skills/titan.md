Titan Agentic system on Andy's main workstation. Autonomous task execution with long-term memory and strategy learning.

The user wants: $ARGUMENTS

## Available Tools

### 1. Execute (autonomous agent)
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"titan-agentic","tool":"agent_execute","args":{"query":"TASK TO EXECUTE","mode":"sync"}}'
```

For long-running tasks, use async:
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"titan-agentic","tool":"agent_execute","args":{"query":"LONG TASK","mode":"async"}}'
```

### 2. Memory Query
Search past episodes and lessons:
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"titan-agentic","tool":"agent_memory_query","args":{"query":"SEARCH TERM"}}'
```

### 3. Job Status (async)
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"titan-agentic","tool":"agent_job_status","args":{"jobId":"JOB_ID"}}'
```

### 4. Training Feedback
Improve strategy selection:
```bash
curl -s -X POST http://192.168.0.36:3099/api/federation/mcp-proxy \
  -H 'Content-Type: application/json' \
  -d '{"server":"titan-agentic","tool":"agent_train","args":{"strategy":"direct","success":true,"feedback":"Good result"}}'
```

## Steps

1. Parse user's request into a task description
2. For simple tasks → agent_execute sync mode
3. For complex/long tasks → agent_execute async mode, then poll with agent_job_status
4. Parse JSON response: `result.content[0].text`
5. Present result to user
