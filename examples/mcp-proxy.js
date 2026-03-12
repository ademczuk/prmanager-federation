#!/usr/bin/env node
/**
 * MCP Remote Proxy — Test Script
 *
 * Tests Will's authenticated access to Andy's 69 MCP tools across 6 AI servers.
 * Run: node examples/mcp-proxy.js
 *
 * Requires: PRMANAGER_URL and PRMANAGER_TOKEN in .env
 */

import { PRManagerClient } from '../prmanager-client.js';
import { config } from 'dotenv';
config();

const client = new PRManagerClient(
  process.env.PRMANAGER_URL || 'https://andy.taild3619e.ts.net',
  process.env.PRMANAGER_TOKEN
);

async function main() {
  console.log('=== MCP Remote Proxy Test ===\n');

  // 1. Verify identity and mcp:proxy scope
  console.log('1. Checking identity...');
  const me = await client.whoami();
  console.log(`   Agent: ${me.agent_id}`);
  console.log(`   Scopes: ${me.scopes?.join(', ')}`);
  const hasMcp = me.scopes?.includes('mcp:proxy');
  console.log(`   mcp:proxy scope: ${hasMcp ? 'YES' : 'MISSING — ask Andy to add it'}`);
  if (!hasMcp) {
    console.error('\n   Cannot proceed without mcp:proxy scope.');
    process.exit(1);
  }

  // 2. List all MCP servers and tools
  console.log('\n2. Listing MCP servers...');
  const catalog = await client.mcpListTools();
  if (!catalog.ok) {
    console.error('   Failed:', JSON.stringify(catalog));
    process.exit(1);
  }
  let totalTools = 0;
  for (const [name, info] of Object.entries(catalog.servers)) {
    const count = info.tools?.length || 0;
    totalTools += count;
    console.log(`   ${name}: ${info.status} (${count} tools)`);
  }
  console.log(`   TOTAL: ${totalTools} tools across ${Object.keys(catalog.servers).length} servers`);

  // 3. Invoke a lightweight tool (Pantheon budget — fast, no GPU needed)
  console.log('\n3. Testing tool invocation (pantheon_budget)...');
  const budget = await client.mcpInvoke('pantheon', 'pantheon_budget', {});
  if (budget.ok) {
    console.log('   Pantheon budget check: OK');
    const txt = budget.result?.content?.[0]?.text;
    if (txt) console.log('   Response:', txt.substring(0, 200));
  } else {
    console.log('   Failed:', JSON.stringify(budget).substring(0, 200));
  }

  // 4. Test brutal code review (uses QwQ-32B GPU — may take 30-60s)
  console.log('\n4. Testing brutal code review (QwQ-32B, ~30s)...');
  const verdict = await client.brutalCodeReview(
    'function isAdmin(user) { return user.role == "admin"; }',
    'Express middleware auth check',
    'quick'
  );
  if (verdict) {
    console.log('   Brutal review received (' + verdict.length + ' chars)');
    console.log('   Preview:', verdict.substring(0, 300));
  } else {
    console.log('   No response (QwQ-32B may be offline — check /api/qwq/health)');
  }

  // 5. Test Pantheon query (multi-model routing)
  console.log('\n5. Testing Pantheon query...');
  const pq = await client.pantheonQuery('What is the best embedding dimension for code search?');
  if (pq.ok) {
    const txt = pq.result?.content?.[0]?.text || JSON.stringify(pq.result).substring(0, 200);
    console.log('   Pantheon response:', txt.substring(0, 300));
  } else {
    console.log('   Failed:', JSON.stringify(pq).substring(0, 200));
  }

  // 6. Test quick research (google-deep-research, LLM-only, no web)
  console.log('\n6. Testing quick research...');
  const research = await client.mcpInvoke('google-deep-research', 'quick_research', {
    topic: 'pgvector vs Pinecone for 600K document search',
  });
  if (research.ok) {
    const txt = research.result?.content?.[0]?.text || '';
    console.log('   Research response:', txt.substring(0, 300));
  } else {
    console.log('   Failed:', JSON.stringify(research).substring(0, 200));
  }

  console.log('\n=== All tests complete ===');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
