// Narrow production configuration update: no source deployment or secret output.
const path = require('node:path');
const auth = require(path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
const ids = ['adminCheckAccess', 'adminExportData', 'adminGetUserActivity', 'adminGetUserSessions', 'adminListActivity', 'adminListUsers', 'adminResearchPage'];
const email = 'beerss123@gmail.com';
const root = 'projects/feedbacklabs/locations/us-central1/functions/';
const base = 'https://cloudfunctions.googleapis.com/v2/';
async function main() {
  const account = auth.getProjectDefaultAccount(process.cwd()) || auth.getGlobalDefaultAccount();
  if (!account) throw new Error('Firebase login required');
  const tokens = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  async function api(resource, method = 'GET', body) {
    const response = await fetch(resource.startsWith('https://storage.googleapis.com/') ? resource : base + resource, { method, headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw new Error(`${method} ${resource}: ${response.status} ${data.error?.message || ''}`);
    return data;
  }
  async function sourceDigest(fn) {
    const source = fn.buildConfig.source?.storageSource;
    if (!source?.generation) throw new Error('Versioned storage source required');
    const metadata = await api(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(source.bucket)}/o/${encodeURIComponent(source.object)}?generation=${source.generation}&fields=md5Hash`);
    if (!metadata.md5Hash) throw new Error('Missing source checksum');
    return metadata.md5Hash;
  }
  const snapshots = await Promise.all(ids.map(id => api(root + id)));
  if (process.argv.includes('--inspect-source')) {
    for (const fn of snapshots) console.log(JSON.stringify({ function: fn.name.split('/').at(-1), sourceChecksum: await sourceDigest(fn), entryPoint: fn.buildConfig.entryPoint }));
  }
  for (const fn of snapshots) console.log(JSON.stringify({ function: fn.name.split('/').at(-1), state: fn.state, adminEmails: fn.serviceConfig.environmentVariables?.ADMIN_EMAILS || '' }));
  if (!process.argv.includes('--apply')) return;
  for (const snapshot of snapshots) {
    const fn = await api(snapshot.name);
    if (fn.state !== 'ACTIVE') throw new Error(`${fn.name} is not ACTIVE`);
    const variables = fn.serviceConfig.environmentVariables || {};
    const emails = variables.ADMIN_EMAILS?.split(',').map(x => x.trim().toLowerCase()).filter(Boolean) || [];
    if (emails.includes(email)) { console.log(`Already configured: ${fn.name.split('/').at(-1)}`); continue; }
    const updated = { ...variables, ADMIN_EMAILS: [...emails, email].join(',') };
    const originalDigest = await sourceDigest(fn);
    const op = await api(fn.name + '?updateMask=serviceConfig.environmentVariables', 'PATCH', { name: fn.name, serviceConfig: { environmentVariables: updated } });
    console.log(`Updating: ${fn.name.split('/').at(-1)}`);
    let done = op;
    const deadline = Date.now() + 600000;
    while (!done.done) {
      if (Date.now() > deadline) throw new Error(`Operation still pending: ${op.name}`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      done = await api(op.name);
    }
    if (done.error) throw new Error(done.error.message);
    const verified = await api(fn.name);
    if (verified.state !== 'ACTIVE' || verified.serviceConfig.environmentVariables.ADMIN_EMAILS !== updated.ADMIN_EMAILS) throw new Error(`Verification failed: ${fn.name}`);
    // Google may copy the archive to a new storage generation during the update.
    if (await sourceDigest(verified) !== originalDigest) throw new Error(`Source content changed unexpectedly: ${fn.name}`);
    console.log(`Verified ACTIVE: ${fn.name.split('/').at(-1)}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
