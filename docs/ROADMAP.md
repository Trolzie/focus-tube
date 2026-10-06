# Roadmap

The launch work and remaining live checks are tracked in the [release checklist](RELEASE.md).

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
