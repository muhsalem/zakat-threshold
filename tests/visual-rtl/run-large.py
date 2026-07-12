"""
Large-dataset RTL pagination tests: 120 records + 80 attachments.

Loads the fixture with `?records=120&attachments=80` and verifies pagination
math holds across:
  - every RTL viewport (mobile / tablet / desktop)
  - every per-page option in the select (10 / 20 / 50 for records;
    10 / 20 for attachments)

For each combination it asserts:
  - counter shows `1 / ceil(total / perPage)`
  - prev disabled on first page, next enabled
  - navigating to the last page shows `total_pages / total_pages`,
    next becomes disabled
  - the last page renders exactly `total - (total_pages - 1) * perPage` rows
    (handles the ragged tail: 120/50 → 20 rows on the last page)
  - `<tbody>` row count on the first page equals perPage (full page)
  - attachments range label is `عرض start–end من total` with correct math
  - the pager's own <nav> stays inside its section (no horizontal overflow
    on the smallest viewport, even with big page counts)

Browser via PW_BROWSER = chromium (default) | firefox | webkit.

Run:
    python tests/visual-rtl/run-large.py
"""

from __future__ import annotations

import asyncio
import functools
import http.server
import math
import os
import socketserver
import sys
import threading
from pathlib import Path

from playwright.async_api import Page, async_playwright

ROOT = Path(__file__).parent
CAPTURE = ROOT / "_capture"
CAPTURE.mkdir(exist_ok=True)

VIEWPORTS = {
    "mobile":  (390, 900),
    "tablet":  (768, 1000),
    "desktop": (1338, 900),
}

RECORDS_TOTAL = 120
ATTACHMENTS_TOTAL = 80

# perPage options exposed by each pager's <select>
RECORDS_PERPAGE = [10, 20, 50]
ATTACHMENTS_PERPAGE = [10, 20]


async def rows_in_body(page: Page, prefix: str) -> int:
    return await page.locator(f"#{prefix}-body > tr").count()


async def assert_perpage(
    page: Page,
    prefix: str,
    total: int,
    per_page: int,
    viewport: str,
    has_range: bool,
) -> None:
    select = page.locator(f"#{prefix}-per-page")
    counter = page.locator(f'[data-testid="{prefix}-counter"]')
    prev = page.locator(f"#{prefix}-prev")
    next_ = page.locator(f"#{prefix}-next")

    await select.select_option(str(per_page))
    # select change resets state.page to 1 and re-renders
    total_pages = math.ceil(total / per_page)

    # counter reset to page 1
    txt = (await counter.inner_text()).strip()
    assert txt == f"1 / {total_pages}", \
        f"[{prefix} perPage={per_page}] counter {txt!r} != 1 / {total_pages}"

    # first page is full
    n = await rows_in_body(page, prefix)
    assert n == per_page, \
        f"[{prefix} perPage={per_page}] page 1 rendered {n} rows, expected {per_page}"

    # prev disabled, next enabled (total > per_page → more than one page)
    assert (await prev.evaluate("el => el.disabled")), \
        f"[{prefix} perPage={per_page}] prev must be disabled on page 1"
    assert not (await next_.evaluate("el => el.disabled")), \
        f"[{prefix} perPage={per_page}] next must be enabled with {total_pages} pages"

    # range label (attachments only) on page 1
    if has_range:
        rng = await page.locator(f'[data-testid="{prefix}-range"]').inner_text()
        assert f"عرض 1–{per_page} من {total}" in rng, \
            f"[{prefix} perPage={per_page}] bad range label: {rng!r}"

    # jump to last page via End key (already exercised in run-keyboard, reuse here)
    await page.locator(f'[data-testid="{prefix}-pager"]').focus()
    await page.keyboard.press("End")

    txt = (await counter.inner_text()).strip()
    assert txt == f"{total_pages} / {total_pages}", \
        f"[{prefix} perPage={per_page}] End counter {txt!r} != {total_pages} / {total_pages}"

    last_expected = total - (total_pages - 1) * per_page
    n = await rows_in_body(page, prefix)
    assert n == last_expected, \
        f"[{prefix} perPage={per_page}] last page rendered {n} rows, expected {last_expected}"

    assert (await next_.evaluate("el => el.disabled")), \
        f"[{prefix} perPage={per_page}] next must be disabled on last page"
    assert not (await prev.evaluate("el => el.disabled")), \
        f"[{prefix} perPage={per_page}] prev must be enabled on last page"

    if has_range:
        rng = await page.locator(f'[data-testid="{prefix}-range"]').inner_text()
        start = (total_pages - 1) * per_page + 1
        assert f"عرض {start}–{total} من {total}" in rng, \
            f"[{prefix} perPage={per_page}] bad last-page range: {rng!r}"

    # no horizontal overflow in the pager <nav> at this viewport, even with big page counts
    overflow = await page.locator(f'[data-testid="{prefix}-pager"]').evaluate(
        "el => el.scrollWidth - el.clientWidth"
    )
    assert overflow <= 1, \
        f"[{prefix} perPage={per_page} viewport={viewport}] pager overflow={overflow}px"

    # reset to page 1 for the next iteration
    await page.keyboard.press("Home")


async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        print(f"Unknown PW_BROWSER={browser_name}; falling back to chromium.")
        browser_name = "chromium"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    fixture_url = (
        f"http://127.0.0.1:{port}/fixture-data.html"
        f"?records={RECORDS_TOTAL}&attachments={ATTACHMENTS_TOTAL}"
    )

    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}  fixture: {fixture_url}")
        for vp_name, (w, h) in VIEWPORTS.items():
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            await page.goto(fixture_url, wait_until="domcontentloaded")
            await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)
            await page.wait_for_timeout(200)

            # sanity: initial counters reflect the injected totals (perPage=10)
            init_records = (await page.locator('[data-testid="records-counter"]').inner_text()).strip()
            init_att = (await page.locator('[data-testid="attachments-counter"]').inner_text()).strip()
            expected_r = f"1 / {math.ceil(RECORDS_TOTAL / 10)}"
            expected_a = f"1 / {math.ceil(ATTACHMENTS_TOTAL / 10)}"
            assert init_records == expected_r, f"records init {init_records!r} != {expected_r!r}"
            assert init_att == expected_a, f"attachments init {init_att!r} != {expected_a!r}"

            for prefix, total, options, has_range in (
                ("records",     RECORDS_TOTAL,     RECORDS_PERPAGE,     False),
                ("attachments", ATTACHMENTS_TOTAL, ATTACHMENTS_PERPAGE, True),
            ):
                for per_page in options:
                    try:
                        await assert_perpage(page, prefix, total, per_page, vp_name, has_range)
                        print(f"ok   {browser_name:<8} {vp_name:<7} {prefix:<11} perPage={per_page}")
                    except AssertionError as e:
                        failures.append(f"{browser_name}/{vp_name}/{prefix}/perPage={per_page}: {e}")
                        await page.screenshot(
                            path=str(CAPTURE / f"fail_large_{browser_name}_{vp_name}_{prefix}_pp{per_page}.png")
                        )

            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"\nAll large-dataset ({RECORDS_TOTAL} records / {ATTACHMENTS_TOTAL} attachments) assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
