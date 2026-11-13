# Implementation verification — 2026-11-13

Production build verified locally with Firefox through the Playwright CLI. GitHub Pages has not been published by this implementation session.

- `npm run build`: data validation, TypeScript compilation, Vite build and PWA precache generation passed.
- `npm test`: all four regression checks passed, covering the data contract, invalid references/coordinates, fixed bookings and flexible meals, and sensitive content/image attribution.
- Excel conversion: changed a castle arrival time in a temporary workbook; the importer produced the new time without changing the original workbook or production JSON.
- All six hash routes opened directly and rendered the correct content, online and after a full offline reload.
- No horizontal overflow across all six routes at 390px; itinerary also checked at 375px, 430px and 1280px.
- Independent map layer toggles preserved other candidate categories and the day's formal pins.
- Map marker click selected and scrolled to the correct card; the card's map action returned to the selected marker.
- Itinerary and transit detail panels expanded correctly.
- Place search, visit checkbox persistence through reload and visited filtering passed.
- A simulated denied geolocation request displayed its fallback; exactly one request was made.
- Offline banner, neutral map fallback and disabled external document links passed. The service-worker cache contained no Drive documents or map tiles.
- Reconnection restored the online state. A newly built service worker displayed its update prompt and applied the update.
- Replacement OpenStreetMap tiles loaded with grayscale styling and visible attribution. CARTO's suggested endpoint returned API-key-required images, so it was replaced.
- No application errors were observed. Firefox reported two Leaflet mouse-event deprecation warnings during marker interaction.

Screenshots are in ignored `output/playwright/`: `day-17-mobile.png`, `day-17-desktop.png`, and `documents-offline-mobile.png`.

Remaining verification outside this local session: physical iPhone/Safari, actual location acquisition on a phone, private Drive permissions under the owner's Google account, and the eventual GitHub Pages deployment. Licensed photos are not supplied; intentional category placeholders are used. Meal suitability, variable opening hours and actual transit departures still require the workbook's stated trip-time checks.
