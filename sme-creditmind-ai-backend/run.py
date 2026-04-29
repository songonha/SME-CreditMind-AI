import os

import uvicorn

if __name__ == "__main__":
    # Prefer CREDITMIND_PORT (set by npm dev:backend:win on Windows) so a stale process on :8008
    # cannot intercept traffic while the UI proxies to the intended port.
    port = int(os.environ.get("CREDITMIND_PORT", os.environ.get("PORT", "8008")))
    reload = os.environ.get("CREDITMIND_UVICORN_RELOAD", "1").lower() not in ("0", "false", "no")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
