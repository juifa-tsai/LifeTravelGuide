# 名古屋 · 旅の手帖

Mobile-first travel companion for **November 15–18, 2026**, built from [the specification](docs/spec.md), [the design reference](docs/design.html), and the local Excel workbook. Traditional Chinese UI with Japanese place names. Vite, React, TypeScript, HashRouter, Leaflet with light-gray OpenStreetMap tiles, and a Workbox PWA.

## Run locally

Requires Node.js 20.19+ (22 recommended) and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173/LifeTravelGuide/**. On launch, Japan time selects the matching travel day (11/15–18); dates outside the trip always select 11/15. Saved itinerary URLs reset to this default on a fresh load. Once open, date tabs remain freely selectable. Explicit utility links remain available:

- `#/day/2026-11-15` — arrival, booked transfer, flexible dinner
- `#/day/2026-11-16` — castle and antiques
- `#/day/2026-11-17` — art and Osu
- `#/day/2026-11-18` — checkout, Meitetsu, return flight
- `#/places` — a horizontally scrolling category strip and local visit checks
- `#/documents` — private Drive links and official transportation resources
- `#/audio` — help phrases, a recording player, translations and nearby convenience-store search

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

The importer reads the original seven sheets plus the optional `07_餐飲與酒吧動線` candidate sheet and allowlists fields into five JSON files in `public/data/`. It excludes default visit records, private booking contents, and the development task sheet. The place sheet’s public reservation requirement, notes, contact link and verification source are allowlisted; HYPERLINK formulas are read as URLs without evaluating formulas. A gap report is generated in ignored `output/data-report.md`. Data validation runs on every build; CI intentionally uses committed JSON so changing a local workbook requires explicit reimport.

### 第一晚晚餐與補充資料

11/15 的「今晚晚餐候選」依序為 MOLNODA（伏見本店）、CoCo 壱番屋 中区伏見通店、NINE CAFE 伏見店、麵屋華山、DURBAR 栄，最後保留杏ZU。21:45 是彈性用餐估計，不是訂位；杏ZU 週日約 21:30 最後點餐，通常僅適合早到者。

2026-11-13 核對的來源與限制：

- [MOLNODA 官方](https://molnoda.com/)：夜間至 23:00，碗餐可能僅外帶，L.O. 待確認。
- [CoCo 分店官方](https://tenpo.ichibanya.co.jp/map/2172/)：2026-11-14 再核對，分店現頁列 11:00–23:00，已同步各日一般時段；素咖哩供應與 L.O. 仍須確認。[官方素咖哩](https://www.ichibanya.co.jp/menu/detail.html?id=1327) 不使用動物性原料，但須確認該店販售及配料。
- [NINE CAFE 官方](https://akr0294539820.owst.jp/)：17:00–翌日04:00，餐點 L.O. 翌日03:00；披薩及義大利麵未經奶素認證。
- [華山開店報導](https://jouhou.nagoya/menya-kazan/)：11:00–24:00、L.O.23:30，有 Vegan 白湯拉麵；報導為 2025 年資料，當日菜單仍需確認，午夜後「裏かざん」菜單不可套用。
- [DURBAR 店家資料](https://tabelog.com/aichi/A2301/A230103/23073349/)：週日夜間至翌日04:00，不定休、L.O. 待確認；蔬菜／豆類咖哩與烤餅成分待詢問。

以上為一般營業資訊，**不保證 2026/11/15 當日營業或供餐**。奶素可乳製品，不吃肉、魚、蛋、魚露、柴魚與其他動物性高湯；每間店都要確認醬汁、麵皮／麵條、配料與當日供應。分類是候選用途，不代表整間店為素食專門店。新增五店已依店家／可信餐廳資料核對地址，並於 2026-11-13 取得國土地理院地址搜尋的唯一對應座標，顯示於踩點與每日地圖；這些是地址參考點，非入口導航。原始回應座標、查詢網址、對應地址與查核日記錄於 `scripts/geocodes.json`。五間店已改用對應店家的店面或室內實景截圖，來源及原攝影者署名保留。

`scripts/dinner-supplement.json` 保存五店完整資料與第一晚 `late_dinner` 的 `summary`／`note`。請修改該檔後執行 `npm run import:xlsx`，再執行 `npm run validate:data`、`npm test`、`npm run build`，一併提交補充檔及產生的 JSON。匯入以地點 `id`（行程的 `placeId`）去重；同 ID 若已存在 Excel，整筆 Excel 主資料優先，不用補充檔覆蓋。晚餐補充僅在相符日期／placeId 的說明為空時補上；最新版 Excel 的摘要與備註優先，不改時間、彈性狀態或其他預約欄位，也不改原始 Excel 與工作表。測試會實際重新匯入並驗證未遺失資料及 Excel 優先行為；CI 執行測試需安裝 `requirements.txt` 的 Python 依賴。

### Coordinates and photos

The original workbook has no coordinates or photos. `scripts/geocodes.json` supplies checked reference points from the [Geospatial Information Authority of Japan address/facility search](https://msearch.gsi.go.jp/address-search/AddressSearch). Every point records its exact source query, returned address, and check date. Address results are **street/block reference points, not entrance-level navigation**; use Google Maps for actual directions. The airport uses its terminal-connected station as a ground reference. Taiwan flights, virtual meals and duplicate events do not create extra map markers. Both the daily and places pages have interactive maps with clickable location markers. Daily maps always include the twenty-one shared vegetarian/café/bar favorites and lodging. The places map follows the active category filter, retaining only matching locations plus lodging. Itinerary favorites use one category icon instead of a duplicate pin. Daily dashed lines only connect adjacent known stops and break at virtual meals.

Explicit Excel coordinates take precedence over the supplement, but need a coordinate source in `scripts/geocodes.json` to pass validation. If you move a place, update both its workbook address and its geocode record. Unknown coordinates remain null; the text card still works.

All 43 real locations now use photographs of the matching place. The capture manifest contains 34 reviewed photographs, including storefronts, entrances, interiors, terraces and the actual activity venues. Twenty-two were captured with Playwright from publicly visible Google Maps place photographs; MOLNODA uses its official entrance-sign photograph because the Maps lead image is an architectural rendering. The 11 latest additions use photographs from venue/organizer websites, Nagoya’s official tourism site and a matched HomeMate Cinema 2 entrance photograph. The MIRAI TOWER image shows the view from its observation deck; the Shirotori image shows the garden in daylight, not a promised night scene. Existing Wikimedia location photos remain. Generic images remain labeled **示意** only for virtual meals/events. All images are local optimized WebP files for reliable offline viewing.

`scripts/storefront-photos.json` records the matched store name/address, photographer, original photo/viewer URL, capture date, view type and SHA-256 hashes. These personal noncommercial travel-reference screenshots retain the original photographers’ rights; they are **not CC-licensed or newly licensed by this repository**. Google Maps usage terms and the official source are recorded separately from the existing Commons CC licenses. Card and popup thumbnails open the matching place’s stable Google Maps location link. Per-card photographer captions have been removed; complete author/source/license attribution is grouped under the collapsed 圖片授權 section at the bottom of Documents. Historical photo-viewer URLs remain provenance records, not navigation targets. Full credits are in `public/images/credits.json`; Google Maps photos are not live API requests, and the app needs no Google API key.

To recapture one reviewed image, install Playwright in your maintenance environment, then run `node scripts/capture-place-photo.mjs <placeId>`. An existing installation can be selected with `PLAYWRIGHT_MODULE_PATH` (module file path) and `CHROMIUM_PATH`. Inspect the result against its source and photographer, synchronize the corresponding `scripts/media.json` entry, rebuild credits with `python3 scripts/fetch-images.py`, then run `npm run import:xlsx` and the normal validation/tests/build. Captures do not replace a missing photo with an unrelated stock image; Excel reimports retain them by stable place ID.

`scripts/media.json` maps stable place IDs to the preview image, credit, source, license, type and alternative text. The Excel importer merges this supplement so reimporting the workbook preserves the photos. `scripts/media-assets.json` records the original Commons files; restore missing Commons assets and rebuild all credits with (captured images must already exist):

```sh
python3 scripts/fetch-images.py
```

To replace a photo, update the matching media record with a licensed source and image type. If Excel's `image_url` overrides the supplement, matching credit metadata must also be updated. Missing or failed images still have a category fallback. App icons and fallback artwork are original project assets.

The map uses standard **OpenStreetMap** tiles with light-gray styling applied only to the base tiles and requires no API key or billing account. Leaflet attribution and [OpenStreetMap contributor credit](https://www.openstreetmap.org/copyright) remain visible. Tile requests follow browser HTTP caching, with no app-level tile prefetch or offline storage, per the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

`src/lib/mapPoints.ts` defines the shared collection. Daily maps merge it with formal itinerary points; the places map merges it with matching list results. Category selection affects both the places list and its location markers; only lodging stays present for empty results or unrelated categories. Daily itinerary maps retain their shared favorites. Initial map bounds favor Nagoya city points rather than the airport. Clicking a marker shows a photo popup with compact opening hours (including last-order details) and closure notes, and selects a visible matching card; a card's map button returns to its marker. A blue bed icon identifies the hotel. The **回到住宿** button below either map recenters it on the hotel, including repeated presses after panning, without requesting current-location permission or scrolling away from the map. Google Maps remains an external link for actual navigation.

## Offline and local state

After a successful production visit, the service worker precaches the app, all five JSON files and local images. All seven routes work offline. Local MP3 phrase recordings are precached with the app for offline playback. Base-map tiles, external navigation and Drive documents require connectivity; the UI explains this and disables external links when offline. No private PDF or map tile is cached. A new deployment prompts to update; returning to the app also checks for an update. Production caching can be tested with `npm run build && npm run preview`; it is intentionally disabled in development. See [Vite PWA documentation](https://vite-pwa-org.netlify.app/guide/).

Last selected day and visit checks use `nagoya:*` localStorage keys. Visit records are stored by stable place ID, never uploaded or written to Excel. Unavailable storage falls back to in-memory session state. Clearing browser data removes local records. Location uses one `getCurrentPosition` call per tap and never watches or stores a location. On the places page, an already granted permission is reused once on entry and when returning from the background; it does not trigger a new permission prompt automatically. The browser pans the map and requests only the visible tiles; this static application has no backend collecting location records.

## Content boundaries

The public site contains Drive **URLs/IDs**, as specified. The linked files retain their existing Google account permissions; this application cannot verify or change those permissions. No ticket PDFs, booking PINs, full reservation numbers, email addresses or credentials belong in public data or source control.

Hours, dietary suitability, fares and transit times remain workbook planning information; estimates are labeled. TORAYA's Monday opening and first-night dinner timing remain explicit checks. BAR BARNS uses its published November 2026 calendar: November 17 is open; November 15–16 are closed. This calendar does not establish other months’ opening days. Generic photos are labeled as illustrative and do not establish a restaurant’s menu or dietary suitability.

## Japanese phrase recordings

The **求助** tab (`#/audio`) displays collapsible phrase cards. Text starts collapsed; tap a card heading to show the Japanese phrase and Traditional Chinese translation. One large button plays or pauses the recording and offers replay when it ends; the native audio controls are hidden. Collapsing the text keeps playback available, and leaving the page stops the audio. The first card briefly asks whether vegetarian dishes are available. The second supplements it with lacto-vegetarian restrictions: dairy is allowed, while egg, meat, fish, bonito stock, fish sauce and other animal-based stock are avoided. Both use **Benji**, the selected AI male voice generated through Higgsfield / Seed Audio 1.0, at normal speaking speed (`speech_rate: 0`). Long silent gaps over 450 ms are shortened to about 220 ms, with brief leading/trailing silence; the spoken audio is not time-stretched. The recording metadata keeps the original generation and source checksum plus the silence-only edits. Starting another card pauses the previous recording so voices never overlap. There is no autoplay or microphone recording.

Edit `src/data/audioPhrases.ts` to add or revise a card and keep its text and audio in sync. Store generated MP3 recordings in `public/audio/`; `public/audio/recordings.json` records the prompt and generation details. The browser loads these local files using Vite's base path; it needs no Higgsfield account or API key to play them. MP3s are included in the service worker precache for offline playback after the production app finishes installing. Commit text, recording and metadata together, then run `npm test` and `npm run build`.

## Compact places collection

The places page uses collapsible cards. The preview shows the photo, name, today's regular opening window in **Japan time**, dining type (vegetarian or mixed kitchen where confirmed), and straight-line distance from the current position. Expanded cards show an approximately 50-character food description, Japanese name, address, concise hours/diet notes, source and navigation icons, visit checkbox, and distance from the hotel. The title count follows the selected category. The complete list and every category sort by unrounded straight-line distance from the hotel, nearest first. Unknown coordinates sort last; ties retain source order. This order does not depend on current GPS position and never changes daily itinerary order. The category icons stay in a single horizontally scrollable row with a hidden scrollbar. The all/unvisited/visited switch has been removed; individual visit checks remain stored locally. Opening windows are regular schedules, not live opening guarantees; a weekday-only workbook reference is never applied to another weekday.

`scripts/place-details.json` maintains checked food descriptions, dining types, weekly hours and source URLs, merged into `places.json` on every `npm run import:xlsx`. It adds card-specific fields without overwriting the workbook's original fields or changing itinerary bookings. Weekly hours use Sunday=0 through Saturday=6, `null` for a regular closure and an explicit short uncertainty string when sources disagree. Food classification describes the whole kitchen; a restaurant with a Vegan option may still be marked **葷素餐廳**. Source details and checks are recorded per place (2026-11-13).

Distances are local calculations from verified place coordinates; unknown coordinates stay unknown. Current-position distance appears only when the browser's position lies inside **Nagoya city**; outside the city (including other Japanese cities and Centrair airport), without permission, or when location is unavailable, it shows **—**. Hotel distance needs no current-location permission. No coordinates are sent to a geocoding service or stored in localStorage. The local 16-ward boundary and its attribution are documented in [the boundary source note](src/data/nagoyaBoundary.README.md). The simplified polygon is an approximate administrative boundary, so GPS/border precision can affect positions very close to the edge.

## 交通圖與繁中連結

「文件 → 交通與路線」直接顯示 Drive `travel / Asia / Japan / 2026 Nakoya` 提供的兩張路線圖：名古屋地下鐵日英圖，以及名鐵繁中圖。點圖可另開分頁放大；圖片隨網站快取供離線查看。地下鐵 PDF 以原圖轉為 WebP，名鐵保留 SVG，不改站名與路線；來源、原檔雜湊與處理方式記錄於 `public/transport/credits.json`，圖面權利歸各交通業者，不套用餐廳照片的 CC 授權。私人機票與住宿憑證仍只提供原本的 Drive 連結。

`scripts/transport-supplement.json` 保存圖卡資料、使用者提供的兩個繁中名鐵網站，以及已核實的名鐵／中部機場繁中網址對照。執行 `npm run import:xlsx` 會同步到既有五份 JSON；重新匯入不會遺失圖片設定，新增網站以 ID／網址去重。地下鐵官網使用站內語言切換，保留官方路線頁並提示可選繁中，不加入未確認有效的語言參數。更換交通圖片時請同步更新來源記錄及雜湊，再執行資料驗證、測試與建置。

每日時間軸與地圖均使用類型圖示（如飛機、列車、床、咖啡、古蹟），不再顯示數字順序；行程時間排序、地圖選取、回到住宿及踩點篩選沿用原有行為。

## 精簡手機畫面與共用地點資訊

移除最上方品牌橫幅、裝飾性的英文／日文副標及重複的頁尾導覽，四個分頁統一保留底部主選單（桌面亦可用）。主要內容以 16–18px 顯示，輔助資訊多為 14px；保留航班、時區、預約、奶素限制、當日營業不確定性及圖片來源等必要資訊。

`src/components/PlaceDetails.tsx` 共用踩點與時間軸的展開內容，包括約 50 字餐點說明、日文名稱、地址、營業／奶素提醒、距飯店直線距離，以及 Google Maps／地圖定位／來源圖示。時間軸保留行程日期的開放時段與個別安排備註，收合時顯示餐廳種類；展開不再重複放置大型照片。補充五店的座標在 Excel 匯入時自動合併，未經核實的座標仍不放置標記。造訪狀態切換已移除，勾選紀錄不會影響清單或地圖是否顯示。

## 依時段閱讀行程

時間軸以日本時間分為早上（12:00 前）、下午（12:00–18:00）與晚上（18:00 後），用小圖示、中文標題及細虛線分隔；沒有安排的時段不顯示，行程順序不變。一般地點卡片以 `0.5 hr`、`1 hr` 等顯示約略時長，依既有分鐘資料四捨五入至 0.5 小時，最少顯示 0.5 小時；未設定的停留時間不捏造時長。短程交通用分鐘呈現，60 分以上才改用 hr。固定航班保留精確時刻與台灣／日本時區，預約接機時間及退房限制保留在展開內容。原始 JSON 的時間、停留分鐘數、預約資訊及 Excel 格式不變。

移除地圖下方的圖例，踩點清單標題改隨分類顯示對應圖示與筆數。「地圖總覽」會停止未完成的移動並關閉彈窗，重新納入當前圖層的所有標記（含住宿；若有機場，也會納入），不改變分類篩選。首次載入仍優先顯示市區／當日行程範圍；按總覽才展開到整個圖層。

## 精煉交通與踩點分類

交通卡不再顯示車資、核實程度、資料來源表格或無用的待確認欄位。步行以單列顯示路線距離與分鐘數，點選可開啟導航；公共運輸直接顯示起訖站、路線與移動時間，需轉乘時再展開各段車站。必要的接機位置、μticket 等提醒保留，航班時刻與時區不變。尚未選定餐廳的交通列隱藏，不把假定地點當成已知路段。

`scripts/leg-details.json` 保存公共運輸站點與步行路線；本次行程使用九段公共運輸及十五段已核對的步行路線，Excel 匯入會依日期／起點／終點合併到 `legs.json` 的 `navigation` 欄位。站點依名古屋市交通局／名鐵官方路線圖及店家交通說明核對。步行距離與預估時間來自 [OpenStreetMap 路線服務](https://routing.openstreetmap.de/) 的 OSRM foot 路由回應，非直線距離；路段以既有核實地址參考點查詢（2026-11-13–14），實際入口、號誌與步速仍會影響結果。數值不顯示估算前綴符號；距離以 50m 或 0.1km 顯示，時間向上取整至分鐘。來源網址、原始距離／秒數、端點座標與核對日期保存在補充檔；網頁不會即時呼叫路線服務，也不會送出使用者位置。OpenStreetMap 貢獻者署名保留在頁面地圖中。地址座標變動後須重查步行資料，驗證會拒絕過期端點。

踩點清單與分類不再包含住宿與機場，名古屋車站仍歸在交通分類。飯店取自完整地點資料，固定保留在所有踩點地圖篩選中，供定位、導航與計算距離使用；每日航班、住宿安排及文件照常保留。

## 最新 Drive 行程同步（2026-11-14）

已同步 Drive「2026 Nakoya」中 03:13:43 UTC 更新的 Excel 原檔，共 46 個地點、37 個原始每日安排、30 段交通；踩點頁顯示其中 40 個非住宿／機場的實體地點。原檔雜湊與來源保存在 `docs/workbook-source.json`，重新執行 `npm run import:xlsx` 會重建相同資料，不修改 Excel。

新增 11 個地點：廣小路通冬季點燈（伏見段）、BAR YLANG YLANG、綠洲21、jazz inn LOVELY、Montmartre、大名古屋聖誕點燈、池田公園冬季點燈、榮南・大須冬季點燈、NAKED 天空賞月、ANIAFF《劇場版 AIR》、白鳥庭園紅葉點燈。全部保留地址參考座標、Maps 連結、實景照片、描述與官方／可信來源；分類列新增「夜間活動」，仍以飯店距離排序，分類後飯店標記持續保留。

行程依 Excel 更新：11/15 加入點燈散步與可選酒吧；11/16 改為 Montmartre 午餐、吹上市場／頂樓咖啡廳，晚間綠洲21與 BAR Récit；11/17 晚餐後加入爵士演出與可選 Bar Thistle。航班、接機與住宿訂單仍沿用既有資料，入住訂單只顯示一次，早餐維持隱藏。口袋候選排除當日已排入的店家；11/16 為 Bio Terrace，11/17 為 Miho’s Kitchen Grains。首晚六間晚餐候選順序不變。

只有「必須訂位？」為「是」的地點顯示 **需預約**；不顯示建議、可選或未確認的預約狀態標籤。Miho’s Kitchen Grains 的晚餐須至少三天前預約，ORIBIO 為至少前一天的完全預約制。聯絡／預約連結與條件只在卡片展開後顯示，沒有代為完成預約。匯入器支援原檔第19–22欄，包括 HYPERLINK 形式的連結。`scripts/place-details.json` 保存已核對的條件與來源，與圖片、座標補充檔一併依穩定 ID 合併。

活動不是每天皆有：NAKED 至11/15、AIR 場次為11/15與16、爵士演出為11/17；白鳥庭園11/16–17沒有一般夜間點燈。`eventPeriod` 與 `dateHours` 讓營業燈號依日期判斷，不把活動時段當成每日營業保證。首晚抵達後通常趕不上 NAKED；AIR 與既定晚餐時段重疊，只放入踩點候選。一般營業時間、天候與座位仍以現場／官方當日公告為準；Vegan 菜單須確認供應與醬汁，不因葷素店提供 Vegan 選項而標成全素餐廳。所有來源與核對日期保存在地點資料內。

介面維持原有卡片、地圖與半小時 hr 單位，移除所有數值前的波浪估算符號。語音分頁改名為「求助」，原有 `#/audio` 連結及 Benji 錄音保留；踩點頁標題右側的商店 icon，以及求助頁最上方與語音播放相同樣式的大按鈕，會開啟 Google Maps 搜尋附近超商（包含 Lawson、全家、7-Eleven 等）。搜尋由 Google Maps 處理，網站不另行取得或傳送使用者座標；離線時仍可播放語音，外部 Maps 搜尋依既有離線規則停用。

## 入境 QR（僅存本機）

文件頁最前方顯示 Visit Japan Web 入境審查及海關申報 QR，點圖可放大出示。首次可選擇原始 PNG／JPG／WebP 截圖（2 MB 內），或使用私人匯入連結；資料只存在目前瀏覽器的 `nagoya:entry-qr` localStorage，保留重新載入、切換頁面與離線使用。更換或移除只影響此瀏覽器，無跨裝置同步；清除瀏覽器資料後須重新匯入。

私人連結使用 `#/documents?entryQr=<原始黑白模組>`，內容位於 URL fragment，不會成為 HTTP 路徑／查詢，也不會送到 GitHub Pages、Google 或其他服務。匯入後立即以 replace 移除該參數。渲染保留原始 QR 黑白模組與四格留白，不重新解讀／編碼入境資料，不以 AI 產生圖片。提供給使用者的實際碼須在本機驗證掃描內容與原圖逐位元組一致；不將原圖、碼內容、個人姓名或私人匯入連結放入 repository、公開 JSON、測試 fixture 或 PWA 快取。一般訪客只會看到自己的本機資料或匯入提示。私人匯入連結也應保留於私人對話；請在平常使用旅遊 APP 的同一個瀏覽器開啟。

## 航班與住宿時間軸資料

時間軸的去、回程各以一張航班卡顯示完整起訖航廈、各地時刻、日本航空／經濟艙／訂單機型，回程另保留 09:55 報到提醒；抵達與報到不再重複顯示機場圖卡。車站轉乘與 19:55 預約接機放入點到點交通連線，保留車站、路線、時間及司機通知。住宿預訂資料只出現在 11/15 首次入住卡；其餘返回飯店與退房卡僅保留地點及必要提醒。移除早餐安排、早餐與行李資訊。兩段航班與首次入住卡各自直接連結 `documents.json` 中對應的私人 Drive 憑證。

基本資料集中於 `src/data/bookingBasics.ts`，核對來源為既有電子行程單、機票訂單確認、入住憑證及住宿訂單。`compactTimeline` 只整理顯示節點，不改 Excel、原始行程時刻或預約；重新匯入後仍維持精簡顯示。隱藏節點的地圖標記會對應到合併後的卡片，飯店位置與轉乘路線保留。刪除早餐卡後，從飯店前往當日第一站的交通仍顯示在時間軸起點。

訂單編號及航空公司訂位代號只存在瀏覽器 `nagoya:booking-details`，可用私人 `#/day/2026-11-15?bookings=<base64url>` 連結一次匯入，或在展開卡片按「編輯訂單」填寫。匯入後立即移除 fragment 參數，對應預訂的卡片讀取同一份本機資料；重新整理、切換日期或離線仍可看。只接受兩段航班的訂單編號／訂位代號，以及飯店、機場接送的訂單編號，不保存 PIN、姓名、票號、付款或證件資訊。不把實際編號、私人連結或來源 PDF 放進 repository、公開 JSON、測試 fixture 或預快取；清除瀏覽器資料後需重新匯入。Drive 憑證維持原本權限，需連線及有權限的 Google 帳號才能開啟。

求助頁的附近超商搜尋以白色卡片與語音播放相同的大按鈕呈現；踩點頁仍使用頂部商店 icon。圖片不再連到易失效的 Maps 照片檢視器，而是使用該地點原本的 `mapsUrl`，圖片載入失敗時也保留位置連結。每張卡片及交通圖下方的出處註解已移除，圖片與交通圖的作者及授權集中到文件頁底部的「圖片授權」，原始授權／處理紀錄與示意標籤保留。

機場接送於時間軸的「中部國際機場 → 名古屋伏見舒適飯店」交通區塊展開後，顯示 Trip.com 接機訂單、訂單編號、本機編輯按鈕及 `documents.json` 接駁分類的 Google Drive 訂單連結。已核對既有接機憑證中的平台與 11/15 19:55 日本時間；編號沿用同一個本機儲存鍵，以 `airport_transfer` 記錄，支援私人 fragment 匯入並保留原有航班／飯店資料。未匯入時顯示「—」，不把實際編號放入公開網站；離線仍可查看本機編號，Drive 連結需連線。

開啟網站或重新整理行程頁時，以日本日期選擇當日；旅行期間外固定開啟第一天，不再讀取或儲存上次選擇的日期。App 跨日本午夜從背景返回行程頁時也會更新日期；手動切換日期不受影響。文件、踩點、求助及私人匯入直連仍保留。各頁往下滑超過 320 px 後，右下角會出現白底圓形向上箭頭，點擊平滑回到頂端；按鈕避開底部分頁及更新通知，並尊重系統減少動態效果設定。

踩點卡片的當日時段前加入營業燈號：綠燈為依日本目前時間推算的營業中；實心灰燈為未營業，待確認使用透明底虛線圓框（保留無障礙狀態標籤）。分類下方的「全部／營業中」可與分類交叉篩選，清單筆數及地圖同步，飯店仍固定顯示。採用同一份 `openingInfo` 判斷午休、週休、第幾週公休及前一天延續的深夜營業；跨日正在營業時顯示延續至幾點。資訊每分鐘及從背景返回時更新；未知時段、戶外或各店不同不列為綠燈，不代表店家即時確認，臨休／最後點餐仍以店家資訊為準。Excel 原始資料不變。

本次開啟 App 期間，手動選擇的行程日期只保留在記憶體中；切換踩點、文件、求助後單按「行程」會回到該日期。400 ms 內連按兩下「行程」則回到日本當日行程，旅行期間外回第一天；重新開啟仍依原有當日預設規則。底部分頁停用雙擊縮放，觸控與滑鼠皆可使用雙擊回當日。

營業燈號與行程頁籤不新增圖例、說明文字或工具提示；踩點頁底部的一般備註移除，保留既有店家內容與無障礙標籤。
