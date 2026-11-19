# Vice Cover Studio

![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/gentle-condor-77/gta6-cover-art/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/gentle-condor-77/gta6-cover-art/reward.svg)

Turn any photo into GTA 6-style cover art — the iconic multi-panel poster / loading-screen
look with a Vice City neon-sunset grade — and export it as a PNG to share. Fully offline:
no network, no uploads, your photos never leave the machine.

## How it works

1. **Pick a layout** — Poster, Loading screen, Comic grid, or Strip. Each is a grid of
   photo panels in white gutters over a sunset sky (slit sun, stars, palm silhouettes).
2. **Fill the panels** — use the two built-in sample photos or upload your own. Click a
   panel to pick it, choose its photo, drag the photo to place it, zoom with the slider.
3. **Pick a grade** — Sunset, Neon Nights, Noir, or Palm Dusk. Each grades every panel
   and repaints the sky to match.
4. **Letter the caption** — kicker, big outlined title, and tagline pill, in the genre's style.
5. **Export** — one PNG at 1080×1080, 1080×1350, or 1920×1080, or all three sizes in one step.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Everything is static files under `app/` — `index.html`, `style.css`, and the ES modules in
`app/src/` (`cover.js` draws the poster, `main.js` wires the page). No library, no build step.

## Entry

Built for the make.fun bounty
[gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) — free entry, $250 pot.
`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output
directory and writes `dossier.json` with the vendored make.fun library.
