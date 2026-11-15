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
npm run sync:itinerary
npm test
npm run build
```

For a newly downloaded workbook (the file is copied into `docs/` only after validation):

```sh
npm run sync:itinerary -- "/path/to/updated.xlsx"
```

The importer reads the original seven sheets plus the optional `07_餐飲與酒吧動線` candidate sheet and allowlists fields into five JSON files in `public/data/`. It excludes default visit records, private booking contents, and the development task sheet. The place sheet’s public reservation requirement, notes, contact link and verification source are allowlisted; HYPERLINK formulas are read as URLs without evaluating formulas. The workbook format and its other sheets are unchanged.

### 第一階段：安全同步與差異報告

`npm run sync:itinerary` 先快照輸入 Excel，在暫存區匯入與合併既有補充檔，再驗證資料、照片檔案、核實座標、餐飲資訊及點到點交通。通過後才更新原檔、五份 JSON、來源紀錄與 `public/data/version.json`；失敗保留目前資料，檔案套用中出錯則回復先前內容。同步鎖防止兩個同步程序互相覆蓋，重複執行不產生多餘變更。

```sh
# 僅預覽與檢查；有待套用差異或錯誤時回傳非零狀態
npm run sync:itinerary -- "/path/to/updated.xlsx" --check

# 核對報告後套用，再走既有測試／建置／commit／push 流程
npm run sync:itinerary -- "/path/to/updated.xlsx"
```

報告放在不上線的 `output/itinerary-sync.md` 與 `.json`，包含新增、移除、修改欄位、影響日期與待補資料；JSON 保留變更前後值。新增地點缺照片、座標、簡介／時段，或調整動線後缺交通資料時，先更新原有 `media.json`、`geocodes.json`、`place-details.json`、`leg-details.json` 等補充檔再重跑。地址、營業時段或交通說明變動時也會提示核對舊補充資料，不會自動猜測。既有地點只改時間或順序時直接重用已核實素材。步行路線換日期時，只在起訖地點與核實座標完全相同時重用；公共運輸仍按日期與起訖點查核。

每次停留新增穩定 `stopId`，與 `placeId`、排序 `sequence` 分開；初次升級沿用目前卡片識別，舊版 JSON 仍相容。匯入依既有內容與地點比對，改時間、插入、重排與跨日移動可保留 ID。重複飯店停留無法唯一辨識時停止同步，可用 `--identity-map /path/to/visits.json` 明確指定新 `日期/順序` 對應的既有 ID；值為 `null` 表示新增停留，避免默默猜錯。

來源檔 `--source /path/to/drive-source.json` 僅接受 `driveFileId`、`driveUrl`、`driveModifiedTime`，用於記錄下載時取得的 Drive 中繼資料；不接受授權憑證。未提供此來源檔的新 Excel 不沿用舊的 Drive 修改時間。`version.json` 記錄五份資料各自及整組 SHA-256，讓 CI 確認同一版 Excel、補充檔與發布資料一致；App 繼續使用原有載入與離線更新流程。

CI 在測試及建置前執行 `sync:itinerary --check`，避免漏匯入或混用版本。回歸測試改核對當前 Excel 與資料契約，不再綁死可編輯行程的筆數、時間、順序及整日雜湊；固定航班、預約、隱私、營業判斷、地圖與卡片互動測試保留。此階段沒有新增背景 Drive 存取權限，也不會自動提交或發布；仍使用既有 GitHub Pages 部署。

低階 `npm run import:xlsx` 與 `python3 scripts/xlsx-to-json.py /path/to/updated.xlsx` 仍可用於除錯，產生原有 `output/data-report.md`，但不負責更新來源紀錄與版本檔；正式更新請使用同步指令。

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

All 61 real locations now use photographs of the matching place. The capture manifest contains 52 reviewed photographs, including storefronts, entrances, interiors, terraces and the actual activity venues. Twenty-four were captured with Playwright from publicly visible Google Maps place photographs; MOLNODA uses its official entrance-sign photograph because the Maps lead image is an architectural rendering. The eleven activity additions use photographs from venue/organizer websites, Nagoya’s official tourism site and a matched HomeMate Cinema 2 entrance photograph. The MIRAI TOWER image shows the view from its observation deck; the Shirotori image shows the garden in daylight, not a promised night scene. Existing Wikimedia location photos remain. Generic images remain labeled **示意** only for virtual meals/events. All images are local optimized WebP files for reliable offline viewing.

`scripts/storefront-photos.json` records the matched store name/address, photographer, original photo/viewer URL, capture date, view type and SHA-256 hashes. These personal noncommercial travel-reference screenshots retain the original photographers’ rights; they are **not CC-licensed or newly licensed by this repository**. Google Maps usage terms and the official source are recorded separately from the existing Commons CC licenses. Card and popup thumbnails open the matching place’s stable Google Maps location link. Per-card photographer captions have been removed; complete author/source/license attribution is grouped under the collapsed 圖片授權 section at the bottom of Documents. Historical photo-viewer URLs remain provenance records, not navigation targets. Full credits are in `public/images/credits.json`; Google Maps photos are not live API requests, and the app needs no Google API key.

To recapture one reviewed image, install Playwright in your maintenance environment, then run `node scripts/capture-place-photo.mjs <placeId>`. An existing installation can be selected with `PLAYWRIGHT_MODULE_PATH` (module file path) and `CHROMIUM_PATH`. Inspect the result against its source and photographer, synchronize the corresponding `scripts/media.json` entry, rebuild credits with `python3 scripts/fetch-images.py`, then run `npm run import:xlsx` and the normal validation/tests/build. Captures do not replace a missing photo with an unrelated stock image; Excel reimports retain them by stable place ID.

`scripts/media.json` maps stable place IDs to the preview image, credit, source, license, type and alternative text. The Excel importer merges this supplement so reimporting the workbook preserves the photos. `scripts/media-assets.json` records the original Commons files and the matched shopping-product reference; restore missing Commons assets and rebuild all credits with (captured images must already exist):

```sh
python3 scripts/fetch-images.py
```

To replace a photo, update the matching media record with a licensed source and image type. If Excel's `image_url` overrides the supplement, matching credit metadata must also be updated. Missing or failed images still have a category fallback. App icons and fallback artwork are original project assets.

The map uses standard **OpenStreetMap** tiles with light-gray styling applied only to the base tiles and requires no API key or billing account. Leaflet attribution and [OpenStreetMap contributor credit](https://www.openstreetmap.org/copyright) remain visible. Tile requests follow browser HTTP caching, with no app-level tile prefetch or offline storage, per the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

`src/lib/mapPoints.ts` defines the shared collection. Daily maps merge it with formal itinerary points; the places map merges it with matching list results. Category selection affects both the places list and its location markers; only lodging stays present for empty results or unrelated categories. Daily itinerary maps retain their shared favorites. Initial map bounds favor Nagoya city points rather than the airport. Clicking a marker shows a photo popup with compact opening hours (including last-order details) and closure notes, and selects a visible matching card; a card's map button returns to its marker. A blue bed icon identifies the hotel. The **回到住宿** button below either map recenters it on the hotel, including repeated presses after panning, without requesting current-location permission or scrolling away from the map. Google Maps remains an external link for actual navigation.

## Offline and local state

After a successful production visit, the service worker precaches the app, all five JSON files and local images. All eight routes work offline. Local MP3 phrase recordings are precached with the app for offline playback. Base-map tiles, external navigation and Drive documents require connectivity; the UI explains this and disables external links when offline. No private PDF or map tile is cached. A new deployment prompts to update; returning to the app also checks for an update. Production caching can be tested with `npm run build && npm run preview`; it is intentionally disabled in development. See [Vite PWA documentation](https://vite-pwa-org.netlify.app/guide/).

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

距離使用經核實地點座標在本機計算，維持 `0.1 km` 的直線距離格式與距飯店近至遠排序。App 開啟、從背景返回或從瀏覽器上一頁快取恢復時，自動取得一次新定位；確認在日本（含中部機場）後，前景每 60 秒主動重新取得一次。確認在日本以外則停止自動取樣，卡片距離顯示 **—**，下次返回 App 或手動點「我的位置」再確認。全 App 共用一個 `LocationProvider`，切換行程日期或任何頁籤都沿用同一位置與計時器。

每次要求高精度、禁止使用快取位置；在日本且前景時，保留一個 `watchPosition` 持續更新藍點與卡片距離，同時每 60 秒以 `getCurrentPosition` 取得新定位，避免只依賴瀏覽器的移動通知而停滯。分鐘更新與手動定位共用單次請求，不重啟或中斷連續訂閱。暫時逾時／不可用時保留訂閱，讓後續座標自行恢復；仍有有效位置時不反覆顯示錯誤。取得日本以外的位置後即停止訂閱與定時取樣。初次及單次定位 15 秒內未取得則逾時，已確認日本時仍按分鐘重試，最後定位超過兩分鐘自動清除，過期資料與取消前的回呼不會覆蓋新位置。初次定位失敗、拒絕權限或瀏覽器不支援時停止自動重試，保留「我的位置」手動重試。首次使用仍需瀏覽器允許定位，無須 Permissions API。

切到背景、鎖屏或離開頁面立即取消定位與計時器，回到前景重新取得，網頁／PWA 不保證背景每分鐘執行。自動定位同步卡片距離與藍點，保留正在看的地圖視角；「我的位置」立即要求定位並將地圖移到取得的位置，在日本以外也能手動使用。距飯店數字不需定位權限。日本判定採隨 App 快取的本機公開地理資料及 3 km 海岸容差，不需外部地理服務或 API key；來源、授權及雜湊見 [日本範圍資料說明](src/data/japanBoundary.README.md)。使用者位置僅留在記憶體，不寫入 localStorage 或訂單資料。

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

`scripts/leg-details.json` 保存公共運輸站點與步行路線；本次行程使用十七段公共運輸及二十二段已核對的步行路線，Excel 匯入會依日期／起點／終點合併到 `legs.json` 的 `navigation` 欄位。站點依名古屋市交通局／名鐵官方路線圖及店家交通說明核對。步行距離與預估時間來自 [OpenStreetMap 路線服務](https://routing.openstreetmap.de/) 的 OSRM foot 路由回應，非直線距離；路段以既有核實地址參考點查詢（2026-11-13–16），實際入口、號誌與步速仍會影響結果。數值不顯示估算前綴符號；距離以 50m 或 0.1km 顯示，時間向上取整至分鐘。來源網址、原始距離／秒數、端點座標與核對日期保存在補充檔；網頁不會即時呼叫路線服務，也不會送出使用者位置。OpenStreetMap 貢獻者署名保留在頁面地圖中。地址座標變動後須重查步行資料，驗證會拒絕過期端點。

踩點清單與分類不再包含住宿與機場，名古屋車站仍歸在交通分類。飯店取自完整地點資料，固定保留在所有踩點地圖篩選中，供定位、導航與計算距離使用；每日航班、住宿安排及文件照常保留。

## 最新 Drive 行程同步（2026-11-16 日本時間）

已同步 Drive「2026 Nakoya」於2026-11-15 22:48:21 UTC（日本11/16 07:48）更新的 Excel 原檔，共63個地點、41個原始每日安排、45段交通；踩點仍顯示58個非住宿／機場的實體地點。本次沒有新增地點，原有實景圖、核實地址參考座標與奶素資訊依穩定 placeId 重用。來源時間、計數與 SHA-256 保存在 `docs/workbook-source.json`；同步版本及各檔雜湊見 `public/data/version.json`。

11/16改為名古屋城、大須與覺王山：保留07:50加藤珈琲候位與08:35略過門檻、09:20名古屋城；11:45在KHAJA GHAR吃蔬菜達爾巴特，接大須觀音與商店街，14:40覺王山參道與日泰寺、16:30 AOI咖啡、17:30 TORAYA晚餐，晚間綠洲21與BAR Récit維持原安排。KHAJA GHAR官網已更新為10:00–23:00、無固定公休、L.O.22:30；蔬菜套餐仍須確認豆湯、咖哩與配菜無肉、魚介、蛋及動物性高湯。日泰寺05:00–16:30，參道各店時段不同，不把整條街當成寺院時段。

11/17保留09:00可選SHRUB、09:30美術館，午餐改11:50 Pupu Kitchen；經淺間町、丸之內到13:15吹上老件店，14:18同棟Le Jardin、14:55爲三郎記念館、16:20丸田町STORE IN FACTORY，接18:00森のカレー與原有爵士／Bar Thistle。Pupu午餐11:30–14:00，官方與名古屋市餐飲資料確認採植物性食材；山本屋大久手本店保留為午餐備案，需指定純素品項。吹上每週三及第二週二休，11/17第三週二依常態營業資訊安排；臨休仍須出發前確認。

所有行程時間、停留、狀態、原始摘要及提醒以Excel為準；11/15與11/18原始安排完全不變。新動線已補齊官方路線圖核對的起訖站與轉乘，以及有來源的步行距離；可略過景點的交通備案也保留。每日標題與簡介移到 `scripts/trip-details.json`，分別顯示「古蹟與街區」「藝術與老件」，之後不必為改標題修改程式。補充資料、照片授權與地圖格式、飯店固定標記、定位距離、營業篩選及卡片收合沿用現有功能。

原有10間潮牌／選物、夜間活動及餐飲收藏仍完整保留；餐飲用 `foodDescription`，潮店與街區用 `description`，共用相同卡片版面。預約僅在Excel明列必須時顯示「需預約」，其他不加標籤。照片為各地點匹配實景，來源與權利維持原圖片紀錄；部分為歷年照片，實際裝潢可能改變。國土地理院座標是地址／街區參考點，不當作精確入口。

求助頁原有 Benji 錄音、匯率換算與附近超商搜尋保留；`#/audio` 路由不變。飯店早餐隱藏、外出早餐保留，航班與入住資訊各顯示一次；私人訂單、返台接駁、QR與待辦文字／勾選／圖片均不受Excel同步影響。

