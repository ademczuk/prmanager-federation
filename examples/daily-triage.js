/**
 * Daily PR Triage Workflow
 *
 * Discovers low-hanging fruit PRs, picks the top candidates,
 * syncs and triages bot comments, checks merge readiness,
 * and sends a structured summary to Andrew.
 *
 * Usage: node examples/daily-triage.js
 */

import { PRManagerClient } from '../prmanager-client.js';

const client = new PRManagerClient(
  process.env.PRMANAGER_URL,
  process.env.PRMANAGER_TOKEN
);

async function dailyTriage() {
  console.log('=== Daily PR Triage ===\n');

  // Step 0: Verify identity
  const me = await client.whoami();
  console.log(`Agent: ${me.display_name} (${me.agent_id})`);
  console.log(`Scopes: ${me.scopes.join(', ')}\n`);

  // Step 1: Discover low-hanging fruit
  console.log('--- Step 1: Discovering low-hanging fruit ---');
  const lhf = await client.getLowHangingFruit({ limit: 10 });
  const fruits = lhf.data || lhf.easy_wins || lhf;
  console.log(`Found ${fruits.length} candidates\n`);

  if (!fruits.length) {
    await client.sendMessage('andrew', 'Daily triage: no low-hanging fruit', {
      timestamp: new Date().toISOString(),
      result: 'No PRs scoring above threshold',
    });
    console.log('No candidates found. Sent empty report.');
    return;
  }

  // Show top candidates
  for (const pr of fruits.slice(0, 5)) {
    console.log(`  Score ${pr.fruit_score || pr.score} | #${pr.id} | ${pr.title}`);
    console.log(`    CI: ${pr.ci_status} | Reviews: ${pr.review_status} | Action: ${pr.next_action}`);
  }

  // Step 2: Pick top 3 for triage
  console.log('\n--- Step 2: Picking top 3 PRs ---');
  const toPick = fruits.slice(0, 3);
  const picked = [];

  for (const pr of toPick) {
    try {
      await client.pickPR(pr.id);
      picked.push(pr);
      console.log(`  Picked #${pr.id}: ${pr.title}`);
    } catch (err) {
      console.log(`  Skip #${pr.id}: ${err.message}`);
    }
  }

  // Step 3: Sync and triage bot comments on each picked PR
  console.log('\n--- Step 3: Syncing bot comments ---');
  const botResults = [];

  for (const pr of picked) {
    try {
      const sync = await client.syncBotComments(pr.id);
      console.log(`  #${pr.id}: synced ${sync.synced || 0} comments (${sync.total_comments || 0} total)`);
      botResults.push({ pr: pr.id, ...sync });
    } catch (err) {
      console.log(`  #${pr.id}: sync failed — ${err.message}`);
      botResults.push({ pr: pr.id, error: err.message });
    }
  }

  // Step 4: Check CI status on picked PRs
  console.log('\n--- Step 4: Checking CI status ---');
  const ciResults = [];

  for (const pr of picked) {
    try {
      const checks = await client.getCIChecks(pr.id);
      const checkList = checks.data || checks;
      const passing = Array.isArray(checkList) ? checkList.filter(c => c.conclusion === 'success').length : 0;
      const total = Array.isArray(checkList) ? checkList.length : 0;
      console.log(`  #${pr.id}: ${passing}/${total} checks passing`);
      ciResults.push({ pr: pr.id, passing, total, status: pr.ci_status });
    } catch (err) {
      console.log(`  #${pr.id}: CI check failed — ${err.message}`);
      ciResults.push({ pr: pr.id, error: err.message });
    }
  }

  // Step 5: Get merge-ready queue for context
  console.log('\n--- Step 5: Merge readiness ---');
  const readyToMerge = await client.getReadyToMerge({ limit: 10 });
  const mergeQueue = readyToMerge.data || readyToMerge;
  console.log(`${mergeQueue.length || 0} PRs ready to merge\n`);

  // Step 6: Send summary to Andrew
  console.log('--- Step 6: Sending summary ---');
  const summary = {
    timestamp: new Date().toISOString(),
    low_hanging_fruit: fruits.slice(0, 5).map(pr => ({
      id: pr.id,
      title: pr.title,
      score: pr.fruit_score || pr.score,
      ci: pr.ci_status,
      action: pr.next_action,
    })),
    picked: picked.map(pr => ({
      id: pr.id,
      title: pr.title,
      score: pr.fruit_score || pr.score,
    })),
    bot_sync: botResults,
    ci_checks: ciResults,
    merge_ready_count: mergeQueue.length || 0,
    recommendation: picked.length > 0
      ? `Top ${picked.length} PRs picked and triaged. ${mergeQueue.length || 0} total ready to merge.`
      : 'No PRs picked — all candidates may already be claimed.',
  };

  await client.sendMessage(
    'andrew',
    `Daily triage: ${picked.length} PRs picked, ${mergeQueue.length || 0} merge-ready`,
    summary
  );

  console.log('Summary sent to Andrew.');
  console.log('\n=== Triage complete ===');

  // Step 7: Unpick PRs (cleanup — remove if you want to keep claims)
  // for (const pr of picked) {
  //   await client.unpickPR(pr.id);
  // }

  return summary;
}

dailyTriage().catch(err => {
  console.error('Triage failed:', err.message);
  process.exit(1);
});
