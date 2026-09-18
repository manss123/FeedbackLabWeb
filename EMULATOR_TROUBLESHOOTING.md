# Local admin endpoints: apparent CORS errors

Observed 2026-09-17: requests from `http://localhost:8080` to the Functions Emulator on `127.0.0.1:5001` failed browser preflight for `adminExportData` and `adminListActivity`.

The response was actually HTTP 404: `Function ... does not exist`, with an empty registered-function list. `firebase-debug.log` recorded function discovery failing after 10,000 ms. The source and compiled exports both contained the functions. A subsequent direct module load succeeded in approximately 0.5 seconds, so the evidence establishes a failed discovery attempt, not a permanently missing export or a proven slow module dependency.

## Resolution

Rebuilding the Functions TypeScript triggered the already-running emulator's watcher to discover all nine exports successfully, without restarting Auth/Firestore or clearing emulator data:

```powershell
npm --prefix functions run build
npm run emu:check
```

The health check sends OPTIONS from the actual frontend origin with the content-type and authorization request headers, then an unauthenticated POST. Expected results are a CORS-enabled successful preflight and HTTP 403 `PERMISSION_DENIED` from the existing `requireAdmin` check. It does not impersonate an administrator or read participant records. This verifies transport and endpoint registration, not successful access for a particular logged-in admin.

For future starts, `npm run emu` now builds Functions first and supplies `FUNCTIONS_DISCOVERY_TIMEOUT=60` to the Firebase CLI. This setting affects discovery, not callable execution time. Firebase documents this setting in its [initialization timeout guidance](https://firebase.google.com/docs/functions/tips#avoid_deployment_timeouts_during_initialization). It gives startup more time; an actual startup exception must still be fixed.

The emulator runs compiled `functions/lib/index.js`. After changing `functions/src`, rebuild it or run `npm --prefix functions run build:watch` in another terminal. The root frontend Vite server does not compile the callable backend.

If the emulator still shows no registered functions, stop it normally in its existing terminal and start `npm run emu` again. Normal shutdown retains the configured export-on-exit behavior. Do not delete emulator data to address this failure.

No custom CORS middleware or relaxed admin authorization was added. If a signed-in browser receives `permission-denied` after transport recovery, check the intended admin account and `ADMIN_EMAILS` configuration separately.