## 入境 QR（僅存本機）

文件頁最前方顯示 Visit Japan Web 入境審查及海關申報 QR，點圖可放大出示。首次可選擇原始 PNG／JPG／WebP 截圖（2 MB 內），或使用私人匯入連結；資料只存在目前瀏覽器的 `nagoya:entry-qr` localStorage，保留重新載入、切換頁面與離線使用。更換或移除只影響此瀏覽器，無跨裝置同步；清除瀏覽器資料後須重新匯入。

私人連結使用 `#/documents?entryQr=<原始黑白模組>`，內容位於 URL fragment，不會成為 HTTP 路徑／查詢，也不會送到 GitHub Pages、Google 或其他服務。匯入後立即以 replace 移除該參數。渲染保留原始 QR 黑白模組與四格留白，不重新解讀／編碼入境資料，不以 AI 產生圖片。提供給使用者的實際碼須在本機驗證掃描內容與原圖逐位元組一致；不將原圖、碼內容、個人姓名或私人匯入連結放入 repository、公開 JSON、測試 fixture 或 PWA 快取。一般訪客只會看到自己的本機資料或匯入提示。私人匯入連結也應保留於私人對話；請在平常使用旅遊 APP 的同一個瀏覽器開啟。

## 航班與住宿時間軸資料

