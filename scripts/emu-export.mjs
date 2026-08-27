// `firebase emulators:export` on this machine reliably fails at its last
// step: the emulator hub stages the export as a fresh `firebase-export-*`
// folder next to the project (always in the CWD, regardless of the
// requested destination — confirmed by testing against paths outside this
// project entirely), then tries to rename() that staging folder onto the
// requested destination. That rename consistently fails with
// `EPERM: operation not permitted` on this machine (this project lives
// under Desktop — Windows Defender / OneDrive / a similar background
// process almost certainly holds a transient lock on newly-created files
// there; renames are far more sensitive to this than plain writes on
// Windows, unlike POSIX).
//
// The data itself is NOT lost — it's sitting in that stray staging folder,
// fully written, just never renamed into place. This script runs the normal
// export command, and if it fails exactly this way, finds the staging
// folder it left behind and COPIES (not renames — copy isn't subject to the
// same lock) it into ./emulator-data instead.
import { existsSync, readdirSync, statSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { execSync } from "node:child_process";

const EXPORT_DIR = "emulator-data";
const STRAY_RE = /^firebase-export-/;

function strayDirs() {
  return readdirSync(".").filter((name) => STRAY_RE.test(name) && statSync(name).isDirectory());
}

const before = new Set(strayDirs());

try {
  execSync(`npx firebase emulators:export ./${EXPORT_DIR} --force`, { stdio: "inherit" });
  // Rename actually succeeded this time (or nothing needed recovering) — done.
  process.exit(0);
} catch {
  // Expected on this machine — fall through to the recovery path below.
}

const after = strayDirs();
const newStray = after.filter((d) => !before.has(d));
// Newest by mtime if more than one somehow appeared.
newStray.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
const staging = newStray[0];

if (!staging) {
  console.error(
    "emu-export: export failed and no new firebase-export-* staging folder was left behind — nothing to recover.",
  );
  process.exit(1);
}

console.log(`emu-export: rename failed as expected — recovering data from ${staging}`);
await rm(EXPORT_DIR, { recursive: true, force: true });
await cp(staging, EXPORT_DIR, { recursive: true });
try {
  await rm(staging, { recursive: true, force: true });
} catch (e) {
  console.warn(`emu-export: could not clean up ${staging} (harmless, safe to delete by hand):`, e.message);
}
console.log(`emu-export: recovered export data into ./${EXPORT_DIR}`);
