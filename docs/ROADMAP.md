# Roadmap

The launch work and remaining live checks are tracked in the [release checklist](RELEASE.md).

## Reliability pass

Work through these in order. The search UI is the most change-sensitive part of Focus Tube, so stabilize it before adding more features. Keep AUR publication independent of this work.

### 1. Fix stale channel captions

- [ ] Reproduce a channel renderer being reused for a different channel, including a new result with no description.
- [ ] In `extension/focus.js`, reset the caption subtitle when the channel identity changes; let the fetched description populate it only for the current channel.
- [ ] Check that delayed channel-info responses cannot overwrite a newer card's banner, count, or subtitle.
- [ ] Verify normal channel results, missing descriptions, and navigation between searches in the app.

Done when a reused card never shows the previous channel's name, description, banner, or count.

### 2. Add extension regression coverage

- [ ] Choose a lightweight DOM test setup and add fixtures for both video result shapes and channel results. Keep fixtures small and tied to observed YouTube markup.
- [ ] Test channel caption creation and updates, including the stale-caption case.
- [ ] Test deduplication by video ID and channel path across result sections, including when cards are inserted later or their links change.
- [ ] Test navigation between result pages and the behavior when expected YouTube elements are absent.
- [ ] Run these tests alongside `tests/launcher.sh` and `tests/uninstall.sh` in CI.

Done when the recent duplicate-card and caption regressions would fail a test before reaching users. Tests complement, but do not replace, a quick live YouTube check.

### 3. Measure and trim page work

- [ ] Profile a long results session in Chromium with scrolling and repeated searches; record main-thread time, mutation-observer activity, and extension-resource requests as a baseline.
- [ ] If the observer is costly, narrow what it watches or processes without breaking dynamically added results, autoplay control, or search tools.
- [ ] If one-second palette polling is costly, reduce or replace it while keeping live Omarchy theme changes working.
- [ ] Repeat the same profile and check landing, results, and watch pages for regressions.

Done when the measured cost is acceptable or demonstrably lower, with theme updates and dynamic results still working. Do not optimize solely from code inspection.

### 4. Make uninstall consequences unmistakable

- [ ] Decide whether `focus-tube-uninstall` should ask before deleting the dedicated browser profile, or offer an explicit keep-profile option.
- [ ] Update the command, README, and uninstall tests together. Preserve the current behavior on package-removal failure: do not delete user data after a failed `pacman -R`.

Done when a user cannot accidentally lose saved Focus settings, cookies, or history without a clear warning or an explicit choice.

## Publish on the AUR

Focus Tube should be easy to find and install from Omarchy's **Install → AUR** menu. Publishing `focus-tube-git` is the next packaging task.

- [x] Add an MIT license and an Arch `PKGBUILD`.
- [x] Build the package and check its first-launch setup.
- [x] Refresh `pkgver` and `.SRCINFO`, and build-check against current `main`.
- [ ] Register an AUR maintainer account.
- [ ] Add the maintainer's SSH public key to that account.
- [ ] Publish `PKGBUILD` and a generated `.SRCINFO` to the AUR.
- [ ] Verify `omarchy pkg aur add focus-tube-git` on Omarchy.
- [ ] Make the AUR command the primary README install route and document updates.

Account registration was unavailable when checked on 5 October 2026. On 6 October the registration page presented a bot challenge to this environment, so availability could not be confirmed; the AUR RPC still reported no `focus-tube-git` listing. Check the [AUR registration page](https://aur.archlinux.org/register/) in a normal browser. Until the package is listed, the README shows how to build it from this repository. Regenerate `.SRCINFO` whenever the `PKGBUILD` metadata changes.
