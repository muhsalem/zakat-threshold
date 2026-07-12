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


async def assert_numbered(page):
    """shadcn <Pagination> pattern: numbered links + prev/next with mirrored chevrons."""
    pager = page.locator('[data-testid="numbered-pager"]')
    prev = page.locator('[data-testid="num-prev"]')
    nxt = page.locator('[data-testid="num-next"]')

    # RTL: prev button (السابق) must render visually to the right of page 1 link
    prev_box = await prev.bounding_box()
    p1_box = await page.locator('a[data-page="1"]').bounding_box()
    p_last_box = await page.locator('a[data-page="5"]').bounding_box()
    nxt_box = await nxt.bounding_box()
    assert prev_box["x"] > p1_box["x"] > p_last_box["x"] > nxt_box["x"], \
        f"numbered: RTL order broken (prev={prev_box['x']}, p1={p1_box['x']}, " \
        f"p_last={p_last_box['x']}, next={nxt_box['x']})"

    # initial state: page 1, prev disabled
    assert await prev.get_attribute("disabled") is not None
    assert await page.locator('a[data-page="1"]').get_attribute("aria-current") == "page"

    # click page 3 → aria-current moves, next still enabled
    await page.locator('a[data-page="3"]').click()
    assert await page.locator('a[data-page="3"]').get_attribute("aria-current") == "page"
    assert await prev.get_attribute("disabled") is None

    # click next → page 4
    await nxt.click()
    assert await page.locator('a[data-page="4"]').get_attribute("aria-current") == "page"

    # jump to last → next disabled
    await page.locator('a[data-page="5"]').click()
    assert await nxt.get_attribute("disabled") is not None

    # no overflow at current viewport
    ovf = await pager.evaluate("el => el.scrollWidth - el.clientWidth")
    assert ovf <= 1, f"numbered: pager overflows horizontally by {ovf}px"


async def run() -> int:
    import os
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        print(f"Unknown PW_BROWSER={browser_name}; falling back to chromium.")
        browser_name = "chromium"
    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}")
        for name, (w, h) in VIEWPORTS.items():
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            await page.goto(FIXTURE.resolve().as_uri(), wait_until="domcontentloaded")
            await page.locator('[data-testid="records-counter"]').wait_for(state="visible", timeout=15000)
            await page.wait_for_timeout(200)

            for prefix, total, has_range in (
                ("records", RECORDS_TOTAL, False),
                ("attachments", ATTACHMENTS_TOTAL, True),
            ):
                try:
                    await assert_pager(page, prefix, total, has_range)
                    print(f"ok   {browser_name:<8} {name:<7} {prefix}")
                except AssertionError as e:
                    failures.append(f"{browser_name}/{name}/{prefix}: {e}")
                    await page.screenshot(path=str(CAPTURE / f"fail_{browser_name}_{name}_{prefix}.png"))
            try:
                await assert_numbered(page)
                print(f"ok   {browser_name:<8} {name:<7} numbered")
            except AssertionError as e:
                failures.append(f"{browser_name}/{name}/numbered: {e}")
                await page.screenshot(path=str(CAPTURE / f"fail_{browser_name}_{name}_numbered.png"))
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
