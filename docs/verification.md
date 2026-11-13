# Verification — lodging shortcut, light-gray maps and simpler places page

Both itinerary and places maps use the free OpenStreetMap provider with a light-gray filter applied only to base tiles. Markers, route lines, photos and attribution keep their original styling.

- The lodging location remains on every daily map and the places map, including filtered and empty result lists. The existing hotel coordinates are reused; no new coordinates are inferred.
- A blue bed marker identifies lodging. On an itinerary map it also retains the station number, without duplicating the hotel marker.
- The **回到住宿** button below each map recenters and zooms to the hotel. It works repeatedly after manual panning, does not scroll to an itinerary card, and does not call geolocation.
- The nine shared vegetarian/café/bar favorite markers remain fixed, without visibility toggles.
- The places search field, visited-count/progress panel and result-count display are removed. Icon-only single-select categories, visit state filters and per-place visit checkboxes remain.
- Existing preview photos, credits, itinerary facts and static offline data are retained. The app does not cache external map tiles or private document contents.

Validation: production build and TypeScript passed; all ten automated checks passed. The new regression check covers exactly one lodging marker on all days, category-filtered/empty lists, and omission when coordinates are missing.

Firefox/Playwright verification at 390px confirmed lodging focus on both map pages, repeated focus after panning, lodging visibility with empty visited/category results, gray base tiles, removal of search/statistics, and zero geolocation calls from the lodging shortcut. The places page also fit 375, 390, 430 and 1280px without horizontal overflow.

Screenshots are in ignored `output/playwright/lodging-day-gray.png` and `lodging-places-gray.png`. Physical iPhone/Safari remains a device check.