時間軸的去、回程各以一張航班卡顯示完整起訖航廈、各地時刻、日本航空／經濟艙／訂單機型，回程另保留 09:55 報到提醒；抵達與報到不再重複顯示機場圖卡。車站轉乘與 19:55 預約接機放入點到點交通連線，保留車站、路線、時間及司機通知。住宿預訂資料只出現在 11/15 首次入住卡；其餘返回飯店與退房卡僅保留地點及必要提醒。僅隱藏飯店早餐與行李資訊；行程新增的外出早餐沿用一般地點卡。兩段航班與首次入住卡各自直接連結 `documents.json` 中對應的私人 Drive 憑證。

基本資料集中於 `src/data/bookingBasics.ts`，核對來源為既有電子行程單、機票訂單確認、入住憑證及住宿訂單。`compactTimeline` 只整理顯示節點，不改 Excel、原始行程時刻或預約；重新匯入後仍維持精簡顯示。隱藏節點的地圖標記會對應到合併後的卡片，飯店位置與轉乘路線保留。`isHotelBreakfast` 共用於時間軸及每日地圖，外出早餐不會被過濾；飯店出發交通仍顯示在時間軸起點。加藤珈琲的展開卡顯示「抵達07:50」，並保留08:35候位略過門檻。

訂單編號及航空公司訂位代號只存在瀏覽器 `nagoya:booking-details`，可用私人 `#/day/2026-11-15?bookings=<base64url>` 連結一次匯入，或在展開卡片按「編輯訂單」填寫。匯入後立即移除 fragment 參數，對應預訂的卡片讀取同一份本機資料；重新整理、切換日期或離線仍可看。只接受兩段航班的訂單編號／訂位代號、飯店及機場接送的訂單編號，以及接機車輛／司機欄位，不保存 PIN、旅客姓名、票號、付款或證件資訊。不把實際編號、私人連結或來源 PDF 放進 repository、公開 JSON、測試 fixture 或預快取；清除瀏覽器資料後需重新匯入。Drive 憑證維持原本權限，需連線及有權限的 Google 帳號才能開啟。

