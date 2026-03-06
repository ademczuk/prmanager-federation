/**
 * Example: Use Grok (x.ai) through PRmanager's proxy
 *
 * Will gets Grok access without seeing Andrew's API key.
 * The proxy validates Will's PRmanager token, then forwards to x.ai
 * with Andrew's key. Standard reverse-proxy pattern.
 *
 * Run: node examples/grok-proxy.js
 * Requires: PRMANAGER_URL and PRMANAGER_TOKEN env vars + xai:proxy scope
 */

import 'dotenv/config';
import { PRManagerClient } from '../prmanager-client.js';

const client = new PRManagerClient(
  process.env.PRMANAGER_URL,
  process.env.PRMANAGER_TOKEN
);

async function demo() {
  // 1. Verify we have xai:proxy scope
  const me = await client.whoami();
  if (!me.scopes?.includes('xai:proxy')) {
    console.error('Missing xai:proxy scope. Ask Andrew to enable it.');
    process.exit(1);
  }
  console.log(`Authenticated as: ${me.agent_id} (xai:proxy enabled)`);

  // 2. List available models
  const models = await client.xaiModels();
  console.log(`\nAvailable x.ai models: ${models.data?.length}`);
  for (const m of (models.data || []).slice(0, 5)) {
    console.log(`  - ${m.id}`);
  }

  // 3. Quick chat with Grok
  console.log('\n--- Grok Chat ---');
  const reply = await client.grokChat(
    'What are the top 3 things to check before merging a PR?',
    { model: 'grok-3-mini', max_tokens: 200 }
  );
  console.log(reply);

  // 4. Raw API call (for advanced use)
  console.log('\n--- Raw x.ai API call ---');
  const raw = await client.xai('/v1/chat/completions', {
    model: 'grok-3-mini',
    messages: [
      { role: 'system', content: 'You are a PR triage assistant. Be concise.' },
      { role: 'user', content: 'Should I merge a PR with 89/100 fruit score, CI passing, 2 approvals, no conflicts?' },
    ],
    max_tokens: 100,
  });
  console.log(raw.choices?.[0]?.message?.content);
}

demo().catch(console.error);
