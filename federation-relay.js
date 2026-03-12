#!/usr/bin/env node
/**
 * Federation Relay — send commands to remote workstations via PRmanager API.
 *
 * Usage:
 *   node federation-relay.js send <nodeId> <prompt>       # queue a command
 *   node federation-relay.js send-file <nodeId> <file>    # queue file contents as command
 *   node federation-relay.js status [commandId]           # check command status
 *   node federation-relay.js pending <nodeId>             # list pending commands for a node
 *   node federation-relay.js list                         # list recent commands
 *   node federation-relay.js wait <commandId> [timeout]   # poll until complete (default 300s)
 *   node federation-relay.js nodes                        # list registered nodes + agents
 *
 * Environment:
 *   FEDERATION_API  — PRmanager API base URL (default: http://localhost:3099)
 */

import { readFileSync } from 'fs';

const API = process.env.FEDERATION_API || 'http://localhost:3099';

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}

// ── Commands ────────────────────────────────────────────────

async function sendCommand(nodeId, prompt, agentId = null) {
  const payload = { prompt };
  const result = await post('/api/federation/commands', {
    nodeId,
    agentId: agentId || `${nodeId.replace('workstation-', 'ws')}-claude-cli`,
    commandType: 'execute',
    payload,
  });
  if (result.ok) {
    console.log(`Command queued: ${result.command.id}`);
    console.log(`  Node: ${nodeId}`);
    console.log(`  Status: ${result.command.status}`);
    console.log(`  Created: ${result.command.created_at}`);
    console.log(`\nThe remote node will pick this up on its next poll cycle.`);
    console.log(`Check status: node federation-relay.js status ${result.command.id}`);
    console.log(`Wait for result: node federation-relay.js wait ${result.command.id}`);
  } else {
    console.error('Failed to queue command:', result);
  }
  return result;
}

async function sendFile(nodeId, filePath, agentId = null) {
  const content = readFileSync(filePath, 'utf8');
  console.log(`Sending file: ${filePath} (${content.length} bytes)`);
  return sendCommand(nodeId, content, agentId);
}

async function getStatus(commandId) {
  if (commandId) {
    // Get specific command from the list
    const data = await get('/api/federation/commands');
    const cmd = data.commands?.find(c => c.id === commandId);
    if (!cmd) {
      console.log(`Command ${commandId} not found`);
      return null;
    }
    printCommand(cmd);
    return cmd;
  } else {
    // List all recent
    return listCommands();
  }
}

async function listPending(nodeId) {
  const data = await get(`/api/federation/commands/pending?node_id=${nodeId}`);
  if (!data.commands?.length) {
    console.log(`No pending commands for ${nodeId}`);
    return [];
  }
  console.log(`${data.commands.length} pending command(s) for ${nodeId}:\n`);
  data.commands.forEach(printCommand);
  return data.commands;
}

async function listCommands() {
  const data = await get('/api/federation/commands');
  if (!data.commands?.length) {
    console.log('No recent commands');
    return [];
  }
  console.log(`${data.commands.length} recent command(s):\n`);
  data.commands.forEach(printCommand);
  return data.commands;
}

async function waitForCommand(commandId, timeoutSec = 300) {
  const start = Date.now();
  const deadline = start + (timeoutSec * 1000);
  let lastStatus = '';

  process.stdout.write(`Waiting for ${commandId.slice(0, 8)}...`);

  while (Date.now() < deadline) {
    const data = await get('/api/federation/commands');
    const cmd = data.commands?.find(c => c.id === commandId);

    if (!cmd) {
      console.log(` not found`);
      return null;
    }

    if (cmd.status !== lastStatus) {
      process.stdout.write(` ${cmd.status}`);
      lastStatus = cmd.status;
    }

    if (cmd.status === 'succeeded') {
      console.log(` (${((Date.now() - start) / 1000).toFixed(1)}s)`);
      console.log('\n--- Result ---');
      if (cmd.result) {
        console.log(typeof cmd.result === 'string' ? cmd.result : JSON.stringify(cmd.result, null, 2));
      }
      return cmd;
    }

    if (cmd.status === 'failed') {
      console.log(` (${((Date.now() - start) / 1000).toFixed(1)}s)`);
      console.error('\n--- Error ---');
      console.error(cmd.error || 'No error detail');
      return cmd;
    }

    // Poll every 3s
    await new Promise(r => setTimeout(r, 3000));
    process.stdout.write('.');
  }

  console.log(` TIMEOUT after ${timeoutSec}s`);
  return null;
}

