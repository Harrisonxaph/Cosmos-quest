#!/usr/bin/env python3
"""Print the docs/ASSET_CREDITS.md table rows for every bundled galaxy image (status "ready").

    python3 scripts/galaxies/asset_credit_rows.py

Paste the output over the rows in "Galaxy images (Cosmos collection)". The permission column names the page
that states each image's terms; re-read those pages before an update (see docs/COSMOS_DATA.md).
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def permission(galaxy):
    review = galaxy['image']['permission']
    if review['status'] != 'verified':
        raise ValueError(f"{galaxy['id']}: image permissions need review")
    links = f"[Usage terms]({review['policyUrl']})"
    if review.get('licenceUrl'):
        links += f"; [CC BY 4.0]({review['licenceUrl']})"
    return links


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
            print(f"| `public/{file['file']}` | {image['credit']} | {source} | {permission(galaxy)} | {image['credit']} | {changes} | {image['permission']['reviewed']} |")


if __name__ == '__main__':
    main()
