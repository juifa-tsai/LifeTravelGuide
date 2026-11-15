# Offline Japan eligibility outline

`japanBoundary.json` retains only the Japan (`ADM0_A3 = JPN`) geometry from
Natural Earth's **1:10m Admin 0 Countries**. It contains 109 polygons / 6,952
vertices, with longitude/latitude rounded to five decimals. All rings and
islands in that feature are retained. No place or user coordinates are derived
from this outline.

- Original dataset: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/
- License: public domain, https://www.naturalearthdata.com/about/terms-of-use/
- Pinned GeoJSON distribution: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_10m_admin_0_countries.geojson
- Checked: 2026-11-15.
- Full source SHA-256: `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`.
- Local rounded geometry SHA-256: `d8e05891b2c68401d261802de66dbb4594a93dc86ad301edd07c827708f6a820`.

To reproduce, read the pinned FeatureCollection, select its feature with
`properties.ADM0_A3 == 'JPN'`, retain `geometry`, round every coordinate to five
decimals, serialize using Python `json.dumps(geometry, separators=(',', ':'))`
and append one newline.

`src/lib/japan.ts` uses point-in-polygon and a 3 km coastal tolerance for the
outline's scale, GPS precision and reclaimed airport land. This is an
approximate local availability check, not a legal border or a navigation map.
It includes Centrair, Haneda and the tested southern islands, and excludes
Taiwan, Korea, China and nearby Russian mainland points. No IP lookup, reverse
geocoding, external request or API key is needed for this check.
