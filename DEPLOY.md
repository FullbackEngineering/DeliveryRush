# Deploying Delivery Rush to Vercel

Delivery Rush is a static single-page app (Vite 6 + TypeScript + Three.js). It
has **no backend and no environment variables** — all game services are mocked
client-side (`src/services/mock/MockServices.ts`) and all art/audio/3D assets
are generated procedurally or bundled at build time. Deploying it is just
"build the static site and serve it."

Build verified locally: `npm run build` (= `tsc --noEmit && vite build`) exits
0 and produces `dist/`:

```
dist/index.html                       2.6 kB
dist/assets/index-<hash>.js         709.3 kB   (gzip ~186 kB)
dist/assets/car_murphy-<hash>.glb  1715.5 kB   (the vehicle's 3D model)
```

Total `dist/` size ≈ 2.4 MB. The `.glb` model is imported via Vite's `?url`
pattern, so it's correctly emitted as a hashed, cacheable asset in
`dist/assets/` and referenced from the JS bundle — nothing extra to configure
for that to work. (Vite does print a "chunk larger than 500 kB" advisory for
the JS bundle; that's a perf nice-to-have for later, not a deploy blocker.)

## `vercel.json` (already committed at repo root)

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/assets/(.*)\\.glb", "headers": [{ "key": "Content-Type", "value": "model/gltf-binary" }] }
  ]
}
```

- `framework: "vite"` + explicit `buildCommand`/`outputDirectory` — Vercel would
  auto-detect Vite anyway, but this pins the exact command (`npm run build`,
  which also runs the `tsc --noEmit` typecheck gate) and output dir (`dist`).
- The rewrite sends every path to `/index.html` so the app boots correctly
  however it's linked to — the game itself only branches on the `?mode=rush`
  / `?mode=free` **query string** on a single route, it doesn't use path-based
  routing, so in normal use this rewrite is a safety net rather than something
  actively exercised.
- The `headers` block gives hashed files under `assets/` a 1-year immutable
  cache (safe because Vite content-hashes filenames — a new build gets new
  hashes) and forces the correct `model/gltf-binary` MIME type on `.glb`
  files, which some CDNs otherwise misidentify.

### One caveat worth knowing: `vite.config.ts` uses `base: './'`

That's a **relative** base, not the default root-absolute `/`. It's what
produces `<script src="./assets/index-<hash>.js">` in the built
`dist/index.html` rather than `/assets/index-<hash>.js`. On Vercel this is
harmless for how the game is actually used (everything lives on one route,
`/`, with query params) because a relative reference from `/` resolves the
same as an absolute one. It would only bite if the SPA rewrite above ever
serves `index.html`'s content for a **deeper** path (e.g. someone links to
`/foo/bar`) — the browser would then resolve `./assets/...` against
`/foo/` and 404. Not a real risk today since nothing in the app links to
non-root paths, but if that ever changes, the fix is a Vercel/build-level
concern (e.g. switch `base` to `/` for the Vercel target), not something to
special-case here. Flagging it rather than touching `vite.config.ts`, since
gameplay source is off-limits for this change.

## Option A — Vercel Dashboard (Git-based)

This repo is **not yet a git repository**, so it isn't push-ready. From the
repo root (`C:\Users\Pekka\Desktop\oyundikri`):

```bash
git init
git add .
git commit -m "Initial commit"
```

Then create a repo on GitHub/GitLab/Bitbucket and push:

```bash
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

Then in the [Vercel dashboard](https://vercel.com/new): **Import Project** →
pick the repo → Vercel auto-detects the **Vite** framework preset. Confirm:

- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install` (default)
- Environment Variables: none needed

Click **Deploy**. Every subsequent push to the connected branch redeploys
automatically (preview deployments on PRs/branches, production on the
default branch).

## Option B — Vercel CLI (no git required)

Works directly against the local working directory, git or not.

```bash
npm i -g vercel
```

Then, **in an interactive terminal session** (this needs a browser for OAuth,
so it can't be run non-interactively on your behalf):

```bash
vercel login
```

Once logged in, deploy straight to production from the repo root:

```bash
vercel --prod
```

The CLI reads `vercel.json` automatically, runs `npm run build`, and uploads
`dist/`. First run will ask a couple of setup questions (link to existing
project / create new, project name, root directory — accept the defaults,
root directory is `.`).

## Status of this environment

Checked during setup: the `vercel` CLI is **not currently installed** in this
environment (`vercel --version` → command not found), so neither `vercel
login` nor a deploy could be run here. Both options above are ready to go —
whichever the user picks, the actual login/deploy step needs to happen in a
session where that human-interactive auth step (browser OAuth for the CLI, or
GitHub OAuth + git push for the dashboard) can happen. Nothing about the app
itself (env vars, backend, secrets) blocks either path — it's a fully static
bundle.
