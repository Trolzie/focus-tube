# Contributing to Focus Tube

Focus Tube is a work in progress. Its goal is to remove YouTube's clutter and distractions while feeling like a natural part of Omarchy. Contributions that make the app calmer, clearer, or more at home on the desktop are welcome.

## Report a bug or suggest a change

Open a [GitHub issue](https://github.com/Trolzie/focus-tube/issues) with:

- What you expected and what happened.
- Steps to reproduce, including the YouTube page or search where it happens.
- Your Omarchy theme and, if relevant, a screenshot with personal information removed.

YouTube changes its page structure often. A precise example helps find which selector or element changed.

## Send a patch

1. Fork the repository and create a branch for your change.
2. Make a focused edit. The YouTube interface lives in `extension/`; `theme.py` handles Omarchy colors and the desktop icon; `bin/youtube-focus` launches the app.
3. Check the affected pages in Focus Tube. For interface changes, try the landing page, search results, and a watch page. For theme changes, switch Omarchy themes while the app is open.
4. Run `./install.sh` to install your local changes, then close and reopen Focus Tube to load extension code.
5. Open a pull request describing the change and how you checked it. Include a before and after screenshot when the interface changes.

Keep changes consistent with the project's aim: less clutter, controls that are easy to understand, and colors that follow Omarchy. Please avoid committing browser profiles, account data, or generated local files.
