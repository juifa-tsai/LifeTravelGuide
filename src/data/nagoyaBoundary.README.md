# Nagoya city boundary

`nagoyaBoundary.json` combines the 16 Nagoya ward geometries (codes 23101–23116)
from the Ministry of Land, Infrastructure, Transport and Tourism's **国土数値情報
行政区域データ (N03), 2020-01-01**. Source attribution: 国土交通省「国土数値情報
（行政区域データ）」を加工して作成。

- Original dataset and use conditions: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v2_4.html
- Distribution terms: https://nlftp.mlit.go.jp/ksj/other/usage.html
- GeoJSON conversion/mirror: https://github.com/niiyz/JapanCityGeoJson
- Downloaded files: `geojson/23/23101.json` through `geojson/23/23116.json` in that repository, checked 2026-11-13.

Only geometry is retained. Coordinates are rounded to five decimal places;
Douglas–Peucker simplification uses tolerance 0.00005 degrees (roughly 5 m).
Ward polygons and holes remain separate in a MultiPolygon. This is used only
for a local point-in-polygon eligibility check, not to invent place coordinates
or to render a new map layer. Geolocation is never sent out for this check.
