"""
Live total/records changes must:
  (a) preserve the current page when it is still within [1..new_total_pages],
  (b) clamp to the last valid page (new_total_pages) when it overflows, and
  (c) never trigger a full page reload — the change is a synchronous re-render.

The "no full reload" guarantee is checked by planting a window-level sentinel
before every resize and asserting it is still there afterwards. A real
navigation would wipe it.

Fixture invariant reminder: `pager()` clamps in `render()` via
`if (state.page > tp) state.page = tp;`, so mutating the underlying array
plus calling render() is exactly what should preserve/clamp — this test
guards that logic against regressions.

Scenarios (RTL `records` pager, perPage=10 unless noted):

  PRESERVE (page stays exactly as it was):
    P1. page 1, 43 → 200: stays "1 / 20".
    P2. page 3, 43 → 47:  stays "3 / 5".
    P3. page 5 of 5, 43 → 80: stays "5 / 8" (grew, boundary shifted).
    P4. page 2 of 3 with perPage=20, 43 → 60: stays "2 / 3".
    P5. page 2, 43 → 11: stays "2 / 2" (exact tail; still valid).

  CLAMP (page was > new totalPages → jumps to new last):
    C1. page 5 of 5, 43 → 25 → "3 / 3".
    C2. page 5 of 5, 43 → 15 → "2 / 2".
    C3. page 5 of 5, 43 → 5  → "1 / 1".
    C4. page 5 of 5, 43 → 0  → "1 / 1" (fixture floors totalPages at 1).
    C5. page 12 of 12 after grow-then-shrink, 120 → 33 → "4 / 4".
    C6. page 3 of 3 with perPage=20, 43 → 10 → "1 / 1".

Every scenario asserts a "same document" sentinel survives — proving there
was no navigation.

Run:
    python tests/visual-rtl/run-clamp-on-resize.py
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


async def counter(page: Page) -> str:
    return (await page.locator('[data-testid="records-counter"]').inner_text()).strip()


async def go_to_page(page: Page, target: int) -> None:
    pager = page.locator('[data-testid="records-pager"]')
    await pager.focus()
    await page.keyboard.press("Home")
    for _ in range(target - 1):
        await page.locator("#records-next").click()


async def set_per_page(page: Page, value: str) -> None:
    await page.locator("#records-per-page").select_option(value)


async def resize(page: Page, n: int) -> None:
    await page.evaluate("(n) => window.__resizeData('records', n)", n)


async def plant_sentinel(page: Page, tag: str) -> None:
    await page.evaluate("(t) => { window.__sameDoc = t; }", tag)


async def sentinel_survived(page: Page, tag: str) -> bool:
    return await page.evaluate("(t) => window.__sameDoc === t", tag)


# ---------- generic scenario driver ----------

async def resize_case(
    page: Page,
    *,
    start_page: int,
    per_page: str,
    resize_to: int,
    expect_after: str,
    label: str,
) -> None:
    await set_per_page(page, per_page)
    await go_to_page(page, start_page)
    before_counter = await counter(page)

    sentinel = f"sentinel:{label}"
    await plant_sentinel(page, sentinel)

    await resize(page, resize_to)

    # (c) no reload
    assert await sentinel_survived(page, sentinel), \
        f"[{label}] window sentinel was cleared — a reload happened"

    after = await counter(page)
    assert after == expect_after, \
        f"[{label}] counter after resize={after!r} expected {expect_after!r} (before={before_counter!r})"


PRESERVE_CASES = [
    # label,                start, perPage, resize_to, expected
    ("P1 page1 grow",          1, "10", 200, "1 / 20"),
    ("P2 page3 shrink-safe",   3, "10",  47, "3 / 5"),
    ("P3 page5 grow-boundary", 5, "10",  80, "5 / 8"),
    ("P4 perPage20 stay",      2, "20",  60, "2 / 3"),
    ("P5 page2 exact-tail",    2, "10",  11, "2 / 2"),
]

CLAMP_CASES = [
    ("C1 last→3/3",     5, "10",  25, "3 / 3"),
    ("C2 last→2/2",     5, "10",  15, "2 / 2"),
    ("C3 last→1/1",     5, "10",   5, "1 / 1"),
    ("C4 last→zero",    5, "10",   0, "1 / 1"),
    ("C6 perPage20→1/1", 3, "20",  10, "1 / 1"),
]


async def scenario_preserve(page: Page) -> None:
    for label, sp, pp, rt, exp in PRESERVE_CASES:
        # ensure enough rows for the starting page to be reachable
        await resize(page, 43)
        await resize_case(page, start_page=sp, per_page=pp, resize_to=rt,
                          expect_after=exp, label=label)


async def scenario_clamp(page: Page) -> None:
    for label, sp, pp, rt, exp in CLAMP_CASES:
        await resize(page, 43)
        await resize_case(page, start_page=sp, per_page=pp, resize_to=rt,
                          expect_after=exp, label=label)


async def scenario_c5_grow_then_shrink(page: Page) -> None:
    """C5: grow 43→120, jump to page 12, then shrink 120→33 → clamps to 4/4."""
    await resize(page, 43)
    await set_per_page(page, "10")
    await resize(page, 120)
    await go_to_page(page, 12)
    assert (await counter(page)) == "12 / 12"

    await plant_sentinel(page, "sentinel:C5")
    await resize(page, 33)
    assert await sentinel_survived(page, "sentinel:C5"), "C5 reload happened"
    got = await counter(page)
    assert got == "4 / 4", f"C5 expected 4 / 4, got {got!r}"


async def scenario_boundary_buttons_after_clamp(page: Page) -> None:
    """After clamping to the new last page, next MUST be disabled and prev
    is disabled only if the new total collapsed to a single page."""
    await resize(page, 43)
    await set_per_page(page, "10")
    await go_to_page(page, 5)
    await resize(page, 25)  # clamps to 3/3
    assert (await counter(page)) == "3 / 3"
    assert await page.locator("#records-next").is_disabled(), "next must be disabled at 3/3"
    assert not await page.locator("#records-prev").is_disabled(), "prev must be enabled at 3/3"

    await resize(page, 5)   # clamps to 1/1 — both disabled
    assert (await counter(page)) == "1 / 1"
    assert await page.locator("#records-next").is_disabled()
    assert await page.locator("#records-prev").is_disabled()


# ---------- runner ----------

async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        browser_name = "chromium"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{port}/fixture-data.html"

    scenarios = [
        ("preserve current page", scenario_preserve),
        ("clamp to new last page", scenario_clamp),
        ("C5 grow-then-shrink clamps", scenario_c5_grow_then_shrink),
        ("boundary buttons after clamp", scenario_boundary_buttons_after_clamp),
    ]

    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}")
        for name, fn in scenarios:
            context = await browser.new_context(viewport={"width": 1280, "height": 900})
            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded")
            await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)
            assert await page.evaluate("() => typeof window.__resizeData === 'function'"), \
                "fixture missing __resizeData hook"
            try:
                await fn(page)
                print(f"ok   {browser_name:<8} {name}")
            except AssertionError as e:
                failures.append(f"{browser_name}/{name}: {e}")
                await page.screenshot(
                    path=str(CAPTURE / f"fail_clamp_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll preserve+clamp+no-reload assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
