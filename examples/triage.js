/**
 * Example: Daily PR triage using PRmanager API
 *
 * Run: node examples/triage.js
 * Requires: PRMANAGER_URL and PRMANAGER_TOKEN env vars
 */

import 'dotenv/config';
import { PRManagerClient } from '../prmanager-client.js';

const client = new PRManagerClient(
  process.env.PRMANAGER_URL,
  process.env.PRMANAGER_TOKEN
);

async function triage() {
  // 1. Verify identity
  const me = await client.whoami();
  console.log(`Authenticated as: ${me.agent_id} (${me.display_name})`);

  // 2. Get dashboard stats
  const stats = await client.getStats();
  console.log('\n--- Dashboard Stats ---');
  console.log(JSON.stringify(stats, null, 2));

  // 3. Check blocked/stale PRs via alerts
  const alerts = await client.getAlerts({ limit: 10 });
  console.log(`\n--- Active Alerts (${alerts.count}) ---`);
  for (const alert of alerts.data) {
    console.log(`  [${alert.severity}] PR #${alert.pr_number}: ${alert.message}`);
  }

  // 4. Ready-to-merge queue
  const ready = await client.getReadyToMerge({ limit: 5 });
  console.log(`\n--- Ready to Merge (${ready.data?.length || 0}) ---`);
  for (const pr of (ready.data || [])) {
    console.log(`  PR #${pr.number}: ${pr.title} (score: ${pr.merge_readiness_score})`);
  }

  // 5. Check for messages from Andrew
  const messages = await client.getMessages();
  if (messages.count > 0) {
    console.log(`\n--- ${messages.count} Unread Messages ---`);
    for (const msg of messages.messages) {
      console.log(`  From ${msg.from_agent}: ${msg.subject}`);
    }
  }
}

triage().catch(console.error);
