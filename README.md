# Focus Tube

A focused YouTube window for [Omarchy](https://omarchy.org/). It runs Chromium as an app with its own local profile and a small extension that changes the YouTube interface.

## What it does

- A search and link field on the landing page; the input is ready for typing when you arrive.
- A compact grid for search results with title, channel, date, and views under each thumbnail.
- Focus settings for the home feed, left menu, Shorts, watch suggestions, end cards, and autoplay. The distracting options start hidden.
- A pixel logo and colors that follow the active Omarchy theme, including changes made while Focus Tube is open.

YouTube does not include like counts in search result markup, and [dislike counts are private](https://developers.google.com/youtube/v3/docs/videos), so the grid does not show rating counts.

## Install

On Omarchy, with Chromium and Python available:

```bash
git clone https://github.com/Trolzie/focus-tube.git
cd focus-tube
./install.sh
```

Launch `Focus Tube` from the app launcher, or run `~/.local/bin/youtube-focus`. Close an existing Focus Tube window before reinstalling to pick up extension code changes.

The installer copies the extension to `~/.local/share/youtube-focus/extension`, adds a desktop entry, and installs an Omarchy `theme-set` hook. It keeps the dedicated browser profile at `~/.local/share/youtube-focus/profile` when reinstalling. Theme colors and the desktop icon are generated from the current Omarchy theme.

The keyboard shortcut is optional and local to your Omarchy configuration. On the original setup it is `Super+Shift+Y`.

## Project files

- `bin/youtube-focus`: Chromium app launcher, restricted to HTTPS YouTube links.
- `extension/`: Focus Tube interface and settings.
- `theme.py`: Generates the palette and desktop icon from Omarchy colors.
- `hooks/focus-tube-theme`: Refreshes those files after a theme change.
- `install.sh`: Installs or updates the app without copying a browser profile.

Focus settings are stored in the dedicated Chromium profile on your machine. The repository contains no browser profile or account data.
