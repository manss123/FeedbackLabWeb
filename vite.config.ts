// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Unity WebGL builds exported with Publishing Settings → Compression Format:
// Gzip ship *.unityweb files (see public/unity-build/Build/) — these are
// gzip'd bytes under a non-standard extension, so neither Vite's dev server
// nor `vite preview` know to set Content-Encoding/Content-Type; without them
// the browser tries to parse compressed bytes as-is and the Unity loader
// fails silently. Dev/preview only — a real deploy needs the equivalent set
// at the hosting layer (e.g. a Cloudflare Pages `_headers` file), since this
// plugin's hooks don't run in the built output.
function unityWebglHeadersPlugin(): Plugin {
  const setHeaders = (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "";
    if (!url.includes(".unityweb")) return;
    res.setHeader("Content-Encoding", "gzip");
    if (url.includes(".data.unityweb")) {
      res.setHeader("Content-Type", "application/gzip");
    } else if (url.includes(".wasm.unityweb")) {
      res.setHeader("Content-Type", "application/wasm");
    } else if (url.includes(".framework.js.unityweb")) {
      res.setHeader("Content-Type", "application/javascript");
    }
  };

  return {
    name: "unity-webgl-headers",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        setHeaders(req, res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        setHeaders(req, res);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [unityWebglHeadersPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
