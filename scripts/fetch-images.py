#!/usr/bin/env python3
"""Restore Commons previews and retain the separately captured place-photo credits."""
import io
import json
from pathlib import Path
import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
assets = json.loads((ROOT / 'scripts/media-assets.json').read_text())
credits = []
for key, asset in assets.items():
    destination = ROOT / 'public' / asset['path']
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        response = requests.get(asset['downloadUrl'], headers={
            'User-Agent': 'LifeTravelGuide/1.0 (+https://github.com/juifa-tsai/LifeTravelGuide)'
        }, timeout=45)
        response.raise_for_status()
        photo = ImageOps.exif_transpose(Image.open(io.BytesIO(response.content))).convert('RGB')
        photo.thumbnail((960, 720))
        photo.save(destination, 'WEBP', quality=80)
    credits.append({**asset, 'transformation':'Resized to at most 960 × 720 and converted to WebP; displayed cropped using CSS.'})
    print(key, destination.stat().st_size)
for photo in json.loads((ROOT / 'scripts/storefront-photos.json').read_text()):
    if not (ROOT / 'public' / photo['path']).exists():
        raise SystemExit(f"Missing captured photo {photo['placeId']}: restore it with scripts/capture-place-photo.mjs; do not substitute a generic photo.")
    credits.append({**photo, 'transformation':'Playwright screenshot; resized to at most 960 × 720; converted to WebP. Original photograph content unchanged. Thumbnail may crop using CSS.'})
(ROOT / 'public/images/credits.json').write_text(json.dumps(credits, ensure_ascii=False, indent=2)+'\n')
