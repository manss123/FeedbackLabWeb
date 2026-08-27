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
await cp(SRC, DEST, { recursive: true });
console.log(`copy-ssr-to-functions: copied ${SRC} -> ${DEST}`);
