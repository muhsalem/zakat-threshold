"""
Behavioral RTL pagination tests against a data-driven fixture.

Loads `fixture-data.html`, which renders 43 fake records + 27 fake attachments
with working prev/next buttons, per-page selects, counters (e.g. "2 / 5"),
and RTL-aware arrow keys. Runs the full assertion suite across mobile,
tablet, and desktop viewports.

Run:
    python tests/visual-rtl/run-data.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).parent
FIXTURE = ROOT / "fixture-data.html"
CAPTURE = ROOT / "_capture"
CAPTURE.mkdir(exist_ok=True)

VIEWPORTS = {
    "mobile":  (390, 900),
    "tablet":  (768, 1000),
    "desktop": (1338, 900),
}

RECORDS_TOTAL = 43        # matches fixture-data.html
ATTACHMENTS_TOTAL = 27


async def assert_pager(page, prefix: str, total: int, has_range: bool):
    """Drive prev/next/select/keyboard and assert counters + button state."""
    pager = page.locator(f'[data-testid="{prefix}-pager"]')
    counter = page.locator(f'[data-testid="{prefix}-counter"]')
    prev = page.locator(f"#{prefix}-prev")
    nxt = page.locator(f"#{prefix}-next")
    per_page = page.locator(f"#{prefix}-per-page")

    # initial state: page 1 of ceil(total/10)
    expected_pages = -(-total // 10)  # ceil
    assert (await counter.inner_text()).strip() == f"1 / {expected_pages}", \
        f"{prefix}: initial counter wrong"
    assert await prev.is_disabled(), f"{prefix}: prev should be disabled on page 1"
    assert not await nxt.is_disabled(), f"{prefix}: next should be enabled on page 1"

    # counter is LTR even inside RTL card
    counter_dir = await counter.evaluate("el => getComputedStyle(el).direction")
    assert counter_dir == "ltr", f"{prefix}: counter must render LTR, got {counter_dir}"

    # click Next → page 2
    await nxt.click()
    assert (await counter.inner_text()).strip() == f"2 / {expected_pages}"
    assert not await prev.is_disabled()

    # in RTL: prev button visually to the right of next button
    is_rtl = await pager.evaluate(
        "el => (el.closest('[dir]')?.getAttribute('dir') ?? 'ltr') === 'rtl'"
    )
    prev_box = await prev.bounding_box()
    next_box = await nxt.bounding_box()
    if is_rtl:
        assert prev_box["x"] > next_box["x"], \
            f"{prefix}: in RTL, previous button must be visually to the right of next"

    # ArrowLeft in RTL should advance forward (page 3)
    await pager.focus()
    await page.keyboard.press("ArrowLeft" if is_rtl else "ArrowRight")
    assert (await counter.inner_text()).strip() == f"3 / {expected_pages}", \
        f"{prefix}: arrow key did not advance in reading direction"

    # ArrowRight in RTL should go back (page 2)
    await page.keyboard.press("ArrowRight" if is_rtl else "ArrowLeft")
    assert (await counter.inner_text()).strip() == f"2 / {expected_pages}"

    # End → last page, next disabled
    await page.keyboard.press("End")
    assert (await counter.inner_text()).strip() == f"{expected_pages} / {expected_pages}"
    assert await nxt.is_disabled()

    # Home → first page
    await page.keyboard.press("Home")
    assert (await counter.inner_text()).strip() == f"1 / {expected_pages}"

    # per-page change: 20 → new page count, resets to 1
    await per_page.select_option("20")
    new_expected = -(-total // 20)
    assert (await counter.inner_text()).strip() == f"1 / {new_expected}", \
        f"{prefix}: per-page change did not recompute counter"

    # No horizontal overflow on the pager itself at this viewport
    ovf = await pager.evaluate("el => el.scrollWidth - el.clientWidth")
    assert ovf <= 1, f"{prefix}: pager overflows horizontally by {ovf}px"

    # attachments has a range label — sanity check its format
    if has_range:
        rng = await page.locator(f'[data-testid="{prefix}-range"]').inner_text()
        assert "من" in rng and "27" in rng, f"{prefix}: range label malformed: {rng!r}"


async def run() -> int:
    failures: list[str] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, (w, h) in VIEWPORTS.items():
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            await page.goto(FIXTURE.resolve().as_uri(), wait_until="networkidle")
            await page.wait_for_timeout(200)
            for prefix, total, has_range in (
                ("records", RECORDS_TOTAL, False),
                ("attachments", ATTACHMENTS_TOTAL, True),
            ):
                try:
                    await assert_pager(page, prefix, total, has_range)
                    print(f"ok   {name:<7} {prefix}")
                except AssertionError as e:
                    failures.append(f"{name}/{prefix}: {e}")
                    await page.screenshot(path=str(CAPTURE / f"fail_{name}_{prefix}.png"))
            await context.close()
        await browser.close()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll data-driven pagination assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
