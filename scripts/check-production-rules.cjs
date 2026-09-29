const path = require('node:path');
const auth = require(path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
(async () => {
  const account = auth.getProjectDefaultAccount(process.cwd()) || auth.getGlobalDefaultAccount();
  const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const get = async resource => {
    const response = await fetch(`https://firebaserules.googleapis.com/v1/${resource}`, { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!response.ok) throw Error(`Rules read failed: ${response.status}`);
    return response.json();
  };
  const release = await get('projects/feedbacklabs/releases/cloud.firestore');
  const rules = await get(release.rulesetName);
  console.log(JSON.stringify({ release: release.name, updated: release.updateTime, files: rules.source.files }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
