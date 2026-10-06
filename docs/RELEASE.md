# Launch checklist

## Completed on 6 October 2026

- [x] Merge the UI and reliability work into `main` and push it.
- [x] Build the Arch package from the merged remote `main` (`r38.a663afa`).
- [x] Check fresh local installation and updates in disposable home directories.
- [x] Check extracted package contents, first-launch setup, and updates in a disposable home directory.
- [x] Check that updates replace extension files and preserve profile files.
- [x] Run launcher, uninstall, and search-card regression checks at desktop and narrow widths.
- [x] Cover channel banner spacing inside a fixed header and route cleanup in the browser fixture.

The installation checks use the real installer, launcher, and theme generator. Omarchy hook registration and Chromium launch are simulated. The profile-preservation check uses sentinel History and Cookies files, not a populated Chromium profile. This verifies the file operations, not actual playback or pacman installation.

## Live browser walkthrough

Run these from a fresh install, then update it and repeat the main search/watch flow.

- [ ] Landing page: search, paste a video link, and check keyboard focus.
- [ ] Results: try all three grid sizes, open Filters, apply a filter, and scroll through several result loads.
- [ ] Channels: open a channel with a banner, visit Videos, and return to results.
- [ ] Watch: play a video, check each Focus switch and autoplay behavior, and navigate back to results.
- [ ] Window sizes: try a narrow tiled window and a wide window; check search/control overlap and scrolling.
- [ ] Theme: change the Omarchy theme, then navigate or hide/show Focus Tube and confirm its colors update.
- [ ] Packaged install: install with pacman on Omarchy and launch from the app menu.

## README screenshots

- [ ] Replace `assets/landing.png` with a current screenshot.
- [ ] Replace `assets/results.png` with a current screenshot showing the pixel controls and updated spacing.

Use the Ristretto theme to match the README caption, or update that caption to identify the theme actually shown. Do not use simulated page fixtures as product screenshots.

## AUR

- [x] Refresh the package metadata after merging the UI changes.
- [ ] Create or confirm the maintainer account and add its SSH public key.
- [ ] Publish the recipe and `.SRCINFO`.
- [ ] Verify installation using `omarchy pkg aur add focus-tube-git`.
- [ ] Promote the AUR installation and update instructions in the README after the listing is live.

On 6 October 2026 the AUR RPC reported no `focus-tube-git` listing. The registration page presented a bot challenge to this environment, so account registration availability could not be confirmed. See the [AUR roadmap](ROADMAP.md).
