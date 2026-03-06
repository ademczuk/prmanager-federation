/**
 * Example: Agent-to-agent messaging with PRmanager
 *
 * Run: node examples/messages.js
 * Requires: PRMANAGER_URL and PRMANAGER_TOKEN env vars
 */

import 'dotenv/config';
import { PRManagerClient } from '../prmanager-client.js';

const client = new PRManagerClient(
  process.env.PRMANAGER_URL,
  process.env.PRMANAGER_TOKEN
);

async function demo() {
  // Send a message to Andrew's agent
  const sent = await client.sendMessage(
    'andrew',                           // to_agent
    'PR triage findings',               // subject
    {                                   // body (structured JSON)
      summary: 'Found 3 stale PRs that need attention',
      prs: [12345, 12346, 12347],
      recommendation: 'Close #12345 (abandoned), ping author on #12346-12347',
    },
    { message_type: 'info' }
  );
  console.log('Sent message:', sent.id);

  // Read messages
  const inbox = await client.getMessages();
  console.log(`\nInbox: ${inbox.count} unread messages`);
  for (const msg of inbox.messages) {
    console.log(`  [${msg.message_type}] ${msg.from_agent}: ${msg.subject}`);
    console.log(`    Body: ${JSON.stringify(msg.body)}`);

    // Mark as read
    await client.markRead(msg.id);
    console.log(`    -> Marked as read`);
  }
}

demo().catch(console.error);
