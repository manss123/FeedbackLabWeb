// Copies the Nitro node_middleware server build (.output/server, produced by
// `npm run build:firebase`) into functions/ssr/server so functions/src/index.ts's
// `ssr` Cloud Function can dynamically import it. functions/ssr/ is a build
// artifact — gitignored, never hand-edited, always freshly copied on deploy.
import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const SRC = ".output/server";
const DEST = "functions/ssr/server";

if (!existsSync(SRC)) {
  console.error(`copy-ssr-to-functions: missing ${SRC} — did the Nitro build run first?`);
  process.exit(1);
}

await rm("functions/ssr", { recursive: true, force: true });
// dereference: true — Nitro's node_modules trace includes symlinks (e.g.
// node_modules/.nf3/...), and creating a NEW symlink at DEST needs elevated
// privileges on Windows without Developer Mode. Copying real file content
// instead avoids that, and is what we want anyway for a self-contained
// deploy artifact.
await cp(SRC, DEST, { recursive: true, dereference: true });
console.log(`copy-ssr-to-functions: copied ${SRC} -> ${DEST}`);