求助頁的附近超商搜尋以白色卡片與語音播放相同的大按鈕呈現；踩點頁仍使用頂部商店 icon。圖片不再連到易失效的 Maps 照片檢視器，而是使用該地點原本的 `mapsUrl`，圖片載入失敗時也保留位置連結。每張卡片及交通圖下方的出處註解已移除，圖片與交通圖的作者及授權集中到文件頁底部的「圖片授權」，原始授權／處理紀錄與示意標籤保留。

機場接送於時間軸的「中部國際機場 → 名古屋伏見舒適飯店」交通區塊展開後，顯示 Trip.com 接機訂單、訂單編號、本機編輯按鈕及 `documents.json` 接駁分類的 Google Drive 訂單連結。已核對既有接機憑證中的平台與 11/15 19:55 日本時間；編號沿用同一個本機儲存鍵，以 `airport_transfer` 記錄，支援私人 fragment 匯入並保留原有航班／飯店資料。未匯入時顯示「—」，不把實際編號放入公開網站；離線仍可查看本機編號，Drive 連結需連線。

開啟網站或重新整理行程頁時，以日本日期選擇當日；旅行期間外固定開啟第一天，不再讀取或儲存上次選擇的日期。App 跨日本午夜從背景返回行程頁時也會更新日期；手動切換日期不受影響。文件、踩點、求助及私人匯入直連仍保留。各頁往下滑超過 320 px 後，右下角會出現白底圓形向上箭頭，點擊平滑回到頂端；按鈕避開底部分頁及更新通知，並尊重系統減少動態效果設定。

