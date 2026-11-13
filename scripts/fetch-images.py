#!/usr/bin/env python3
"""Restore credited Commons preview images; exports optimized, uncropped WebP files."""
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
(ROOT / 'public/images/credits.json').write_text(json.dumps(credits, ensure_ascii=False, indent=2)+'\n')
