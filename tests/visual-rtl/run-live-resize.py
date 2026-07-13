"""
Live dataset resize WITHOUT reload: change the underlying record/attachment
count while the UI stays on the same page, and verify the counter, the
"عرض start–end من total" range, and prev/next disabled states update
immediately.

Uses the fixture-only hook `window.__resizeData(name, n)` which mutates the
in-memory array and re-renders the affected pager. No navigation, no reload.

Coverage on the RTL `records` pager (perPage=10 for deterministic pages):
  1. Grow: 43 → 120 on page 3 stays on 3 with tp=12; prev/next enabled.
  2. Shrink but current page still valid: 120 → 47 on page 3 → tp=5.
  3. Shrink past current page: from 5/5 → resize to 25 → clamps to 3/3,
     next becomes disabled.
  4. Shrink to single page: 25 → 5 → "1 / 1", both prev/next disabled.
  5. Shrink to zero: 5 → 0 → "1 / 1" (fixture floors totalPages at 1),
     body empty, both buttons disabled.
  6. Grow from zero back to multi: 0 → 30 → "1 / 3" immediately.

On the RTL `attachments` pager (perPage=10, has a live range label):
  7. 27 → 80 on page 2 → "2 / 8", range "عرض 11–20 من 80".
  8. 80 → 12 on page 2 → "2 / 2", range "عرض 11–12 من 12", next disabled.
  9. 12 → 3 → "1 / 1", range "عرض 1–3 من 3", both disabled.
 10. 3 → 0 → "1 / 1", range "عرض 1–0 من 0" (fixture formula: start+1=1,
     end=0, total=0), both disabled.

Every assertion is captured immediately after `page.evaluate` returns — no
`waitForTimeout`, no navigation, proving the update is synchronous.

Run:
    python tests/visual-rtl/run-live-resize.py
"""

from __future__ import annotations

import asyncio
import functools
import http.server
import os
import socketserver
import sys
import threading
from pathlib import Path

from playwright.async_api import Page, async_playwright

ROOT = Path(__file__).parent
CAPTURE = ROOT / "_capture"
CAPTURE.mkdir(exist_ok=True)


async def resize(page: Page, name: str, n: int) -> None:
    await page.evaluate("([name, n]) => window.__resizeData(name, n)", [name, n])


async def counter_text(page: Page, prefix: str) -> str:
    return (await page.locator(f'[data-testid="{prefix}-counter"]').inner_text()).strip()


async def range_text(page: Page, prefix: str) -> str:
    return (await page.locator(f'[data-testid="{prefix}-range"]').inner_text()).strip()


async def state(page: Page, prefix: str) -> dict:
    return {
        "counter": await counter_text(page, prefix),
        "prev_disabled": await page.locator(f"#{prefix}-prev").is_disabled(),
        "next_disabled": await page.locator(f"#{prefix}-next").is_disabled(),
        "row_count": await page.locator(f"#{prefix}-body tr").count(),
    }


async def go_to_page(page: Page, prefix: str, target: int) -> None:
    """Click Home then Next until we're on `target`."""
    pager = page.locator(f'[data-testid="{prefix}-pager"]')
    await pager.focus()
    await page.keyboard.press("Home")
    for _ in range(target - 1):
        await page.locator(f"#{prefix}-next").click()


def check(actual: dict, want: dict, label: str) -> None:
    for k, v in want.items():
        assert actual.get(k) == v, f"[{label}] {k}={actual.get(k)!r} expected {v!r}"


