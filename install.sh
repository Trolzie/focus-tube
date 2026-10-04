#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$HOME/.local/share/youtube-focus"

for command in chromium python omarchy uwsm-app; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Focus Tube needs %s on PATH.\n' "$command" >&2
    exit 1
  fi
done

mkdir -p "$app_dir/extension" "$HOME/.local/bin" "$HOME/.local/share/applications"
cp "$project_dir"/extension/* "$app_dir/extension/"
install -m 755 "$project_dir/bin/youtube-focus" "$HOME/.local/bin/youtube-focus"
install -m 755 "$project_dir/bin/focus-tube-uninstall" "$HOME/.local/bin/focus-tube-uninstall"
install -m 644 "$project_dir/theme.py" "$app_dir/theme.py"
install -m 755 "$project_dir/hooks/focus-tube-theme" "$app_dir/focus-tube-theme"
python "$app_dir/theme.py"

sed "s|@HOME@|$HOME|g" "$project_dir/focus-tube.desktop.in" > \
  "$HOME/.local/share/applications/Focus Tube.desktop"
omarchy hook install theme-set "$project_dir/hooks/focus-tube-theme"

printf 'Focus Tube installed. Launch with: %s/.local/bin/youtube-focus\n' "$HOME"
