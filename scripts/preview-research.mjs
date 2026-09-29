// Isolated UI QA with explicitly synthetic records; no Firebase calls.
// Run: node scripts/preview-research.mjs, then open http://127.0.0.1:4318.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  plugins: [
    {
      name: "research-preview-block-services",
      enforce: "pre",
      resolveId(id) {
        if (["@/lib/admin.functions", "@/lib/firebase-auth"].includes(id)) return `\0fixture:${id}`;
      },
      load(id) {
        const path = id.replaceAll("\\", "/");
        if (id === "\0fixture:@/lib/firebase-auth" || path.endsWith("/src/lib/firebase-auth.ts"))
          return "export async function waitForFirebaseUser() { return null; }";
        if (
          id === "\0fixture:@/lib/admin.functions" ||
          path.endsWith("/src/lib/admin.functions.ts")
        )
          return 'export async function adminResearchPage() { throw new Error("Preview: external services disabled"); }';
      },
    },
    react(),
    tailwind(),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  server: { host: "127.0.0.1", port: 4318, strictPort: true },
});
server.middlewares.use(async (req, res, next) => {
  if (req.url !== "/") return next();
  const html = await server.transformIndexHtml(
    "/",
    '<!doctype html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/scripts/research-preview.tsx"></script></body></html>',
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
});
await server.listen();
server.printUrls();
