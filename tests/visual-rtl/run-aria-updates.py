"""
Verify aria-label + aria-current updates on the RTL numbered pager after
EVERY click on a page number, prev, or next — with extra focus on the
first/last page boundaries.

Contract under test (from fixture-data.html numbered pager, TOTAL=5):
  - Exactly one `a[aria-current="page"]` exists at all times.
  - The current link's aria-current="page"; all others aria-current="false".
  - Each page link's aria-label is `الصفحة N` (matches its data-page).
  - prev aria-label = "الصفحة السابقة" (never changes across states).
  - next aria-label = "الصفحة التالية" (never changes across states).
  - On page 1: prev has aria-disabled="true", disabled attr, tabindex=-1.
  - On page 5: next has aria-disabled="true", disabled attr, tabindex=-1.
  - On any interior page: both prev/next enabled, tabindex=0, no aria-disabled.
  - Clicking prev/next moves aria-current AND toggles the boundary state
    of the opposite button correctly (e.g. leaving page 1 enables prev).

Run:
    python tests/visual-rtl/run-aria-updates.py
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

TOTAL = 5
PREV_LABEL = "الصفحة السابقة"
NEXT_LABEL = "الصفحة التالية"


async def snapshot(page: Page) -> dict:
    """Read a full a11y snapshot of the numbered pager."""
    return await page.evaluate(
        """() => {
            const nav = document.querySelector('[data-testid="numbered-pager"]');
            const links = Array.from(nav.querySelectorAll('a[data-page]')).map((a) => ({
                page: a.getAttribute('data-page'),
                label: a.getAttribute('aria-label'),
                current: a.getAttribute('aria-current'),
            }));
            const btn = (sel) => {
                const el = nav.querySelector(sel);
                return {
                    label: el.getAttribute('aria-label'),
                    ariaDisabled: el.getAttribute('aria-disabled'),
                    disabled: el.hasAttribute('disabled'),
                    tabindex: el.getAttribute('tabindex'),
                };
            };
            return {
                links,
                prev: btn('[data-testid="num-prev"]'),
                next: btn('[data-testid="num-next"]'),
                currentCount: nav.querySelectorAll('a[aria-current="page"]').length,
            };
        }"""
    )


def assert_state(snap: dict, page: int, label: str) -> None:
    # 1) exactly one aria-current="page"
    assert snap["currentCount"] == 1, (
        f"[{label}] expected exactly 1 aria-current=page, got {snap['currentCount']}"
    )
    # 2) links: labels match "الصفحة N"; aria-current matches only on `page`
    seen_pages = []
    for lk in snap["links"]:
        p = int(lk["page"])
        seen_pages.append(p)
        assert lk["label"] == f"الصفحة {p}", (
            f"[{label}] page {p} aria-label={lk['label']!r}"
        )
        expected_current = "page" if p == page else "false"
        assert lk["current"] == expected_current, (
            f"[{label}] page {p} aria-current={lk['current']!r} expected {expected_current!r}"
        )
    assert seen_pages == list(range(1, TOTAL + 1)), (
        f"[{label}] pages rendered={seen_pages}"
    )

    # 3) prev/next labels are stable across every state
    assert snap["prev"]["label"] == PREV_LABEL, (
        f"[{label}] prev label changed to {snap['prev']['label']!r}"
    )
    assert snap["next"]["label"] == NEXT_LABEL, (
        f"[{label}] next label changed to {snap['next']['label']!r}"
    )

    # 4) boundary aria-disabled + tabindex
    prev_disabled = page == 1
    next_disabled = page == TOTAL
    assert (snap["prev"]["ariaDisabled"] == "true") == prev_disabled, (
        f"[{label}] prev aria-disabled={snap['prev']['ariaDisabled']!r} at page {page}"
    )
    assert snap["prev"]["disabled"] == prev_disabled, (
        f"[{label}] prev disabled attr={snap['prev']['disabled']} at page {page}"
    )
    assert snap["prev"]["tabindex"] == ("-1" if prev_disabled else "0"), (
        f"[{label}] prev tabindex={snap['prev']['tabindex']!r} at page {page}"
    )
    assert (snap["next"]["ariaDisabled"] == "true") == next_disabled, (
        f"[{label}] next aria-disabled={snap['next']['ariaDisabled']!r} at page {page}"
    )
    assert snap["next"]["disabled"] == next_disabled, (
        f"[{label}] next disabled attr={snap['next']['disabled']} at page {page}"
    )
    assert snap["next"]["tabindex"] == ("-1" if next_disabled else "0"), (
        f"[{label}] next tabindex={snap['next']['tabindex']!r} at page {page}"
    )


async def click_page(page: Page, n: int) -> None:
    await page.locator(f'#numbered-list a[data-page="{n}"]').click()


async def click_prev(page: Page) -> None:
    await page.locator('[data-testid="num-prev"]').click()


async def click_next(page: Page) -> None:
    await page.locator('[data-testid="num-next"]').click()


async def run_scenarios(page: Page) -> None:
    # initial state
    assert_state(await snapshot(page), 1, "init@1 (first-page boundary)")

    # Click each page 1..N and assert state after every click
    for target in range(1, TOTAL + 1):
        await click_page(page, target)
        assert_state(await snapshot(page), target, f"click page={target}")

    # Boundary: at page 5 (last), next is disabled — clicking it must not move
    before = await snapshot(page)
    await page.locator('[data-testid="num-next"]').click(force=True)
    after = await snapshot(page)
    assert after == before, "click on disabled next at last page changed state"
    assert_state(after, TOTAL, "next@last is a no-op")

    # Walk backward via prev: 5 → 4 → 3 → 2 → 1
    for expected in [4, 3, 2, 1]:
        await click_prev(page)
        assert_state(await snapshot(page), expected, f"prev → {expected}")

    # Boundary: at page 1 (first), prev is disabled — clicking must not move
    before = await snapshot(page)
    await page.locator('[data-testid="num-prev"]').click(force=True)
    after = await snapshot(page)
    assert after == before, "click on disabled prev at first page changed state"
    assert_state(after, 1, "prev@first is a no-op")

    # Walk forward via next: 1 → 2 → 3 → 4 → 5
    for expected in [2, 3, 4, 5]:
        await click_next(page)
        assert_state(await snapshot(page), expected, f"next → {expected}")

    # Jump patterns: last → first → interior → last, each transition re-checked
    await click_page(page, 1)
    assert_state(await snapshot(page), 1, "jump last→1")
    await click_page(page, 3)
    assert_state(await snapshot(page), 3, "jump 1→3")
    await click_page(page, TOTAL)
    assert_state(await snapshot(page), TOTAL, "jump 3→last")


async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        browser_name = "chromium"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{port}/fixture-data.html"

    failed = False
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}")
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded")
        await page.locator('[data-testid="numbered-pager"]').wait_for(state="attached", timeout=30000)
        await page.wait_for_timeout(150)
        try:
            await run_scenarios(page)
            print(f"ok   {browser_name}  aria-label + aria-current updates (numbered RTL)")
        except AssertionError as e:
            failed = True
            print(f"FAIL {browser_name}: {e}")
            await page.screenshot(path=str(CAPTURE / f"fail_aria_updates_{browser_name}.png"))
        await context.close()
        await browser.close()
    httpd.shutdown()

    if failed:
        return 1
    print("\nAll aria-label + aria-current update assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
