#!/usr/bin/env python3
"""Cross-check the galaxy collection against NED (NASA/IPAC Extragalactic Database).

Run by hand when reviewing src/data/galaxies.json; the app never calls NED. Uses only the Python standard
library. Writes a dated JSON snapshot that docs/COSMOS_DATA.md explains how to compare with the data:

    python3 scripts/galaxies/ned_crosscheck.py docs/cosmos/ned-crosscheck.json

For each galaxy it records NED's preferred name, J2000 equatorial position and redshift (ObjectLookup), and
the "quick-look" summary of published redshift-independent distances (count, mean, median, min, max in Mpc).
NED says these statistics are original published values, not homogenised, so they are only a cross-check.
"""
import datetime
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request

# key: (name for ObjectLookup, name for the distance summary). "M51" resolves to the galaxy pair in NED,
# so the Whirlpool's own distances are looked up as NGC 5194.
GALAXIES = {
    'lmc': ('LMC', 'LMC'),
    'smc': ('SMC', 'SMC'),
    'm31': ('M31', 'M31'),
    'm33': ('M33', 'M33'),
    'm51': ('M51', 'NGC 5194'),
    'm81': ('M81', 'M81'),
    'm82': ('M82', 'M82'),
    'm87': ('M87', 'M87'),
    'm101': ('M101', 'M101'),
    'm104': ('M104', 'M104'),
    'ngc1300': ('NGC 1300', 'NGC 1300'),
}
LOOKUP_URL = 'https://ned.ipac.caltech.edu/srs/ObjectLookup'
DISTANCE_URL = 'https://ned.ipac.caltech.edu/cgi-bin/nDistance?name='
HEADERS = {'User-Agent': 'CosmosQuest-data-review (manual cross-check)'}


def fetch(url, data=None):
    request = urllib.request.Request(url, data=data, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read().decode('utf-8', errors='replace')


def lookup(name):
    body = urllib.parse.urlencode({'json': json.dumps({'name': {'v': name}})}).encode()
    result = json.loads(fetch(LOOKUP_URL, body))
    preferred = result['Preferred']
    return {
        'preferredName': preferred['Name'],
        'objectType': preferred['ObjType']['Value'],
        'ra': preferred['Position']['RA'],
        'dec': preferred['Position']['Dec'],
        'redshift': preferred.get('Redshift', {}).get('Value'),
        'lookupVersion': result.get('Version'),
    }


def distance_summary(name):
    text = re.sub(r'<[^>]+>', '\n', fetch(DISTANCE_URL + urllib.parse.quote(name)))
    lines = [html.unescape(line).strip() for line in text.split('\n')]
    lines = [line for line in lines if line]
    count = next(int(line.split()[0]) for line in lines if 'Distances found in NED' in line)
    stats = {}
    for label, key in [('Mean', 'mean'), ('Std. Dev.', 'stdDev'), ('Min.', 'min'), ('Max.', 'max'), ('Median', 'median')]:
        i = lines.index(label)
        stats[key] = float(lines[i + 2])  # the line after the distance modulus is the metric distance in Mpc
    return {'distanceName': name, 'count': count, **stats}


def main(out_path):
    snapshot = {'retrieved': datetime.date.today().isoformat(), 'unit': 'Mpc',
                'note': 'NED quick-look statistics of published distances: original values, no homogenisation. Cross-check only.',
                'galaxies': {}}
    for key, (lookup_name, distance_name) in GALAXIES.items():
        snapshot['galaxies'][key] = {'lookupName': lookup_name, **lookup(lookup_name), **distance_summary(distance_name)}
        print(key, snapshot['galaxies'][key]['preferredName'], snapshot['galaxies'][key]['median'], 'Mpc', file=sys.stderr)
        time.sleep(1)  # be gentle with a shared public service
    with open(out_path, 'w', encoding='utf-8') as file:
        json.dump(snapshot, file, indent=2, ensure_ascii=False)
        file.write('\n')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'docs/cosmos/ned-crosscheck.json')
