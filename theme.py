#!/usr/bin/env python3
"""Write Focus Tube colors from the active Omarchy theme."""

import re
import subprocess
from pathlib import Path

COLORS = {
    "accent": "#7aa2f7",
    "background": "#1a1b26",
    "dark_background": "#13141c",
    "darker_background": "#0e0e14",
    "lighter_background": "#24283b",
    "foreground": "#a9b1d6",
    "light_foreground": "#b4bee6",
    "muted": "#414868",
    "bright_foreground": "#c0caf5",
    "red": "#f7768e",
}

try:
    output = subprocess.check_output(
        ["omarchy", "theme", "color", "--all"], text=True, timeout=5
    )
    for line in output.splitlines():
        key, _, value = line.partition("\t")
        if key in COLORS and re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            COLORS[key] = value
except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
    pass

css = ":root {\n" + "".join(
    f"  --ytf-{key.replace('_', '-')}: {value};\n" for key, value in COLORS.items()
) + "}\n"
path = Path(__file__).parent / "extension" / "palette.css"
temporary = path.with_suffix(".css.tmp")
temporary.write_text(css)
temporary.replace(path)

icon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">
  <title>Focus Tube</title>
  <path fill="{COLORS['accent']}" d="M8 10h48v4h4v4h4v28h-4v4h-4v4H8v-4H4v-4H0V18h4v-4h4z"/>
  <path fill="{COLORS['darker_background']}" d="M24 18h8v4h8v4h8v4h8v4h-8v4h-8v4h-8v4h-8z"/>
</svg>
'''
icon_path = path.with_name("icon.svg")
icon_temporary = icon_path.with_suffix(".svg.tmp")
icon_temporary.write_text(icon)
icon_temporary.replace(icon_path)
