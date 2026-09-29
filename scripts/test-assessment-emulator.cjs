// Local-only integration test. Never connects to a production project.
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const req = createRequire(path.resolve("functions/package.json"));
const { initializeApp } = req("firebase-admin/app");
const { getFirestore } = req("firebase-admin/firestore");
const { saveAssessment, ASSESSMENT_VERSION } = require("../functions/lib/assessment.js");
const keys = require("../functions/src/assessment-keys.json");
const projectId = "demo-assessment";
async function main() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:7185");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:7199");
  initializeApp({ projectId });
  const db = getFirestore();
  async function signup() {
    const r = await fetch(
      "http://127.0.0.1:7199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSecureToken: true }),
      },
    );
    assert.equal(r.status, 200);
    return r.json();
  }
  const owner = await signup(),
    other = await signup();
  async function client(token, suffix = "", method = "GET", body) {
    return fetch(
      `http://127.0.0.1:7185/v1/projects/${projectId}/databases/(default)/documents/users/${owner.localId}${suffix}`,
      {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
  }
  assert.equal(
    (
      await client(owner.idToken, "", "PATCH", {
        fields: {
          profile: {
            mapValue: { fields: { displayName: { stringValue: "Synthetic assessment test" } } },
          },
        },
      })
    ).status,
    200,
  );
  const input = (phase) => ({
    phase,
    version: ASSESSMENT_VERSION,
    answers: Object.entries(keys[phase]).map(([id, ranks]) => ({ id, ranks })),
  });
  const [first, retry] = await Promise.all([
    saveAssessment(db, owner.localId, input("pretest")),
    saveAssessment(db, owner.localId, input("pretest")),
  ]);
  assert.equal(first.totalScore, 240);
  assert.equal(retry.submittedAt.toMillis(), first.submittedAt.toMillis());
  assert.equal(
    (await db.collection("users").doc(owner.localId).collection("assessment_attempts").get()).size,
    1,
  );
  const stored = (await db.collection("users").doc(owner.localId).get()).data();
  assert.equal(stored.assessmentResults.pretest.answers.length, 20);
  assert.equal((await client(owner.idToken)).status, 200);
  const attempt = `/assessment_attempts/${ASSESSMENT_VERSION}_pretest`;
  assert.equal((await client(owner.idToken, attempt)).status, 200);
  assert.equal((await client(other.idToken, attempt)).status, 403);
  assert.equal(
    (
      await client(owner.idToken, attempt, "PATCH", {
        fields: { totalScore: { integerValue: "999" } },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await client(owner.idToken, "?updateMask.fieldPaths=assessmentResults", "PATCH", {
        fields: { assessmentResults: { mapValue: { fields: {} } } },
      })
    ).status,
    403,
  );
  assert.equal((await client(owner.idToken, "", "DELETE")).status, 403);
  assert.equal(
    (
      await client(owner.idToken, "?updateMask.fieldPaths=profile.displayName", "PATCH", {
        fields: {
          profile: { mapValue: { fields: { displayName: { stringValue: "Updated fixture" } } } },
        },
      })
    ).status,
    200,
  );
  const post = await saveAssessment(db, owner.localId, input("posttest"));
  assert.equal(post.totalScore, 240);
  console.log(
    "PASS: real Firestore transactions, concurrent retry, persisted ranks, owner reads, cross-user denial, immutable scores, profile update",
  );
  await db.terminate();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
