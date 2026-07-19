"""
Visual regression for pagination + counter + navigation strips.

Captures deterministic screenshots of the RTL pagination fixture (mirrors the
markup used in `src/routes/_authenticated/drafts.tsx` and
`attachments-review.tsx`) and compares each region against its baseline PNG.

Usage:
    python tests/visual-rtl/run.py            # compare against baselines (fails on drift)
    python tests/visual-rtl/run.py --update   # (re)generate baselines

Baselines live in `tests/visual-rtl/baselines/`. On failure, the current
capture and a red-highlighted diff are written to `tests/visual-rtl/diffs/`.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

ROOT = Path(__file__).parent
FIXTURE = ROOT / "fixture.html"
BASELINES = ROOT / "baselines"
DIFFS = ROOT / "diffs"

# Element id -> filename stem. Each id in fixture.html is a self-contained card.
TARGETS = {
    "pager-rtl": "pager_rtl",
    "pager-rtl-labeled": "pager_rtl_labeled",
    "pager-ltr": "pager_ltr",
}

# Allow tiny sub-pixel/font rendering wobble (< 0.1% of pixels differ).
DIFF_TOLERANCE = 0.001


async def capture() -> dict[str, Path]:
    out = ROOT / "_capture"
    out.mkdir(exist_ok=True)
    results: dict[str, Path] = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        await page.goto(FIXTURE.resolve().as_uri(), wait_until="networkidle")
        # Give Tailwind CDN a beat to inject styles.
        await page.wait_for_timeout(400)
        for el_id, stem in TARGETS.items():
            path = out / f"{stem}.png"
            await page.locator(f"#{el_id}").screenshot(path=str(path))
            results[el_id] = path
        await browser.close()
    return results


def pixel_diff_ratio(a: Image.Image, b: Image.Image) -> tuple[float, Image.Image]:
    if a.size != b.size:
        # Size mismatch is always a regression.
        w, h = max(a.width, b.width), max(a.height, b.height)
        canvas_a = Image.new("RGB", (w, h), (255, 255, 255))
        canvas_b = Image.new("RGB", (w, h), (255, 255, 255))
        canvas_a.paste(a, (0, 0))
        canvas_b.paste(b, (0, 0))
        a, b = canvas_a, canvas_b
    diff = ImageChops.difference(a.convert("RGB"), b.convert("RGB"))
    bbox = diff.getbbox()
    if not bbox:
        return 0.0, diff
    # Count pixels that differ by any channel.
    changed = sum(1 for px in diff.getdata() if px != (0, 0, 0))  # noqa: keep simple, avoids numpy dep
    ratio = changed / (a.width * a.height)
    return ratio, diff


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--update", action="store_true", help="write baselines from current run")
    args = parser.parse_args()

    BASELINES.mkdir(exist_ok=True)
    DIFFS.mkdir(exist_ok=True)
    for old in DIFFS.glob("*.png"):
        old.unlink()

    captures = asyncio.run(capture())

    if args.update:
        for el_id, path in captures.items():
            dst = BASELINES / f"{TARGETS[el_id]}.png"
            dst.write_bytes(path.read_bytes())
            print(f"baseline written: {dst.relative_to(ROOT)}")
        return 0

    failures: list[str] = []
    for el_id, path in captures.items():
        stem = TARGETS[el_id]
        baseline = BASELINES / f"{stem}.png"
        if not baseline.exists():
            failures.append(f"{stem}: no baseline — run with --update")
            continue
        ratio, diff = pixel_diff_ratio(Image.open(baseline), Image.open(path))
        if ratio > DIFF_TOLERANCE:
            actual_dst = DIFFS / f"{stem}.actual.png"
            baseline_dst = DIFFS / f"{stem}.baseline.png"
            diff_dst = DIFFS / f"{stem}.diff.png"
            side_dst = DIFFS / f"{stem}.side-by-side.png"
            actual_dst.write_bytes(path.read_bytes())
            baseline_dst.write_bytes(baseline.read_bytes())
            diff.save(diff_dst)
            # مركّب أفقي: baseline | actual | diff — يُبسّط المراجعة في artifact CI
            b_img = Image.open(baseline).convert("RGB")
            a_img = Image.open(path).convert("RGB")
            d_img = diff.convert("RGB")
            w = max(b_img.width, a_img.width, d_img.width)
            h = max(b_img.height, a_img.height, d_img.height)
            composite = Image.new("RGB", (w * 3 + 20, h + 24), (245, 245, 245))
            composite.paste(b_img, (0, 24))
            composite.paste(a_img, (w + 10, 24))
            composite.paste(d_img, (w * 2 + 20, 24))
            composite.save(side_dst)
            failures.append(
                f"{stem}: {ratio:.4%} of pixels changed (> {DIFF_TOLERANCE:.2%}); "
                f"see {side_dst.relative_to(ROOT)}"
            )
        else:
            print(f"ok   {stem}  ({ratio:.4%})")


    if failures:
        print("\nVisual regressions detected:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll pagination snapshots match baselines.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
