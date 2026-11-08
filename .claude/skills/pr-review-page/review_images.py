"""Find which Chromatic snapshots a pull request changed, and make review images.

Chromatic names every snapshot file after a hash of its pixels
(".../capture-45e8a0bd.png"), so two builds whose files share a name rendered
the story identically. That lets us compare a PR's build with the main build
it branched from without downloading anything.

  compare HEAD.tsv BASE.tsv
      Each file has one "storyId<TAB>unsigned image URL" line per story.
      Prints the stories whose snapshot changed, the ones that are new, and a
      count of the identical ones.

  render NAME BEFORE_URL AFTER_URL OUT_DIR [--box x0,y0,x1,y1]
      Downloads both snapshots, finds the changed pixels, and writes
      NAME-before.png, NAME-after.png and NAME-changes.png (changed pixels
      tinted) into OUT_DIR, cropped to --box or to the changed region, at most
      1200px wide. Prints the size and the changed bands so a tall page can be
      cropped to a better region on a second run.

Run with `python3 -E` from a directory you control. It needs Pillow.
"""

import io
import re
import sys
import urllib.request

HASH = re.compile(r"capture-([0-9a-f]+)\.png")
ALLOWED_HOST = "https://snapshots.chromatic.com/"


def read_tsv(path):
    out = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            story, url = line.split("\t")
            out[story] = url
    return out


def compare(head_path, base_path):
    head, base = read_tsv(head_path), read_tsv(base_path)
    changed, added, same = [], [], 0
    for story, url in head.items():
        if story not in base:
            added.append(story)
            continue
        h, b = HASH.search(url), HASH.search(base[story])
        if h and b and h.group(1) == b.group(1):
            same += 1
        else:
            changed.append(story)
    removed = [s for s in base if s not in head]
    print(f"changed\t{len(changed)}")
    for s in changed:
        print(f"  {s}\t{base[s]}\t{head[s]}")
    print(f"new\t{len(added)}")
    for s in added:
        print(f"  {s}\t{head[s]}")
    print(f"removed\t{len(removed)}")
    for s in removed:
        print(f"  {s}")
    print(f"identical\t{same}")


def fetch(url):
    if not url.startswith(ALLOWED_HOST):
        sys.exit(f"refusing to download from outside {ALLOWED_HOST}: {url}")
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()


def render(name, before_url, after_url, out_dir, box=None):
    from PIL import Image, ImageChops

    a = Image.open(io.BytesIO(fetch(before_url))).convert("RGB")
    b = Image.open(io.BytesIO(fetch(after_url))).convert("RGB")
    print(f"size before {a.size} after {b.size}")
    if a.size != b.size:
        # Layout shifted. Compare on a shared canvas so the crop still works.
        w, h = max(a.width, b.width), max(a.height, b.height)
        ca, cb = Image.new("RGB", (w, h), "white"), Image.new("RGB", (w, h), "white")
        ca.paste(a, (0, 0)); cb.paste(b, (0, 0)); a, b = ca, cb

    # Ignore anti-aliasing noise: a channel has to move by more than 24.
    mask = ImageChops.difference(a, b).convert("L").point(lambda p: 255 if p > 24 else 0)
    bbox = mask.getbbox()
    if bbox is None:
        print("no visible difference")
        return

    rows, bands = [y for y in range(a.height) if mask.crop((0, y, a.width, y + 1)).getbbox()], []
    for y in rows:
        if bands and y - bands[-1][1] < 40:
            bands[-1][1] = y
        else:
            bands.append([y, y])
    print("changed bands (y0-y1: x0-x1):")
    for y0, y1 in bands:
        bx = mask.crop((0, y0, a.width, y1 + 1)).getbbox()
        print(f"  {y0}-{y1}: {bx[0]}-{bx[2]}")

    if box is None:
        pad = 60
        x0, y0, x1, y1 = bbox
        # Keep tall pages readable: stop at the first band that would push past 1400px.
        if y1 - y0 > 1400:
            y1 = next((e for s, e in bands if e - y0 > 1400), y1)
            y1 = min(y1, y0 + 1400)
        box = (max(0, x0 - pad), max(0, y0 - pad), min(a.width, x1 + pad), min(a.height, y1 + pad))
    print(f"crop {box}")

    a, b, mask = a.crop(box), b.crop(box), mask.crop(box)
    tinted = b.copy()
    tinted.paste(Image.new("RGB", b.size, (230, 40, 90)), mask=mask.point(lambda p: 150 if p else 0))
    for img, suffix in ((a, "before"), (b, "after"), (tinted, "changes")):
        if img.width > 1200:
            img = img.resize((1200, round(img.height * 1200 / img.width)), Image.LANCZOS)
        path = f"{out_dir}/{name}-{suffix}.png"
        img.save(path, optimize=True)
        print(f"wrote {path} {img.size}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["compare"] and len(args) == 3:
        compare(args[1], args[2])
    elif args[:1] == ["render"] and len(args) in (5, 7):
        box = None
        if len(args) == 7 and args[5] == "--box":
            box = tuple(int(v) for v in args[6].split(","))
        render(args[1], args[2], args[3], args[4], box)
    else:
        sys.exit(__doc__)
