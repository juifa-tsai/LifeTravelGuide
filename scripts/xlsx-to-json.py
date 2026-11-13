#!/usr/bin/env python3
"""Export only allowlisted travel fields. Never copy reservation files or metadata."""
import argparse
import datetime
import json
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('workbook', nargs='?', type=Path, default=ROOT / 'docs/名古屋四日行程_20261115-1118.xlsx')
parser.add_argument('--out', type=Path, default=ROOT / 'public/data')
args = parser.parse_args()
workbook = openpyxl.load_workbook(args.workbook, data_only=True)

def rows(name):
    return [list(row) for row in list(workbook[name].values)[4:] if row[0] is not None]

def number(value):
    return None if value is None or value == '' else float(value) if '.' in str(value) else int(value)

def date(value):
    return value.strftime('%Y-%m-%d') if isinstance(value, (datetime.datetime, datetime.date)) else str(value)

def time(value):
    return value.strftime('%H:%M') if isinstance(value, (datetime.datetime, datetime.time)) else str(value)

geo_path = ROOT / 'scripts/geocodes.json'
geocodes = json.loads(geo_path.read_text()) if geo_path.exists() else {}
media_path = ROOT / 'scripts/media.json'
media = json.loads(media_path.read_text()) if media_path.exists() else {}
places = []
for r in rows('02_踩點清單'):
    virtual = r[0] in ('late_dinner', 'meal_tbd_16', 'meal_tbd_17')
    geo = geocodes.get(r[0], {})
    photo = media.get(r[0], {})
    image_url = r[13] or photo.get('imageUrl')
    if r[13] and r[13] != photo.get('imageUrl'):
        photo = {}  # A new workbook image needs its own matching attribution.
    lat, lng = number(r[14]), number(r[15])
    if lat is None and lng is None and geo:
        lat, lng = geo['lat'], geo['lng']
    places.append(dict(id=r[0], category=r[1], nameZh=r[2], nameJa=r[3], address=r[4],
        hoursText=r[5], closedText=r[6], priority=r[7], dietText=r[9], summary=r[10],
        mapsUrl=r[11], website=r[12], imageUrl=image_url, imageAttribution=photo.get('imageAttribution'),
        imageSourceUrl=photo.get('imageSourceUrl'), imageLicenseUrl=photo.get('imageLicenseUrl'),
        imageKind=photo.get('imageKind'), imageAlt=photo.get('imageAlt'),
        lat=None if virtual else lat, lng=None if virtual else lng, virtual=virtual,
        verification=r[16], sourceUrl=r[17], coordinateSource=geo.get('source'),
        coordinateLabel=geo.get('label'), coordinateAddress=geo.get('address')))
itinerary = [dict(date=date(r[0]), sequence=number(r[1]), arrivalTime=time(r[2]),
    stayMinutes=number(r[3]), placeId=r[4], title=r[5], category=r[6],
    displayStatus=r[7], summary=r[8], note=r[9], mapsUrl=r[10], sourceUrl=r[11],
    timezone='Asia/Taipei' if r[4]=='tpe' else 'Asia/Tokyo') for r in rows('01_每日行程')]
# Supplemental restaurants fill gaps only; workbook places always win by stable ID.
# Arrival dinner notes intentionally overlay only summary/note, never bookings/times.
supplement = json.loads((ROOT / 'scripts/dinner-supplement.json').read_text())
place_ids = {place['id'] for place in places}
for place in supplement['places']:
    if place['id'] not in place_ids:
        places.append(place)
        place_ids.add(place['id'])
for extra in supplement['itinerary']:
    for stop in itinerary:
        if (stop['date'], stop['placeId']) == (extra['date'], extra['placeId']):
            for field in ('summary', 'note'):
                if field in extra:
                    stop[field] = extra[field]

legs = [dict(date=date(r[0]), fromPlaceId=r[1], toPlaceId=r[2], mode=r[3],
    summary=r[4], details=r[5], minutesEstimate=number(r[6]), fareJpyEstimate=number(r[7]),
    certainty=r[8], sourceUrl=r[9]) for r in rows('03_交通銜接')]
documents = [dict(id=f'document-{i+1}', category=r[0], title=r[1], url=r[2],
    access=r[3], dates=r[4], description=r[5]) for i,r in enumerate(rows('04_重要文件')) if r[2]]
themes = [('2026-11-15','日','抵達名古屋','從桃園出發，把步調留給夜晚。','ARRIVAL'),
    ('2026-11-16','一','古蹟與老件','走進城郭，尋找時間留下的物件。','OLD & NEW'),
    ('2026-11-17','二','藝術與大須','一杯咖啡、一場展覽，慢慢走進大須。','ART & STREETS'),
    ('2026-11-18','三','帶著回憶回家','吃好早餐，為回程留一點從容。','HOMEBOUND')]
trip = dict(title='名古屋 · 旅の手帖', startDate='2026-11-15', endDate='2026-11-18',
    timezone='Asia/Tokyo', updatedAt='2026-11-13',
    days=[dict(date=d,weekday=w,title=t,description=s,label=l,number=i+1) for i,(d,w,t,s,l) in enumerate(themes)],
    overview=[dict(title=r[0],value=r[1],note=r[2]) for r in rows('00_旅程總覽')
              if r[0] in ('住宿','去程','接機','回程','交通','飲食')])
args.out.mkdir(parents=True, exist_ok=True)
for name,data in dict(trip=trip,places=places,itinerary=itinerary,legs=legs,documents=documents).items():
    (args.out / f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
# Development-only report: never included in public/ or the Pages artifact.
report = ROOT / 'output/data-report.md'
report.parent.mkdir(exist_ok=True)
issues = ['# 資料檢查報告（不上線）', '', '## Excel 待確認事項', '']
issues += [f'- {r[0]}：{r[2]}（{r[4]}）' for r in rows('05_待確認')]
issues += ['', '## 缺漏資料', '']
for p in places:
    if p['virtual']: continue
    if p['lat'] is None: issues.append(f"- {p['id']}：座標待核對；地圖不放標記。")
    if not p['imageUrl']: issues.append(f"- {p['id']}：無授權照片；使用圖示佔位。")
report.write_text('\n'.join(issues)+'\n')
print(f'Exported {len(places)} places, {len(itinerary)} stops, {len(legs)} legs, {len(documents)} documents.')
print('Next: npm run validate:data. Development gaps: output/data-report.md')