async function listNodes() {
  const data = await get('/api/agents');
  if (!data.nodes?.length) {
    console.log('No registered nodes');
    return [];
  }
  for (const node of data.nodes) {
    const icon = node.status === 'healthy' ? '+' : node.status === 'degraded' ? '~' : '-';
    console.log(`[${icon}] ${node.nodeId}: ${node.status} (${node.online}/${node.total} agents online)`);
    for (const agent of node.agents) {
      const s = agent.status === 'online' ? '+' : '-';
      const cmd = agent.command_endpoint ? ` [cmd: ${agent.command_endpoint}]` : '';
      console.log(`    [${s}] ${agent.display_name} (${agent.agent_type})${cmd}`);
    }
  }
  return data.nodes;
}

function printCommand(cmd) {
  const status = {
    queued: 'QUEUED',
    claimed: 'CLAIMED',
    succeeded: 'DONE',
    failed: 'FAILED',
  }[cmd.status] || cmd.status.toUpperCase();

  const prompt = cmd.payload?.prompt || '';
  const preview = prompt.length > 120 ? prompt.slice(0, 120) + '...' : prompt;
  const age = timeSince(cmd.created_at);

  console.log(`  [${status}] ${cmd.id.slice(0, 8)}  ${cmd.node_id}/${cmd.agent_id || '*'}  ${age}`);
  console.log(`           ${preview}`);
  if (cmd.error) console.log(`           ERROR: ${cmd.error}`);
  if (cmd.result) {
    const r = typeof cmd.result === 'string' ? cmd.result : JSON.stringify(cmd.result);
    console.log(`           Result: ${r.slice(0, 120)}`);
  }
  console.log('');
}

function timeSince(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}

// ── CLI ─────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'send':
    if (args.length < 2) {
      console.error('Usage: federation-relay.js send <nodeId> <prompt>');
      process.exit(1);
    }
    await sendCommand(args[0], args.slice(1).join(' '));
    break;

  case 'send-file':
    if (args.length < 2) {
      console.error('Usage: federation-relay.js send-file <nodeId> <filePath>');
      process.exit(1);
    }
    await sendFile(args[0], args[1]);
    break;

  case 'status':
    await getStatus(args[0]);
    break;

  case 'pending':
    if (!args[0]) {
      console.error('Usage: federation-relay.js pending <nodeId>');
      process.exit(1);
    }
    await listPending(args[0]);
    break;

  case 'list':
    await listCommands();
    break;

  case 'wait':
    if (!args[0]) {
      console.error('Usage: federation-relay.js wait <commandId> [timeoutSec]');
      process.exit(1);
    }
    await waitForCommand(args[0], parseInt(args[1]) || 300);
    break;

  case 'nodes':
    await listNodes();
    break;

  default:
    console.log(`Federation Relay — send commands to remote workstations

Usage:
  node federation-relay.js send <nodeId> <prompt>       Queue a command
  node federation-relay.js send-file <nodeId> <file>    Queue file as command
  node federation-relay.js status [commandId]           Check status
  node federation-relay.js pending <nodeId>             List pending for node
  node federation-relay.js list                         Recent commands
  node federation-relay.js wait <commandId> [timeout]   Poll until done
  node federation-relay.js nodes                        List all nodes

Examples:
  node federation-relay.js send workstation-2 "echo hello from federation"
  node federation-relay.js send workstation-3 "node main.js --profile sandy"
  node federation-relay.js send-file workstation-3 WS3-SANDY-PROMPT.md
  node federation-relay.js nodes
  node federation-relay.js wait abc12345 600

Environment:
  FEDERATION_API  Base URL (default: http://localhost:3099)`);
}
