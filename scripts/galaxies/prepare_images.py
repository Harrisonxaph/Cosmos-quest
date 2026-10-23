#!/usr/bin/env python3
"""Make the bundled galaxy images from the originals listed in src/data/galaxies.json.

Run by hand after choosing or replacing an image (see docs/COSMOS_DATA.md). Needs Python 3 and Pillow.
The app never downloads images itself; it only uses the files this script writes to public/assets/galaxies/.

    python3 scripts/galaxies/prepare_images.py --cache /path/to/originals [--download] [--only andromeda]

For each galaxy it reads image.original.url, uses <cache>/<id>.orig (downloading it first with --download),
checks the original's size against image.original.width/height, and writes two WebP files that keep the
original aspect ratio: a thumbnail that fits in 400 x 300 px and a detail image that fits in 1600 x 1200 px.
The resulting pixel sizes, and status "ready", are written back into galaxies.json, so the tests can check them.
Galaxies whose original can't be fetched keep status "pending" and are listed at the end.
"""
import argparse
import json
import os
import sys
import urllib.request

from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # the originals are trusted NASA files, some over 150 megapixels
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'src', 'data', 'galaxies.json')
PUBLIC = os.path.join(ROOT, 'public')
SIZES = {'thumbnail': (400, 300, 78), 'detail': (1600, 1200, 82)}  # box width, box height, WebP quality


def fit(size, box):
    """Largest size inside box with the same aspect ratio, never enlarging."""
    width, height = size
    scale = min(box[0] / width, box[1] / height, 1)
    return max(1, round(width * scale)), max(1, round(height * scale))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--cache', required=True, help='folder holding <id>.orig files')
    parser.add_argument('--download', action='store_true', help='download missing originals first')
    parser.add_argument('--only', action='append', help='galaxy id to process (repeatable)')
    args = parser.parse_args()

    galaxies = json.load(open(DATA, encoding='utf-8'))
    os.makedirs(args.cache, exist_ok=True)
    failed = []
    for galaxy in galaxies:
        if args.only and galaxy['id'] not in args.only:
            continue
        image = galaxy['image']
        if image.get('permission', {}).get('status') != 'verified':
            sys.exit(f"{galaxy['id']}: review the source caption and usage terms before preparing files")
        original = os.path.join(args.cache, f"{galaxy['id']}.orig")
        if not os.path.exists(original):
            if not args.download:
                print(f"{galaxy['id']}: missing {original} (use --download)", file=sys.stderr)
                failed.append(galaxy['id'])
                continue
            try:
                request = urllib.request.Request(image['original']['url'], headers={'User-Agent': 'CosmosQuest-image-prep'})
                with urllib.request.urlopen(request, timeout=600) as response:
                    content = response.read()
            except OSError as error:
                print(f"{galaxy['id']}: could not download {image['original']['url']}: {error}", file=sys.stderr)
                failed.append(galaxy['id'])
                continue
            with open(original, 'wb') as file:
                file.write(content)
        with Image.open(original) as source:
            expected = (image['original']['width'], image['original']['height'])
            if source.size != expected:
                sys.exit(f"{galaxy['id']}: original is {source.size}, galaxies.json says {expected}")
            source = source.convert('RGB')
            for key, (box_w, box_h, quality) in SIZES.items():
                width, height = fit(source.size, (box_w, box_h))
                path = os.path.join(PUBLIC, image[key]['file'])
                os.makedirs(os.path.dirname(path), exist_ok=True)
                source.resize((width, height), Image.LANCZOS).save(path, 'WEBP', quality=quality, method=6)
                image[key]['width'], image[key]['height'] = width, height
                print(f"{galaxy['id']}: {key} {width}x{height} {os.path.getsize(path) // 1024} KB")
            image['status'] = 'ready'
    with open(DATA, 'w', encoding='utf-8') as file:
        json.dump(galaxies, file, indent=2, ensure_ascii=False)
        file.write('\n')
    if failed:
        sys.exit(f"Not processed: {', '.join(failed)}")


if __name__ == '__main__':
    main()
