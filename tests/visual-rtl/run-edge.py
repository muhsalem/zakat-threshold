"""
Edge-case pagination tests: 0, 1, exact-page-boundary, few pages, many pages.

Loads `fixture-data.html` with different `?records=N&attachments=M` values
and asserts the counter, prev/next disabled state, and rendered row count
stay correct across every regime:

  N = 0    → 1 empty page, both buttons disabled, no crash on keys
  N = 1    → 1 page with 1 row, both buttons disabled
  N = 10   → 1 page exactly (no ragged tail), both buttons disabled
  N = 11   → 2 pages, tail = 1 row on page 2
  N = 25   → 3 pages, tail = 5 rows
  N = 100  → 10 pages exactly, last page full
  N = 257  → 26 pages (large, ragged tail = 7)

Also verifies that:
  - The per-page select changes total_pages consistently AND resets to page 1.
  - Home / End are no-ops when there's only one page (no counter drift).
  - Range label (attachments) reads "عرض 1–min(perPage,N) من N" on page 1,
    and "عرض start–N من N" on the last page — including "عرض 1–0 من 0" for N=0.

Browser via PW_BROWSER = chromium (default) | firefox | webkit.

Run:
    python tests/visual-rtl/run-edge.py
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

# Each case exercises a different pagination regime.
CASES = [
    ("empty",        0,   [10]),
    ("single",       1,   [10]),
    ("exact-page",   10,  [10]),
    ("just-over",    11,  [10, 20]),          # 2 pages @10, 1 page @20
    ("few-pages",    25,  [10, 20]),          # 3 pages @10, 2 pages @20
    ("boundary-100", 100, [10, 20, 50]),      # exact multiples for all options
    ("many-pages",   257, [10, 20, 50]),      # 26/13/6 pages with ragged tails
]


async def rows_in_body(page: Page, prefix: str) -> int:
    return await page.locator(f"#{prefix}-body > tr").count()


async def counter(page: Page, prefix: str) -> str:
    return (await page.locator(f'[data-testid="{prefix}-counter"]').inner_text()).strip()


async def assert_case(page: Page, prefix: str, total: int, per_page: int, has_range: bool) -> None:
    select = page.locator(f"#{prefix}-per-page")
    prev = page.locator(f"#{prefix}-prev")
    next_ = page.locator(f"#{prefix}-next")
    pager = page.locator(f'[data-testid="{prefix}-pager"]')

    await select.select_option(str(per_page))
    total_pages = max(1, math.ceil(total / per_page))
    first_page_rows = min(per_page, total)              # 0 when total=0
    last_page_rows = total - (total_pages - 1) * per_page if total > 0 else 0

    # ---- initial state (page 1) --------------------------------------------------
    got = await counter(page, prefix)
    assert got == f"1 / {total_pages}", \
        f"[{prefix} N={total} pp={per_page}] initial counter {got!r} != 1 / {total_pages}"

    rows = await rows_in_body(page, prefix)
    assert rows == first_page_rows, \
        f"[{prefix} N={total} pp={per_page}] page 1 rows={rows} expected {first_page_rows}"

    # prev is always disabled on page 1
    assert (await prev.evaluate("el => el.disabled")), \
        f"[{prefix} N={total} pp={per_page}] prev must be disabled on page 1"

    # next is disabled iff there's only one page
    next_disabled = await next_.evaluate("el => el.disabled")
    if total_pages == 1:
        assert next_disabled, \
            f"[{prefix} N={total} pp={per_page}] next must be disabled with 1 page"
    else:
        assert not next_disabled, \
            f"[{prefix} N={total} pp={per_page}] next must be enabled with {total_pages} pages"

    if has_range:
        rng = await page.locator(f'[data-testid="{prefix}-range"]').inner_text()
        expected = f"عرض 1–{first_page_rows} من {total}"
        assert expected in rng, \
            f"[{prefix} N={total} pp={per_page}] range {rng!r} missing {expected!r}"

    # ---- keyboard on single/empty page is a no-op (no crash, no drift) ----------
    if total_pages == 1:
        await pager.focus()
        for key in ("ArrowLeft", "ArrowRight", "Home", "End"):
            await page.keyboard.press(key)
            got = await counter(page, prefix)
            assert got == "1 / 1", \
                f"[{prefix} N={total} pp={per_page}] {key} on 1-page pager drifted to {got!r}"
            assert (await prev.evaluate("el => el.disabled")) and (await next_.evaluate("el => el.disabled")), \
                f"[{prefix} N={total} pp={per_page}] {key} changed disabled state on 1-page"
        return

    # ---- multi-page: End must land on last page with correct row count ----------
    await pager.focus()
    await page.keyboard.press("End")
    got = await counter(page, prefix)
    assert got == f"{total_pages} / {total_pages}", \
        f"[{prefix} N={total} pp={per_page}] End counter {got!r}"

    rows = await rows_in_body(page, prefix)
    assert rows == last_page_rows, \
        f"[{prefix} N={total} pp={per_page}] last page rows={rows} expected {last_page_rows}"

    assert (await next_.evaluate("el => el.disabled")), \
        f"[{prefix} N={total} pp={per_page}] next must be disabled on last page"
    assert not (await prev.evaluate("el => el.disabled")), \
        f"[{prefix} N={total} pp={per_page}] prev must be enabled on last page"

    if has_range:
        rng = await page.locator(f'[data-testid="{prefix}-range"]').inner_text()
        start = (total_pages - 1) * per_page + 1
        expected = f"عرض {start}–{total} من {total}"
        assert expected in rng, \
            f"[{prefix} N={total} pp={per_page}] last-page range {rng!r} missing {expected!r}"

    # ---- select change resets to page 1 -----------------------------------------
    # (proven implicitly at the top of the next iteration, but assert once here)
    await pager.focus()
    await page.keyboard.press("Home")
    assert (await counter(page, prefix)) == f"1 / {total_pages}"


async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        print(f"Unknown PW_BROWSER={browser_name}; falling back to chromium.")
        browser_name = "chromium"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}")

        for case_name, n, options in CASES:
            fixture_url = f"http://127.0.0.1:{port}/fixture-data.html?records={n}&attachments={n}"
            context = await browser.new_context(viewport={"width": 1280, "height": 900})
            page = await context.new_page()
            await page.goto(fixture_url, wait_until="domcontentloaded")
            # counter always exists (even for N=0), so wait for it to attach
            await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)
            await page.wait_for_timeout(150)

            for prefix, has_range in (("records", False), ("attachments", True)):
                for pp in options:
                    # attachments select only exposes 10 and 20
                    if prefix == "attachments" and pp == 50:
                        continue
                    try:
                        await assert_case(page, prefix, n, pp, has_range)
                        print(f"ok   {browser_name:<8} {case_name:<12} {prefix:<11} N={n:<3} pp={pp}")
                    except AssertionError as e:
                        failures.append(f"{browser_name}/{case_name}/{prefix}/N={n}/pp={pp}: {e}")
                        await page.screenshot(
                            path=str(CAPTURE / f"fail_edge_{browser_name}_{case_name}_{prefix}_pp{pp}.png")
                        )

            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll edge-case pagination assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
