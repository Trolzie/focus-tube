#!/usr/bin/env python3
import http.server
import pathlib
import shutil
import subprocess
import tempfile
import threading
import re
from urllib.parse import urlsplit


project = pathlib.Path(__file__).resolve().parent.parent
browser = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
if not browser:
    raise SystemExit("Chromium is required for search card checks.")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(project), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path == "/results":
            self.path = "/tests/search-cards.html"
        return super().do_GET()

    def log_message(self, _format, *_args):
        pass


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with tempfile.TemporaryDirectory(prefix="focus-tube-search-test-") as profile_root:
        for width in (1280, 500):
            profile = pathlib.Path(profile_root) / str(width)
            profile.mkdir()
            result = subprocess.run(
                [
                    browser,
                    "--headless",
                    "--no-sandbox",
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    f"--user-data-dir={profile}",
                    f"--window-size={width},900",
                    "--virtual-time-budget=5000",
                    "--dump-dom",
                    f"http://127.0.0.1:{server.server_port}/results",
                ],
                capture_output=True,
                text=True,
                timeout=20,
            )
            if result.returncode != 0:
                raise SystemExit(result.stderr or "Chromium failed.")
            if "<pre id=\"result\">PASS</pre>" not in result.stdout:
                marker = re.search(r'<pre id="result">(.*?)</pre>', result.stdout, re.S)
                message = marker.group(1) if marker else "test did not finish"
                raise SystemExit(f"{width}px viewport: {message}")
finally:
    server.shutdown()

print("Search card checks passed at desktop and narrow widths.")
