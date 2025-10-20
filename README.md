# Break Rush

Break Rush is a mobile-first portrait arcade dodger built with vanilla TypeScript and Vite. Guide your runner with one-finger drags or optional three-lane taps while weaving through increasingly aggressive hazards. Near misses feed a score multiplier, quick power-ups keep you alive, and sessions land in the 45–75 second range.

## Features

- **Tight feel on phones** – high-DPI canvas, safe-area aware layout, big tap targets, Vibration API feedback (with graceful fallback), and prevention of accidental scroll/zoom during play.
- **Skill-focused gameplay** – fixed timestep simulation, ramping enemy spawns, near-miss multiplier halo, bombs, slow-mo, shield layers, and collectible score orbs.
- **Accessibility & settings** – high-contrast and colorblind palettes, toggles for sound, haptics, and 3-lane tap mode. Preferences persist in `localStorage`.
- **Procedural presentation** – all visuals are drawn with Canvas2D, all sound effects are synthesized at runtime via the Web Audio API.
- **Offline-ready PWA** – installable manifest, service worker with cache busting, and build-time PNG icon generation.
- **Production ops** – environment-aware base paths, deploy script for immutable releases, and reference Nginx configurations.

## Getting started

```bash
npm install
npm run dev
```

The dev server launches at [http://localhost:5173](http://localhost:5173) with hot reloading. The game listens for a “Tap to start” gesture to unlock audio. Pointer and keyboard controls both work on desktop.

### Linting

```bash
npm run lint
```

Runs the TypeScript compiler in type-check mode.

## Building for production

`vite.config.ts` reads the deployment base path from the `VITE_BASE` environment variable (default `/`). When serving the app from a sub-path – e.g. `https://example.com/break_rush/` – set the variable before building:

```bash
VITE_BASE="/break_rush/" npm run build
```

`npm run build` automatically triggers the postbuild lifecycle script which:

1. Generates 192px and 512px PNG icons inside `dist/icons/` using the pure TypeScript encoder in `src/build/png-encoder.ts`.
2. Rewrites `dist/manifest.webmanifest` so `start_url`, `scope`, and icon paths honor the configured `VITE_BASE`.

The output bundle in `dist/` is ready to be served as static files. To verify the production build locally you can use:

```bash
npm run preview
```

## Progressive Web App

- `public/manifest.webmanifest` ships with placeholder URLs that the postbuild script replaces.
- `src/pwa/sw.ts` caches hashed static assets with an immutable policy and provides SPA fallback when offline.
- `src/pwa/registerSW.ts` registers the service worker as an ES module; no extra tooling required.

## Deployment

`scripts/deploy.sh` builds and publishes an immutable release under `/var/www/break_rush/releases/<timestamp>/` and atomically retargets the `/var/www/break_rush/current` symlink.

```bash
./scripts/deploy.sh
```

The script performs these steps:

1. `npm ci` to install clean dependencies.
2. `npm run build` (postbuild runs automatically).
3. Rsyncs `dist/` into a timestamped release directory.
4. Sets ownership to `www-data` with `755/644` permissions.
5. Swaps the `current` symlink in an atomic `mv -T` operation.
6. Validates and reloads Nginx (`nginx -t && systemctl reload nginx`).

### Rollback

Each deployment is preserved in `/var/www/break_rush/releases/`. To roll back, repoint the `current` symlink to a previous timestamp and reload Nginx:

```bash
ln -sfn /var/www/break_rush/releases/20240418091500 /var/www/break_rush/current.tmp
mv -T /var/www/break_rush/current.tmp /var/www/break_rush/current
nginx -t && systemctl reload nginx
```

No rebuild is required as long as the desired release folder still exists.

## Nginx examples

Reference configurations live in [`scripts/nginx/`](scripts/nginx/):

- [`root.conf`](scripts/nginx/root.conf) – serve Break Rush from `https://example.com/` using strong caching for hashed assets, `nosniff`/`SAMEORIGIN` headers, and SPA fallback to `index.html`.
- [`subpath.conf`](scripts/nginx/subpath.conf) – mount the game at `https://example.com/break_rush/`, including a redirect from `/break_rush` to `/break_rush/`, alias-based static delivery, immutable caching, and service-worker exceptions.

Remember to adjust TLS directives, certificates, and upstream configuration for your environment.

## Git hygiene

- `.gitattributes` enforces LF line endings and marks binary extensions so they never receive text diffs.
- `.git-hooks/pre-commit` rejects staged binaries. Enable it with:

  ```bash
  chmod +x .git-hooks/pre-commit
  git config core.hooksPath .git-hooks
  ```

## License

MIT © 2024 Break Rush contributors
