#!/usr/bin/env python3
"""Check installation and updates without changing the user's installed app.

Pass a built .pkg.tar archive to also check the packaged files and first-launch setup.
Omarchy hook registration and app launch are mocked; theme.py runs normally.
"""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


project = Path(__file__).resolve().parent.parent


def run(args, env):
    return subprocess.run(args, env=env, check=True, capture_output=True, text=True)


def check_install(root, package=None):
    home = root / "home"
    commands = root / "bin"
    home.mkdir()
    commands.mkdir()
    env = dict(os.environ, HOME=str(home), PATH=f"{commands}:{os.environ['PATH']}")
    env.pop("FOCUS_TUBE_APP_DIR", None)
    env.pop("FOCUS_TUBE_SYSTEM_DIR", None)
    for name, script in {
        "omarchy": '''#!/usr/bin/env python3
import os, pathlib, shutil, sys
if sys.argv[1:] == ["theme", "color", "--all"]:
    print("accent\\t#80f59b")
elif sys.argv[1:4] == ["hook", "install", "theme-set"]:
    source = pathlib.Path(sys.argv[4])
    target = pathlib.Path.home() / ".config/omarchy/hooks/theme-set.d" / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
else:
    raise SystemExit("Unexpected Omarchy command")
''',
        "chromium": "#!/bin/sh\nexit 0\n",
        "uwsm-app": '''#!/usr/bin/env python3
import json, sys
print(json.dumps(sys.argv[1:]))
''',
    }.items():
        path = commands / name
        path.write_text(script)
        path.chmod(0o755)

    app = home / ".local/share/youtube-focus"
    if package:
        extracted = root / "package"
        extracted.mkdir()
        run(["bsdtar", "-xf", str(package), "-C", str(extracted)], env)
        system = extracted / "usr/share/focus-tube"
        env["FOCUS_TUBE_SYSTEM_DIR"] = str(system)
        install = [str(extracted / "usr/bin/focus-tube"), "--setup"]
        launch = [str(extracted / "usr/bin/focus-tube")]
        source = system
        for path in ["usr/share/applications/focus-tube.desktop",
                     "usr/share/icons/hicolor/scalable/apps/focus-tube.svg",
                     "usr/bin/focus-tube-uninstall", "usr/share/licenses/focus-tube-git/LICENSE"]:
            assert (extracted / path).is_file(), path
    else:
        install = ["bash", str(project / "install.sh")]
        launch = [str(home / ".local/bin/youtube-focus")]
        source = project

    run(install, env)
    for path in (source / "extension").iterdir():
        if path.name not in ("palette.css", "icon.svg"):
            assert (app / "extension" / path.name).read_bytes() == path.read_bytes(), path.name
    assert "#80f59b" in (app / "extension/palette.css").read_text()
    assert "#80f59b" in (home / ".local/share/icons/hicolor/scalable/apps/focus-tube.svg").read_text()
    hook = home / ".config/omarchy/hooks/theme-set.d/focus-tube-theme"
    assert hook.read_bytes() == (source / "hooks/focus-tube-theme").read_bytes()
    if not package:
        desktop = (home / ".local/share/applications/Focus Tube.desktop").read_text()
        assert f"Exec={home}/.local/bin/youtube-focus" in desktop

    result = run(launch + ["https://www.youtube.com/results?search_query=focus"], env)
    args = json.loads(result.stdout.strip().splitlines()[-1])
    assert f"--load-extension={app}/extension" in args
    assert f"--user-data-dir={app}/profile" in args
    assert "--app=https://www.youtube.com/results?search_query=focus" in args
    profile = app / "profile"
    (profile / "History").write_text("keep history")
    (profile / "Cookies").write_text("keep cookies")
    (app / "extension/focus.css").write_text("outdated installed stylesheet")
    run(install, env)
    assert (app / "extension/focus.css").read_bytes() == (source / "extension/focus.css").read_bytes()
    assert (profile / "History").read_text() == "keep history"
    assert (profile / "Cookies").read_text() == "keep cookies"
    print(f"{'Package' if package else 'Local'} install, first-launch setup, and update checks passed.")


with tempfile.TemporaryDirectory(prefix="focus-tube-install-test-") as directory:
    root = Path(directory)
    local = root / "local"
    local.mkdir()
    check_install(local)
    if len(sys.argv) > 1:
        package_root = root / "packaged"
        package_root.mkdir()
        check_install(package_root, Path(sys.argv[1]).resolve())
