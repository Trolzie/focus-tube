#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -rf -- "$test_dir"' EXIT

export HOME="$test_dir/home"
export PATH="$test_dir/bin:$PATH"
mkdir -p "$HOME/.local/share/youtube-focus/profile" \
  "$HOME/.local/share/icons/hicolor/scalable/apps" \
  "$HOME/.local/share/applications" "$HOME/.local/bin" \
  "$HOME/.config/omarchy/hooks/theme-set.d" "$test_dir/bin"
touch "$HOME/.local/share/youtube-focus/profile/History" \
  "$HOME/.local/share/icons/hicolor/scalable/apps/focus-tube.svg" \
  "$HOME/.local/share/applications/Focus Tube.desktop" \
  "$HOME/.local/bin/youtube-focus" \
  "$HOME/.local/bin/focus-tube-uninstall" \
  "$HOME/.config/omarchy/hooks/theme-set.d/focus-tube-theme"

cat > "$test_dir/bin/pacman" <<'EOF'
#!/usr/bin/env bash
[[ "${1:-}" == -Qq && "${2:-}" == focus-tube-git ]]
EOF
cat > "$test_dir/bin/sudo" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" > "$HOME/pacman-command"
EOF
chmod +x "$test_dir/bin/pacman" "$test_dir/bin/sudo"

bash "$project_dir/bin/focus-tube-uninstall"

[[ "$(cat "$HOME/pacman-command")" == 'pacman -R focus-tube-git' ]]
[[ ! -e "$HOME/.local/share/youtube-focus" ]]
[[ ! -e "$HOME/.local/share/icons/hicolor/scalable/apps/focus-tube.svg" ]]
[[ ! -e "$HOME/.local/share/applications/Focus Tube.desktop" ]]
[[ ! -e "$HOME/.local/bin/youtube-focus" ]]
[[ ! -e "$HOME/.local/bin/focus-tube-uninstall" ]]
[[ ! -e "$HOME/.config/omarchy/hooks/theme-set.d/focus-tube-theme" ]]

mkdir -p "$HOME/.local/share/youtube-focus/profile"
touch "$HOME/.local/share/youtube-focus/profile/History"
cat > "$test_dir/bin/sudo" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
if bash "$project_dir/bin/focus-tube-uninstall" > /dev/null 2>&1; then
  printf 'Uninstall continued after package removal failed.\n' >&2
  exit 1
fi
[[ -f "$HOME/.local/share/youtube-focus/profile/History" ]]

cat > "$test_dir/bin/pacman" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
bash "$project_dir/bin/focus-tube-uninstall"
[[ ! -e "$HOME/.local/share/youtube-focus" ]]

printf 'Uninstall checks passed.\n'
