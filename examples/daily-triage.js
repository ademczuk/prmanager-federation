/**
 * Daily PR Triage Workflow (v2 — with persistent triage state)
 *
 * Discovers low-hanging fruit PRs, excludes recently-triaged ones,
 * picks the top candidates, syncs bot comments, checks merge readiness,
 * records permanent triage breadcrumbs, and sends a structured summary.
 *
 * Key difference from v1: triage records survive unpick cycles.
 * Running this twice in a row picks DIFFERENT PRs.
 *
 * Usage: node examples/daily-triage.js
 */

import 'dotenv/config';
import { PRManagerClient } from '../prmanager-client.js';

const TRIAGE_LOOKBACK_DAYS = 7;
const PICK_COUNT = 3;

const client = new PRManagerClient(
  process.env.PRMANAGER_URL,
  process.env.PRMANAGER_TOKEN
);

async function dailyTriage() {
  console.log('=== Daily PR Triage (v2) ===\n');

  // Step 0: Verify identity
  const me = await client.whoami();
  console.log(`Agent: ${me.display_name} (${me.agent_id})`);
  console.log(`Scopes: ${me.scopes.join(', ')}\n`);

  // Step 0.5: Fetch recent triage history to build exclusion set
  console.log('--- Step 0.5: Checking triage history ---');
  const since = new Date(Date.now() - TRIAGE_LOOKBACK_DAYS * 86400_000).toISOString();
  const history = await client.getTriageHistory({ agent_id: me.agent_id, since });
  const recentlyTriaged = new Set((history.data ?? []).map(pr => pr.id));
  console.log(`${recentlyTriaged.size} PRs triaged in last ${TRIAGE_LOOKBACK_DAYS} days\n`);

  // Step 1: Discover low-hanging fruit (server-side excludes recently triaged)
  console.log('--- Step 1: Discovering low-hanging fruit ---');
  const lhf = await client.getLowHangingFruit({
    limit: 10 + recentlyTriaged.size,  // over-fetch to compensate for client-side filter
    exclude_triaged_days: TRIAGE_LOOKBACK_DAYS,
  });
  let fruits = lhf.data ?? [];

  // Step 1.5: Belt-and-suspenders client-side filter
  const beforeFilter = fruits.length;
  fruits = fruits.filter(pr => !recentlyTriaged.has(pr.id));
  if (beforeFilter !== fruits.length) {
    console.log(`  Filtered ${beforeFilter - fruits.length} recently-triaged PRs client-side`);
  }
  console.log(`Found ${fruits.length} fresh candidates\n`);

  if (!fruits.length) {
    await client.sendMessage('andrew', 'Daily triage: no fresh low-hanging fruit', {
      timestamp: new Date().toISOString(),
      result: `No PRs scoring above threshold (${recentlyTriaged.size} already triaged in last ${TRIAGE_LOOKBACK_DAYS} days)`,
    });
    console.log('No fresh candidates found. Sent empty report.');
    return;
  }

  // Show top candidates
  for (const pr of fruits.slice(0, 5)) {
    console.log(`  Score ${pr.fruit_score} | #${pr.id} | ${pr.title}`);
    console.log(`    CI: ${pr.ci_status} | Reviews: ${pr.review_status} | Action: ${pr.next_action}`);
  }

  // Step 2: Pick top PRs for triage
  console.log(`\n--- Step 2: Picking top ${PICK_COUNT} PRs ---`);
  const toPick = fruits.slice(0, PICK_COUNT);
  const picked = [];

  for (const pr of toPick) {
    try {
      const result = await client.pickPR(pr.id);
      picked.push(pr);
      console.log(`  Picked #${pr.id}: ${pr.title} (by ${result.data.picked_by})`);
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
      console.log(`  #${pr.id}: synced ${sync.synced ?? 0} comments (${sync.total_comments ?? 0} total)`);
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
      const checkList = checks.data ?? checks ?? [];
      const passing = Array.isArray(checkList) ? checkList.filter(c => c.conclusion === 'success').length : 0;
      const total = Array.isArray(checkList) ? checkList.length : 0;
      console.log(`  #${pr.id}: ${passing}/${total} checks passing`);
      ciResults.push({ pr: pr.id, passing, total, status: pr.ci_status });
    } catch (err) {
      console.log(`  #${pr.id}: CI check failed — ${err.message}`);
      ciResults.push({ pr: pr.id, error: err.message });
    }
  }

  // Step 5: Record triage (permanent breadcrumb — survives unpick)
  console.log('\n--- Step 5: Recording triage ---');
  for (const pr of picked) {
    try {
      const result = await client.triagePR(pr.id);
      console.log(`  #${pr.id}: triaged by ${result.data.triaged_by} at ${result.data.triaged_at}`);
    } catch (err) {
      console.log(`  #${pr.id}: triage record failed — ${err.message}`);
    }
  }

  // Step 6: Get merge-ready queue for context
  console.log('\n--- Step 6: Merge readiness ---');
  const readyToMerge = await client.getReadyToMerge({ limit: 10 });
  const mergeCount = readyToMerge.count ?? readyToMerge.data?.length ?? 0;
  console.log(`${mergeCount} PRs ready to merge\n`);

  // Step 7: Send summary to Andrew
  console.log('--- Step 7: Sending summary ---');
  const summary = {
    timestamp: new Date().toISOString(),
    triage_version: 2,
    lookback_days: TRIAGE_LOOKBACK_DAYS,
    previously_triaged: recentlyTriaged.size,
    low_hanging_fruit: fruits.slice(0, 5).map(pr => ({
      id: pr.id,
      title: pr.title,
      score: pr.fruit_score,
      ci: pr.ci_status,
      action: pr.next_action,
    })),
    picked: picked.map(pr => ({
      id: pr.id,
      title: pr.title,
      score: pr.fruit_score,
    })),
    bot_sync: botResults,
    ci_checks: ciResults,
    merge_ready_count: mergeCount,
    recommendation: picked.length > 0
      ? `Top ${picked.length} fresh PRs triaged (${recentlyTriaged.size} excluded as already triaged). ${mergeCount} total ready to merge.`
      : 'No fresh PRs to triage — all candidates were recently processed.',
  };

  await client.sendMessage(
    'andrew',
    `Daily triage v2: ${picked.length} PRs triaged, ${recentlyTriaged.size} skipped, ${mergeCount} merge-ready`,
    summary
  );

  console.log('Summary sent to Andrew.');

  // Step 8: Unpick PRs (releases transient lock — triage record survives)
  console.log('\n--- Step 8: Releasing picks ---');
  for (const pr of picked) {
    try {
      await client.unpickPR(pr.id);
      console.log(`  Released #${pr.id}`);
    } catch (err) {
      console.log(`  Failed to release #${pr.id}: ${err.message}`);
    }
  }

  console.log('\n=== Triage complete ===');
  return summary;
}

dailyTriage().catch(err => {
  console.error('Triage failed:', err.message);
  process.exit(1);
});
