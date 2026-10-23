#!/usr/bin/env python3
"""Print the docs/ASSET_CREDITS.md table rows for every bundled galaxy image (status "ready").

    python3 scripts/galaxies/asset_credit_rows.py

Paste the output over the rows in "Galaxy images (Cosmos collection)". The permission column names the page
that states each image's terms; re-read those pages before an update (see docs/COSMOS_DATA.md).
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PERMISSION = {
    'svs': 'https://svs.gsfc.nasa.gov/help/ ("All of our content is in the public domain (unless otherwise noted)")',
    'hubble': 'https://science.nasa.gov/mission/hubble/overview/at-the-museum/frequently-asked-questions/ ("NASA and Hubble images are generally in the public domain"); NASA media guidelines (not reachable from the build environment, see below)',
    'esa': 'https://esahubble.org/copyright/ (CC BY 4.0, credit "clearly and visibly")',
    'jpl': 'NASA Image and Video Library metadata for PIA10748 (credit NASA/JPL-Caltech); JPL image use policy not reachable from the build environment, see below',
}


def permission(galaxy):
    image = galaxy['image']
    if 'svs.gsfc.nasa.gov' in image['original']['url']:
        return PERMISSION['svs']
    if image['licence'] == 'cc-by-4.0':
        return PERMISSION['esa']
    if image['kind'] == 'artist-concept':
        return PERMISSION['jpl']
    return PERMISSION['hubble']


def main():
    galaxies = json.load(open(os.path.join(ROOT, 'src', 'data', 'galaxies.json'), encoding='utf-8'))
    for galaxy in galaxies:
        image = galaxy['image']
        if image['status'] != 'ready':
            continue
        original = image['original']
        for key in ('detail', 'thumbnail'):
            file = image[key]
            label = original.get('nasaId') or 'original'
            source = f"[{label}]({original['url']}) via [{original['sourcePage']}]({original['sourcePage']})"
            changes = (f"Resized from {original['width']}×{original['height']} to {file['width']}×{file['height']} "
                       '(aspect ratio kept), converted to WebP')
            print(f"| `public/{file['file']}` | {image['credit']} | {source} | {permission(galaxy)} | {image['credit']} | {changes} | {image['retrieved']} |")


if __name__ == '__main__':
    main()
