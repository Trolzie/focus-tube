# Roadmap

## Publish on the AUR

Focus Tube should be easy to find and install from Omarchy's **Install → AUR** menu. Publishing `focus-tube-git` is the next packaging task, as soon as new AUR account registration reopens.

- [x] Add an MIT license and an Arch `PKGBUILD`.
- [x] Build the package and check its first-launch setup.
- [ ] Register an AUR maintainer account when registration reopens.
- [ ] Add the maintainer's SSH public key to that account.
- [ ] Publish `PKGBUILD` and a generated `.SRCINFO` to the AUR.
- [ ] Verify `omarchy pkg aur add focus-tube-git` on Omarchy.
- [ ] Make the AUR command the primary README install route and document updates.

As of October 2026, [new AUR account registration is paused](https://lists.archlinux.org/archives/list/aur-general@lists.archlinux.org/message/2IJD5MFHSLXARQTOP4FH64CJLW2BIIGC/). Follow [aur-general](https://lists.archlinux.org/archives/list/aur-general@lists.archlinux.org/) or [Arch news](https://archlinux.org/news/) for changes; the registration page asks people not to automate retries. Until publishing is possible, the README shows how to build the pacman-managed package from this repository.
