# 名古屋 · 旅の手帖

Mobile-first travel companion for **November 15–18, 2026**, built from [the specification](docs/spec.md), [the design reference](docs/design.html), and the local Excel workbook. Traditional Chinese UI with Japanese place names. Vite, React, TypeScript, HashRouter, Leaflet, grayscale OpenStreetMap tiles, and a Workbox PWA.

## Run locally

Requires Node.js 20.19+ (22 recommended) and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173/LifeTravelGuide/**. The default route uses the Nagoya date, then remembers the last chosen day. Direct hash routes override this default:

- `#/day/2026-11-15` — arrival, booked transfer, flexible dinner
- `#/day/2026-11-16` — castle and antiques
- `#/day/2026-11-17` — art and Osu
- `#/day/2026-11-18` — checkout, Meitetsu, return flight
- `#/places` — search, multiple category filters, local visited history
- `#/documents` — private Drive links and official transportation resources

```sh
npm test
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. In this repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
2. Commit and push these application files and `public/data/` to `main`.
3. The included workflow validates data, runs regression checks, builds, and deploys **only `dist/`**. Pull requests build and test without publishing.

Expected URL after successful deployment: **https://juifa-tsai.github.io/LifeTravelGuide/**.

The workflow derives the base path from the repository name. For an account-root `username.github.io` repository or a custom domain, set `VITE_BASE_PATH: /` in the workflow. For other local paths:

```sh
VITE_BASE_PATH=/another-repo/ npm run build
```

Hash routing avoids server-side SPA rewrites on Pages. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite's base option](https://vite.dev/config/shared-options.html#base).

## Update the Excel data

The downloaded workbook remains the editing source. The site never reads private Drive APIs.

```sh
python3 -m pip install -r requirements.txt
npm run import:xlsx
npm run validate:data
npm test
npm run build
```

For a different workbook:

```sh
python3 scripts/xlsx-to-json.py /path/to/updated.xlsx
```

The importer reads the original seven sheets and allowlists fields into five JSON files in `public/data/`. It excludes default visit records, reservation contents, and the development task sheet. A gap report is generated in ignored `output/data-report.md`. Data validation runs on every build; CI intentionally uses committed JSON so changing a local workbook requires explicit reimport.

### Coordinates and photos

The original workbook has no coordinates or photos. `scripts/geocodes.json` supplies checked reference points from the [Geospatial Information Authority of Japan address/facility search](https://msearch.gsi.go.jp/address-search/AddressSearch). Every point records its exact source query, returned address, and check date. Address results are **street/block reference points, not entrance-level navigation**; use Google Maps for actual directions. The airport uses its terminal-connected station as a ground reference. Taiwan flights, virtual meals and duplicate events do not create extra map pins; route lines break at unknown places and never cross countries.

Explicit Excel coordinates take precedence over the supplement, but need a coordinate source in `scripts/geocodes.json` to pass validation. If you move a place, update both its workbook address and its geocode record. Unknown coordinates remain null; the text card still works.

No third-party photos are shipped. Missing images use the design's category placeholders. To add a licensed photo, fill `image_url` and add `imageAttribution` to the exported record (or extend the importer with a maintained attribution supplement). Use `images/name.webp` for project images under `public/images/`. Attribution is mandatory. Do not copy Google Maps photos. App icons and placeholders are original project artwork.

Map attribution remains visible: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Tiles use normal browser HTTP caching, with no bulk download, prefetch, or service-worker tile caching, per the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). The suggested CARTO endpoint returned API-key-required images during verification, so this implementation uses standard OSM tiles with grayscale CSS instead.

## Offline and local state

After a successful production visit, the service worker precaches the app, all five JSON files and local images. All six routes work offline. Base-map tiles, external navigation and Drive documents require connectivity; the UI explains this and disables external links when offline. No private PDF or map tile is cached. A new deployment prompts to update; returning to the app also checks for an update. Production caching can be tested with `npm run build && npm run preview`; it is intentionally disabled in development. See [Vite PWA documentation](https://vite-pwa-org.netlify.app/guide/).

Last selected day, map layer switches, and visit checks use `nagoya:*` localStorage keys. Visit records are stored by stable place ID, never uploaded or written to Excel. Unavailable storage falls back to in-memory session state. Clearing browser data removes local records. Location uses one `getCurrentPosition` call per tap and never watches or uploads a location.

## Content boundaries

The public site contains Drive **URLs/IDs**, as specified. The linked files retain their existing Google account permissions; this application cannot verify or change those permissions. No ticket PDFs, booking PINs, full reservation numbers, email addresses or credentials belong in public data or source control.

Hours, dietary suitability, fares and transit times remain workbook planning information; estimates are labeled. TORAYA's Monday opening, BAR BARNS's third-Tuesday closure and first-night dinner timing remain explicit checks. All image placeholders are intentional until licensed photos are supplied.
