import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../firebase.json", import.meta.url), "utf8"));
const projects = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
const project = projects.projects.default;
const port = config.emulators.functions.port;
const origin = "http://localhost:8080";
let failures = 0;

// Read-only callable health check. Do not send a fake user/admin identity.
for (const name of ["adminExportData", "adminListActivity"]) {
  const url = `http://127.0.0.1:${port}/${project}/us-central1/${name}`;
  try {
    const preflight = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (preflight.status === 404) {
      throw new Error(
        "Function is not registered. Check firebase-debug.log for discovery/load errors; rebuild Functions or restart npm run emu.",
      );
    }
    const allowed = preflight.headers.get("access-control-allow-origin");
    const methods = preflight.headers.get("access-control-allow-methods") ?? "";
    const headers = preflight.headers.get("access-control-allow-headers") ?? "";
    if (
      !preflight.ok ||
      ![origin, "*"].includes(allowed) ||
      !methods.includes("POST") ||
      !headers.toLowerCase().includes("authorization") ||
      !headers.toLowerCase().includes("content-type")
    ) {
      throw new Error(`Preflight failed: HTTP ${preflight.status}, allowed origin ${allowed}`);
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ data: {} }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json();
    // requireAdmin deliberately returns permission-denied even without login.
    if (
      response.status !== 403 ||
      body.error?.status !== "PERMISSION_DENIED" ||
      ![origin, "*"].includes(response.headers.get("access-control-allow-origin"))
    ) {
      throw new Error(
        `Expected CORS-enabled admin permission rejection; got HTTP ${response.status}, ${body.error?.status ?? "unexpected body"}`,
      );
    }
    console.log(
      `PASS ${name}: OPTIONS ${preflight.status}, CORS allowed, unauthenticated POST rejected (403).`,
    );
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
process.exitCode = failures ? 1 : 0;
