#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -rf -- "$test_dir"' EXIT

export FOCUS_TUBE_APP_DIR="$test_dir/app"
mkdir -p "$FOCUS_TUBE_APP_DIR/extension" "$test_dir/bin"
cp "$project_dir/extension/manifest.json" "$FOCUS_TUBE_APP_DIR/extension/"

cat > "$test_dir/bin/python" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$test_dir/bin/setsid" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$@"
EOF
chmod +x "$test_dir/bin/python" "$test_dir/bin/setsid"
export PATH="$test_dir/bin:$PATH"

output="$("$project_dir/bin/youtube-focus" 'https://m.youtube.com/watch?v=abc&t=42')"
printf '%s\n' "$output" | grep -Fxq -- '--app=https://www.youtube.com/watch?v=abc&t=42'

output="$("$project_dir/bin/youtube-focus" 'https://www.youtube.com/results?search_query=focus')"
printf '%s\n' "$output" | grep -Fxq -- '--app=https://www.youtube.com/results?search_query=focus'

output="$("$project_dir/bin/youtube-focus")"
printf '%s\n' "$output" | grep -Fxq -- '--app=https://www.youtube.com/'

if "$project_dir/bin/youtube-focus" 'https://example.com/watch?v=abc' >"$test_dir/output" 2>"$test_dir/error"; then
  printf 'Non-YouTube URL was accepted.\n' >&2
  exit 1
else
  status=$?
fi
[[ $status -eq 2 ]]
grep -Fq 'Focus Tube accepts only HTTPS YouTube links.' "$test_dir/error"

printf 'Launcher checks passed.\n'
