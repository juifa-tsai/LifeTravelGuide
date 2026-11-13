# 名古屋 · 旅の手帖

Mobile-first travel companion for **November 15–18, 2026**, built from [the specification](docs/spec.md), [the design reference](docs/design.html), and the local Excel workbook. Traditional Chinese UI with Japanese place names. Vite, React, TypeScript, HashRouter, Leaflet with light-gray OpenStreetMap tiles, and a Workbox PWA.

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
- `#/places` — single-select icon category filters and local visited history
- `#/documents` — private Drive links and official transportation resources
- `#/audio` — Japanese phrase cards with a recording player and Traditional Chinese translations

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

### 第一晚晚餐與補充資料

11/15 的「今晚晚餐候選」依序為 MOLNODA（伏見本店）、CoCo 壱番屋 中区伏見通店、NINE CAFE 伏見店、麵屋華山、DURBAR 栄，最後保留杏ZU。21:45 是彈性用餐估計，不是訂位；杏ZU 週日約 21:30 最後點餐，通常僅適合早到者。

2026-11-13 核對的來源與限制：

- [MOLNODA 官方](https://molnoda.com/)：夜間至 23:00，碗餐可能僅外帶，L.O. 待確認。
- [CoCo 分店官方](https://tenpo.ichibanya.co.jp/map/2172/)：現頁列 23:00（L.O.），與先前週末 22:00 資訊有差異，週日先以 22:00 保守規劃，L.O. 待確認。[官方素咖哩](https://www.ichibanya.co.jp/menu/detail.html?id=1327) 不使用動物性原料，但須確認該店販售及配料。
- [NINE CAFE 官方](https://akr0294539820.owst.jp/)：17:00–翌日04:00，餐點 L.O. 翌日03:00；披薩及義大利麵未經奶素認證。
- [華山開店報導](https://jouhou.nagoya/menya-kazan/)：11:00–24:00、L.O.23:30，有 Vegan 白湯拉麵；報導為 2025 年資料，當日菜單仍需確認，午夜後「裏かざん」菜單不可套用。
- [DURBAR 店家資料](https://tabelog.com/aichi/A2301/A230103/23073349/)：週日夜間至翌日04:00，不定休、L.O. 待確認；蔬菜／豆類咖哩與烤餅成分待詢問。

以上為一般營業資訊，**不保證 2026/11/15 當日營業或供餐**。奶素可乳製品，不吃肉、魚、蛋、魚露、柴魚與其他動物性高湯；每間店都要確認醬汁、麵皮／麵條、配料與當日供應。分類是候選用途，不代表整間店為素食專門店。新增五店未核實座標，保留 null、只顯示清單和 Google Maps 外部搜尋連結，沿用現有已授權的示意圖及標籤。

`scripts/dinner-supplement.json` 保存五店完整資料與第一晚 `late_dinner` 的 `summary`／`note`。請修改該檔後執行 `npm run import:xlsx`，再執行 `npm run validate:data`、`npm test`、`npm run build`，一併提交補充檔及產生的 JSON。匯入以地點 `id`（行程的 `placeId`）去重；同 ID 若已存在 Excel，整筆 Excel 主資料優先，不用補充檔覆蓋。晚餐補充只更新相符日期／placeId 的說明，不改時間、彈性狀態或其他預約欄位，也不改原始 Excel 與工作表。測試會實際重新匯入並驗證未遺失資料及 Excel 優先行為；CI 執行測試需安裝 `requirements.txt` 的 Python 依賴。

### Coordinates and photos

The original workbook has no coordinates or photos. `scripts/geocodes.json` supplies checked reference points from the [Geospatial Information Authority of Japan address/facility search](https://msearch.gsi.go.jp/address-search/AddressSearch). Every point records its exact source query, returned address, and check date. Address results are **street/block reference points, not entrance-level navigation**; use Google Maps for actual directions. The airport uses its terminal-connected station as a ground reference. Taiwan flights, virtual meals and duplicate events do not create extra map markers. Both the daily and places pages have interactive maps with clickable location markers. The nine shared vegetarian/café/bar favorites and the lodging location are always included, with no visibility toggles. Itinerary favorites use one numbered marker instead of a duplicate pin. Daily dashed lines only connect adjacent known stops and break at virtual meals.

Explicit Excel coordinates take precedence over the supplement, but need a coordinate source in `scripts/geocodes.json` to pass validation. If you move a place, update both its workbook address and its geocode record. Unknown coordinates remain null; the text card still works.

Twenty credited Wikimedia Commons photos are shipped as optimized WebP files under `public/images/`, covering all 28 place records and all itinerary cards. Nine places have confirmed location photos; places without a reusable location photo use category photos clearly marked **示意**. This label is also present in alternative text. Photo credits link to the original file's author and license; full records, including resizing information, are in `public/images/credits.json`.

`scripts/media.json` maps stable place IDs to the preview image, credit, source, license, type and alternative text. The Excel importer merges this supplement so reimporting the workbook preserves the photos. `scripts/media-assets.json` records the original Commons files; restore missing assets with:

```sh
python3 scripts/fetch-images.py
```

To replace a photo, update the matching media record with a licensed source and image type. If Excel's `image_url` overrides the supplement, matching credit metadata must also be updated. Missing or failed images still have a category fallback. App icons and fallback artwork are original project assets.

The map uses standard **OpenStreetMap** tiles with light-gray styling applied only to the base tiles and requires no API key or billing account. Leaflet attribution and [OpenStreetMap contributor credit](https://www.openstreetmap.org/copyright) remain visible. Tile requests follow browser HTTP caching, with no app-level tile prefetch or offline storage, per the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

`src/lib/mapPoints.ts` defines the shared collection. Daily maps merge it with formal itinerary points; the places map merges it with matching list results. Category/visited filters affect the list and other location markers, while all shared favorite markers and the lodging marker remain present, even for empty results. Initial map bounds favor Nagoya city points rather than the airport. Clicking a marker shows a photo popup with compact opening hours (including last-order details) and closure notes, and selects a visible matching card; a card's map button returns to its marker. A blue bed icon identifies the hotel. The **回到住宿** button below either map recenters it on the hotel, including repeated presses after panning, without requesting current-location permission or scrolling away from the map. Google Maps remains an external link for actual navigation.

## Offline and local state

After a successful production visit, the service worker precaches the app, all five JSON files and local images. All seven routes work offline. Local MP3 phrase recordings are precached with the app for offline playback. Base-map tiles, external navigation and Drive documents require connectivity; the UI explains this and disables external links when offline. No private PDF or map tile is cached. A new deployment prompts to update; returning to the app also checks for an update. Production caching can be tested with `npm run build && npm run preview`; it is intentionally disabled in development. See [Vite PWA documentation](https://vite-pwa-org.netlify.app/guide/).

Last selected day and visit checks use `nagoya:*` localStorage keys. Visit records are stored by stable place ID, never uploaded or written to Excel. Unavailable storage falls back to in-memory session state. Clearing browser data removes local records. Location uses one `getCurrentPosition` call per tap and never watches or stores a location. The browser pans the map and requests only the visible tiles; this static application has no backend collecting location records.

## Content boundaries

The public site contains Drive **URLs/IDs**, as specified. The linked files retain their existing Google account permissions; this application cannot verify or change those permissions. No ticket PDFs, booking PINs, full reservation numbers, email addresses or credentials belong in public data or source control.

Hours, dietary suitability, fares and transit times remain workbook planning information; estimates are labeled. TORAYA's Monday opening, BAR BARNS's third-Tuesday closure and first-night dinner timing remain explicit checks. Generic photos are labeled as illustrative and do not establish a restaurant’s menu or dietary suitability.

## Japanese phrase recordings

The **語音** tab (`#/audio`) displays collapsible phrase cards. Text starts collapsed; tap a card heading to show the Japanese phrase and Traditional Chinese translation. One large button plays or pauses the recording and offers replay when it ends; the native audio controls are hidden. Collapsing the text keeps playback available, and leaving the page stops the audio. The first card briefly asks whether vegetarian dishes are available. The second supplements it with lacto-vegetarian restrictions: dairy is allowed, while egg, meat, fish, bonito stock, fish sauce and other animal-based stock are avoided. Both use **Benji**, the selected AI male voice generated through Higgsfield / Seed Audio 1.0, at a slightly slower rate. Starting another card pauses the previous recording so voices never overlap. There is no autoplay or microphone recording.

Edit `src/data/audioPhrases.ts` to add or revise a card and keep its text and audio in sync. Store generated MP3 recordings in `public/audio/`; `public/audio/recordings.json` records the prompt and generation details. The browser loads these local files using Vite's base path; it needs no Higgsfield account or API key to play them. MP3s are included in the service worker precache for offline playback after the production app finishes installing. Commit text, recording and metadata together, then run `npm test` and `npm run build`.
