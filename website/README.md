# Focus Tube landing page

The public landing page is plain HTML, CSS, and JavaScript in `public/`. It has no login, backend, or build step.

Live production site: [focus-tube-three-zeta.vercel.app](https://focus-tube-three-zeta.vercel.app/), hosted in the personal Troels' projects Vercel workspace as `focus-tube`.

## Vercel

Import `Trolzie/focus-tube` into Vercel and set the project root directory to `website`. The included `vercel.json` selects the static files in `public` and skips installation and builds.

Alternatively, after authenticating with Vercel CLI, run from this directory:

```sh
npx vercel --prod
```

Deploy to the account or team that owns the landing page. Set Deployment Protection so the production domain is public, then check it without login cookies. Account authentication for deploying does not add authentication to the page itself.

If the production domain changes, update the canonical URL and Open Graph URL/image metadata in `public/index.html`.

## Local preview

```sh
python -m http.server 4173 --directory public
```

The screenshot switcher uses repository screenshots from an earlier build and labels them accordingly. Replace `public/assets/landing.png` and `public/assets/results.png` when fresh app screenshots are available.
