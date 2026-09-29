// Read-only production query verification; print counts only, never learner records.
const path = require('node:path');
const req = require('node:module').createRequire(path.resolve('functions/package.json'));
const auth = require(path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST) throw Error('Unexpected emulator setting');
  const account = auth.getProjectDefaultAccount(process.cwd()) || auth.getGlobalDefaultAccount();
  const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const { GoogleAuth, OAuth2Client } = req('google-auth-library');
  const client = new OAuth2Client();
  client.setCredentials({ access_token: token.access_token });
  const db = new (req('@google-cloud/firestore').Firestore)({ projectId: 'feedbacklabs', auth: new GoogleAuth({ authClient: client }) });
  const { readResearchPage } = req('./lib/research-page.js');
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const input = { from: new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10), to: today };
  const first = await readResearchPage(db, input);
  console.log(JSON.stringify({ range: input, users: first.users.length, sessions: first.sessions.length, events: first.events.length, hasNext: Boolean(first.nextCursor) }));
  if (first.nextCursor) {
    const next = await readResearchPage(db, { ...input, cursor: first.nextCursor });
    const overlaps = next.events.filter(row => first.events.some(event => event.id === row.id)).length;
    console.log(JSON.stringify({ nextEvents: next.events.length, duplicateEvents: overlaps }));
    if (overlaps) throw Error('Duplicate events across pages');
  }
  await db.terminate();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
