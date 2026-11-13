# Verification — free maps and fixed favorite collection

The owner chose a free map provider after clarifying that favorite markers must remain permanently visible and the places page must also include a map. The implementation now uses Leaflet with standard OpenStreetMap tiles in their original colors, without an API key or a billing account.

- All four itinerary maps merge their formal stops with the complete nine-place shared vegetarian/café/bar collection. There are no layer toggles; the legend is static.
- The places page includes a map above the result cards. Search, category and visit filters affect the list and other markers; all nine shared favorite markers remain, including when no list results match.
- A scheduled favorite is represented once, retaining its itinerary number and favorite identity. Repeated hotel/airport events do not add duplicate markers, and virtual meals have no pin.
- Daily dashed segments connect only adjacent known stops. They stop at unknown meal blocks and never join Taiwan/Japan flight events.
- Map markers show photo/name/navigation popups and select a visible corresponding card. Card map actions return to and focus the selected marker, including repeated requests. Markers support keyboard activation.
- Initial bounds favor Nagoya city points; the airport remains accessible through its card/marker. Tile attribution stays visible.
- Original image previews, credits, single-select icon category controls and local visit tracking remain in place.

Validation: production build/TypeScript passed. All nine automated checks passed, including fixed favorite membership on all days and filtered/empty places results, deduplication and line boundaries.

Firefox/Playwright checks covered all five map routes at 375, 390, 430 and 1280px without horizontal overflow, the nine permanently present favorite markers, no legend buttons, single-select categories, marker/card navigation, and original-color tiles. Offline reload retained the favorite markers, neutral map state and local content; the app cache contained no external map tiles or private files.

Real map tiles were visually inspected. Later automated interaction/layout checks blocked tile requests to avoid unnecessary tile traffic. Physical iPhone/Safari and actual phone geolocation remain device checks. Dense nearby markers can be separated using zoom; keyboard activation also works.

Snapshots are in ignored `output/playwright/`, including `free-day-map.png`, `free-places-map.png` and `free-places-offline.png`.