踩點卡片的當日時段前加入營業燈號：綠燈為依日本目前時間推算的營業中；實心灰燈為未營業，待確認使用透明底虛線圓框（保留無障礙狀態標籤）。分類下方的「全部／營業中」可與分類交叉篩選，清單筆數及地圖同步，飯店仍固定顯示。採用同一份 `openingInfo` 判斷午休、週休、第幾週公休及前一天延續的深夜營業；跨日正在營業時顯示延續至幾點。資訊每分鐘及從背景返回時更新；未知時段、戶外或各店不同不列為綠燈，不代表店家即時確認，臨休／最後點餐仍以店家資訊為準。Excel 原始資料不變。

本次開啟 App 期間，手動選擇的行程日期只保留在記憶體中；切換踩點、文件、求助後單按「行程」會回到該日期。400 ms 內連按兩下「行程」則回到日本當日行程，旅行期間外回第一天；重新開啟仍依原有當日預設規則。底部分頁停用雙擊縮放，觸控與滑鼠皆可使用雙擊回當日。

營業燈號與行程頁籤不新增圖例、說明文字或工具提示；踩點頁底部的一般備註移除，保留既有店家內容與無障礙標籤。

接機卡片支援本機保存車牌、車色、車型、司機姓名與語言，展開後以三列精簡呈現；可在既有「編輯訂單」表單修改。這些欄位僅允許用於 `airport_transfer`，不寫入公開 JSON、原始 Excel 或程式碼。車輛匯入使用 `?pickup=<base64url>` fragment，舊版會保留這個參數，更新後才處理；不會讓舊版訂單解析器刪除未支援的車輛內容。私人 fragment 的局部匯入會逐欄合併，保留同一接機訂單的既有編號與其他航班／住宿紀錄；離線與重新載入沿用同一份本機資料。


## 返台接駁（11/18）