async def scenario_records(page: Page) -> None:
    prefix = "records"
    # perPage=10 by default. Land on page 3 (initial data=43 rows → 5 pages).
    await go_to_page(page, prefix, 3)
    check(await state(page, prefix), {"counter": "3 / 5"}, "records init@3")

    # (1) grow 43 → 120: 12 pages, page stays 3
    await resize(page, "records", 120)
    check(
        await state(page, prefix),
        {"counter": "3 / 12", "prev_disabled": False, "next_disabled": False, "row_count": 10},
        "records grow→120",
    )

    # (2) shrink 120 → 47: 5 pages, page stays 3
    await resize(page, "records", 47)
    check(
        await state(page, prefix),
        {"counter": "3 / 5", "prev_disabled": False, "next_disabled": False, "row_count": 10},
        "records shrink→47",
    )

    # (3) go to last (5/5), then shrink to 25 → clamps to 3/3
    await go_to_page(page, prefix, 5)
    check(await state(page, prefix), {"counter": "5 / 5", "next_disabled": True}, "records @5/5")
    await resize(page, "records", 25)
    check(
        await state(page, prefix),
        {"counter": "3 / 3", "prev_disabled": False, "next_disabled": True, "row_count": 5},
        "records shrink→25 clamps",
    )

    # (4) shrink 25 → 5 → single page, both buttons disabled
    await resize(page, "records", 5)
    check(
        await state(page, prefix),
        {"counter": "1 / 1", "prev_disabled": True, "next_disabled": True, "row_count": 5},
        "records shrink→5",
    )

    # (5) shrink to zero → "1 / 1", empty body
    await resize(page, "records", 0)
    check(
        await state(page, prefix),
        {"counter": "1 / 1", "prev_disabled": True, "next_disabled": True, "row_count": 0},
        "records shrink→0",
    )

    # (6) grow 0 → 30 → "1 / 3"
    await resize(page, "records", 30)
    check(
        await state(page, prefix),
        {"counter": "1 / 3", "prev_disabled": True, "next_disabled": False, "row_count": 10},
        "records grow 0→30",
    )


async def scenario_attachments(page: Page) -> None:
    prefix = "attachments"
    # (7) land on page 2 with initial 27 → 3 pages; grow → 80 → 8 pages
    await go_to_page(page, prefix, 2)
    check(await state(page, prefix), {"counter": "2 / 3"}, "att init@2")
    assert (await range_text(page, prefix)) == "عرض 11–20 من 27", await range_text(page, prefix)

    await resize(page, "attachments", 80)
    check(
        await state(page, prefix),
        {"counter": "2 / 8", "prev_disabled": False, "next_disabled": False, "row_count": 10},
        "att grow→80",
    )
    assert (await range_text(page, prefix)) == "عرض 11–20 من 80", await range_text(page, prefix)

    # (8) shrink 80 → 12 while still on page 2 → 2/2 tail with 2 rows, range 11–12
    await resize(page, "attachments", 12)
    check(
        await state(page, prefix),
        {"counter": "2 / 2", "prev_disabled": False, "next_disabled": True, "row_count": 2},
        "att shrink→12 tail",
    )
    assert (await range_text(page, prefix)) == "عرض 11–12 من 12", await range_text(page, prefix)

    # (9) shrink 12 → 3 → single page, 3 rows
    await resize(page, "attachments", 3)
    check(
        await state(page, prefix),
        {"counter": "1 / 1", "prev_disabled": True, "next_disabled": True, "row_count": 3},
        "att shrink→3",
    )
    assert (await range_text(page, prefix)) == "عرض 1–3 من 3", await range_text(page, prefix)

    # (10) shrink 3 → 0
    await resize(page, "attachments", 0)
    check(
        await state(page, prefix),
        {"counter": "1 / 1", "prev_disabled": True, "next_disabled": True, "row_count": 0},
        "att shrink→0",
    )
    # start+1=1, end=0, total=0 — fixture emits this literal.
    assert (await range_text(page, prefix)) == "عرض 1–0 من 0", await range_text(page, prefix)


async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        browser_name = "chromium"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{port}/fixture-data.html"

    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}")
        for name, fn in [("records live resize", scenario_records),
                         ("attachments live resize", scenario_attachments)]:
            context = await browser.new_context(viewport={"width": 1280, "height": 900})
            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded")
            await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)
            # sanity: hook is exposed
            assert await page.evaluate("() => typeof window.__resizeData === 'function'"), \
                "fixture missing __resizeData hook"
            try:
                await fn(page)
                print(f"ok   {browser_name:<8} {name}")
            except AssertionError as e:
                failures.append(f"{browser_name}/{name}: {e}")
                await page.screenshot(
                    path=str(CAPTURE / f"fail_live_resize_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll live-resize assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
