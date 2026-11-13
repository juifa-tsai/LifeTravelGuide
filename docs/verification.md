# Verification — Google map and preview image update

Verified locally using the production build and Firefox through Playwright. The original design/spec are retained as source references; the following behavior reflects the owner's subsequent change requests.

- The daily map is a real Google Maps embed with grayscale styling. The embedded map retains Google's attribution and its own interactions.
- Candidate map layers and their controls were removed. Numbered shortcuts select a map location and scroll to the relevant itinerary card; card map actions update the embedded location. Iframe map clicks cannot call back into the app, and the previous custom Leaflet markers/route lines are no longer displayed.
- All 23 place records, including flexible meal blocks, have local preview images. All itinerary card headers include thumbnails. Nine places have confirmed location photos; other images are visibly labeled illustrative, including in alt text.
- Twenty Wikimedia Commons assets were downloaded, inspected, resized and converted to WebP. Author, license, source and transformation records are retained under `public/images/credits.json`; visible credit links open the source pages.
- The Excel importer merges `scripts/media.json` by stable place ID so photos and credits survive reimporting.
- Category controls use nine icon-only native radio inputs (including all categories), with accessible names, tooltips and a single checked category. Switching coffee to bars clears coffee and returns only bars.
- Repetitive explanatory prose and generic disclaimers were removed. Flight/transfer facts, flexible dinner timing and material restaurant opening/dietary cautions remain.

Validation: production build, TypeScript and five data regression checks pass. The fifth check verifies every place/itinerary preview exists as a WebP file and illustrative images are honestly labeled.

Browser verification covers category exclusivity, icon-only controls, search, local previews, Google embed rendering, the six routes, mobile widths and offline photo availability. Private Drive files and Google map content are not cached by the app.

Physical iPhone/Safari and actual phone geolocation still require device verification. Some Google iframe responses produce browser reporting-header diagnostics; these originate from Google and do not prevent map display.