回程航班後以同一套精簡時間軸卡顯示「桃園機場 → 台北住處」，不重複機場照片，不新增台灣地點到名古屋地圖。返台卡使用台灣時間；上車點為第二航廈。訂單登記時間與航班抵達時間相同，依出關及司機通知上車，不把登記時間當作確定上車時刻。

`BookingDetails` 共用訂單與車輛版面，新增獨立的 `taiwan_transfer` 本機紀錄，可保存目的地地址、訂單編號、四位驗證碼、全鋒短訂單連結、登記時間與日後提供的司機／車輛資料。這次使用者明確要求記錄的全鋒驗證碼，只允許放在此本機紀錄；其他預訂仍不接受驗證碼或 PIN。公開程式碼只有通用卡片與業者名稱，不包含實際住址、訂單、驗證碼、私人短連結或訂單回應。

私人 `#/day/2026-11-18?returnTransfer=<base64url>` 連結匯入後切到返台日並移除參數；舊版會保留尚未支援的參數，更新後再匯入。既有四筆航班、住宿及日本接機紀錄逐欄保留。返台訂單連結限 `https://www.tms.tw/` 下六碼短網址，不將驗證碼加到外部網址或從 App 自動查詢訂單。私人資料只存瀏覽器，離線可讀；訂單與 Google Maps 路線須連線及使用者點選才開啟。Excel、JSON 匯入及圖片資料不受影響。


## 待辦清單

底部頁籤順序為「行程／踩點／文件／待辦／求助」，`#/todos` 初始顯示兩項待辦：買爽潤 PREMIUM（360粒，2罐），以及買明信片寫給 Craig 和宜儒。清單最下方的「＋」可新增；連點卡片兩下可編輯事項與備註，儲存或取消皆在卡片內完成。不顯示編輯圖示或操作提示；鍵盤聚焦卡片後可按 Enter 編輯，表單可按 Escape 取消。勾選框獨立操作，不會因連點內容編輯而改變完成狀態。商品縮圖仍可單獨點開放大，編輯原有商品的文字會保留圖片。

初始商品使用已核對相同360粒藍白包裝的 Lucky Sky 商品實照；來源與原作者權利沿用圖片紀錄及文件頁折疊授權區，圖片隨 App 離線保存。完成狀態按穩定 ID 存在 `nagoya:todos`，新增及編輯的文字另存於 `nagoya:todo-items`，保留舊版的勾選，不因改名重新建立 ID。輸入文字只作純文字呈現，本機儲存資料會檢查格式、重複 ID 與長度；不接受自訂圖片網址。切頁、重開與離線仍保留，瀏覽器無法寫入時沿用本次瀏覽狀態。清除瀏覽器資料會清除待辦紀錄，不影響其他本機訂單或造訪紀錄。


## 每站抵達時間

時間軸卡片展開後簡短顯示「抵達 HH:mm」，直接使用 Excel 的到達時間。例如加藤珈琲07:50、STORE IN FACTORY 16:20、AOI 16:30，不加停留分鐘。日本時區沿用頁首，台灣時刻才另標「台灣時間」。最後一站與停留時間未知的地點也能顯示原排程時刻；航班與預約接機沿用各自的時刻資訊。收合卡片保留既有 hr 顯示，Excel 與預約資料不變。

## 日圓／台幣換算

求助頁最上方的匯率卡可直接輸入日圓或台幣，以同一筆 JPY/TWD 匯率雙向換算至小數點後兩位，切換頁籤保留本次輸入。`ExchangeRateProvider` 在 App 開啟及回到前景時向 [Frankfurter](https://frankfurter.dev/) 取得最新可用的參考匯率，不需 API key；切換 App 內頁籤不重複要求，卡片上的更新圖示可手動重試。畫面標示來源的匯率日期，資料發布頻率依來源，銀行實際兌換價格可能不同。

八秒逾時或離線時沿用最後成功匯率並標示「上次匯率」及日期；尚無匯率時不產生換算數字。已驗證的數值及日期存在 `nagoya:jpy-twd-rate`，儲存受限時保留本次記憶體資料。使用者輸入的金額只在本機計算，不傳給匯率服務、不寫入 localStorage，也不影響私人訂單與 GPS 資料。背景會取消未完成的匯率要求，返回時重新更新。
