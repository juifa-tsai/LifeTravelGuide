"""Keep visit identities separate from Excel row order, without editing the workbook."""
from collections import defaultdict
import json
import uuid


def assign_stop_ids(stops, previous, overrides=None):
    previous = [dict(stop, stopId=stop.get('stopId', f"{stop['date']}-{stop['sequence']}")) for stop in previous]
    old_ids = {stop['stopId'] for stop in previous}
    if len(old_ids) != len(previous):
        raise ValueError('Previous itinerary has duplicate stopId values')
    assigned, used = {}, set()
    forced_new = set()
    for key, value in (overrides or {}).items():
        matches = [i for i, stop in enumerate(stops) if f"{stop['date']}/{stop['sequence']}" == key]
        if len(matches) != 1:
            raise ValueError(f'Unknown identity override: {key}')
        i = matches[0]
        if value is None:
            forced_new.add(i)
            continue
        old = next((stop for stop in previous if stop['stopId'] == value), None)
        if not old or old['placeId'] != stops[i]['placeId'] or value in used:
            raise ValueError(f'Invalid or reused identity override: {key}')
        assigned[i] = value
        used.add(value)

    # Exact content first, then progressively narrower unambiguous identities.
    # Arrival, duration and order are deliberately absent from the latter keys.
    fields = sorted({key for stop in stops for key in stop} - {'sequence', 'stopId'})
    for keys in [fields, ['date', 'placeId', 'title', 'category', 'summary'],
                 ['date', 'placeId', 'title', 'category'], ['date', 'placeId'], ['placeId']]:
        old_groups, new_groups = defaultdict(list), defaultdict(list)
        def signature(stop):
            return json.dumps([stop.get(key) for key in keys], ensure_ascii=False, sort_keys=True)
        for old in previous:
            if old['stopId'] not in used:
                old_groups[signature(old)].append(old)
        for i, stop in enumerate(stops):
            if i not in assigned and i not in forced_new:
                new_groups[signature(stop)].append(i)
        for key, indices in new_groups.items():
            candidates = old_groups.get(key, [])
            if len(indices) == len(candidates) == 1:
                assigned[indices[0]] = candidates[0]['stopId']
                used.add(candidates[0]['stopId'])

    for i, stop in enumerate(stops):
        if i in assigned:
            stop['stopId'] = assigned[i]
            continue
        candidates = [old for old in previous if old['stopId'] not in used and old['placeId'] == stop['placeId']]
        if candidates and i not in forced_new:
            key = f"{stop['date']}/{stop['sequence']}"
            raise ValueError(f'Ambiguous visit identity: {key} ({stop["placeId"]}). '
                             'Use --identity-map with {"date/sequence":"existing stopId"} or null for a new visit.')
        # Deterministic new IDs make dry runs and repeated imports reproducible.
        seed = json.dumps({k:v for k,v in stop.items() if k not in ('stopId', 'sequence')}, sort_keys=True, ensure_ascii=False)
        attempt = 0
        while True:
            identity = 'stop-' + uuid.uuid5(uuid.NAMESPACE_URL, f'LifeTravelGuide:{seed}:{attempt}').hex
            if identity not in old_ids and identity not in used:
                break
            attempt += 1
        stop['stopId'] = identity
        used.add(identity)
    return stops
