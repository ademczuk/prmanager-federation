/**
 * Example: Basic connectivity test + dashboard overview
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
  console.log(`  Open PRs: ${stats.prs.open_prs}`);
  console.log(`  Ready to merge: ${stats.readiness.ready_to_merge}`);
  console.log(`  CI failing: ${stats.readiness.ci_failing}`);
  console.log(`  Needs review: ${stats.readiness.needs_review}`);
  console.log(`  Open issues: ${stats.issues.open_issues}`);
  console.log(`  Last sync: ${stats.last_sync}`);

  // 3. Check alerts
  const alerts = await client.getAlerts({ limit: 5 });
  console.log(`\n--- Active Alerts (${alerts.count}) ---`);
  for (const alert of alerts.data) {
    console.log(`  [${alert.severity}] PR #${alert.pr_id}: ${alert.title}`);
  }

  // 4. Ready-to-merge queue
  const ready = await client.getReadyToMerge({ limit: 5 });
  console.log(`\n--- Ready to Merge (${ready.count}) ---`);
  for (const pr of ready.data) {
    console.log(`  #${pr.id}: ${pr.title} (score: ${pr.merge_readiness_score})`);
  }

  // 5. Check for messages from Andrew
  const messages = await client.getMessages();
  if (messages.count > 0) {
    console.log(`\n--- ${messages.count} Unread Messages ---`);
    for (const msg of messages.messages) {
      console.log(`  From ${msg.from_agent}: ${msg.subject}`);
    }
  } else {
    console.log('\nNo unread messages.');
  }
}

triage().catch(console.error);
