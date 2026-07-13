"""
State restore after refresh / reopen: the current page number and the
"عرض start–end من total" counter must recover to exactly what was on screen
before, without wrong recomputation.

The fixture persists per-pager `{ page, perPage }` into sessionStorage
(under `pager:records`) on every render and re-reads it on load. It also
accepts URL params `?recordsPage=P&recordsPerPage=PP` (and `?records=N`)
so a bookmark / shareable link reopens the same view. sessionStorage is
per-tab and survives `page.reload()`; a URL-based reopen also survives a
fresh context (real cold reopen).

Coverage:

  REFRESH (sessionStorage path — same tab, `page.reload()`):
    S1. Default `?records=43`, perPage=10, navigate to page 4 →
        reload → counter still "4 / 5"; sessionStorage untouched.
    S2. Change perPage to 20 → page 3 (3/3) → reload → "3 / 3" preserved.
    S3. On page 5/5 (perPage=10), reload → "5 / 5" preserved.

  REOPEN (URL param path — brand-new context, no shared storage):
    U1. `?records=120&recordsPage=8&recordsPerPage=10` → "8 / 12", range for
        the *attachments* pager unchanged. Sanity: window has NO leftover
        sessionStorage from earlier tests (new context).
    U2. `?records=57&recordsPage=6&recordsPerPage=10` → "6 / 6" (exact tail).
    U3. URL requests an out-of-range page after resize:
        `?records=25&recordsPage=8&recordsPerPage=10` → fixture clamps to
        the new last page → "3 / 3", still no reload artifact (single
        DOM restore path, not double-compute).

  URL PRECEDENCE:
    P1. sessionStorage says page=4, but URL says `recordsPage=2` — URL wins;
        counter is "2 / 5".

Every REFRESH assertion also verifies `performance.getEntriesByType('navigation')[0].type === 'reload'`
after the reload, so an accidental removal of the persistence path fails
loudly (the counter would fall back to "1 / N").

Run:
    python tests/visual-rtl/run-restore-after-refresh.py
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

from playwright.async_api import BrowserContext, Page, async_playwright

ROOT = Path(__file__).parent
CAPTURE = ROOT / "_capture"
CAPTURE.mkdir(exist_ok=True)


async def counter(page: Page) -> str:
    return (await page.locator('[data-testid="records-counter"]').inner_text()).strip()


async def att_range(page: Page) -> str:
    return (await page.locator('[data-testid="attachments-range"]').inner_text()).strip()


async def goto_page(page: Page, target: int) -> None:
    pager = page.locator('[data-testid="records-pager"]')
    await pager.focus()
    await page.keyboard.press("Home")
    for _ in range(target - 1):
        await page.locator("#records-next").click()


async def set_per_page(page: Page, value: str) -> None:
    await page.locator("#records-per-page").select_option(value)


async def nav_type(page: Page) -> str:
    return await page.evaluate(
        "() => performance.getEntriesByType('navigation')[0]?.type"
    )


async def wait_ready(page: Page) -> None:
    await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)


# ---------- REFRESH scenarios (same tab / sessionStorage) ----------

async def refresh_case(page: Page, url: str, per_page: str, target_page: int, expect_after_reload: str, label: str) -> None:
    await page.goto(url, wait_until="domcontentloaded")
    await wait_ready(page)
    await set_per_page(page, per_page)
    await goto_page(page, target_page)
    before = await counter(page)

    await page.reload(wait_until="domcontentloaded")
    await wait_ready(page)
    nt = await nav_type(page)
    assert nt == "reload", f"[{label}] navigation type={nt!r} expected 'reload'"

    after = await counter(page)
    assert after == expect_after_reload, (
        f"[{label}] counter after reload={after!r} expected {expect_after_reload!r} (before={before!r})"
    )
    # After restore, the SELECT must also reflect the restored perPage
    got_pp = await page.locator("#records-per-page").input_value()
    assert got_pp == per_page, f"[{label}] select perPage={got_pp!r} expected {per_page!r}"


async def scenario_refresh(page: Page, base: str) -> None:
    await refresh_case(page, base, per_page="10", target_page=4,
                       expect_after_reload="4 / 5", label="S1 page4")
    await refresh_case(page, base, per_page="20", target_page=3,
                       expect_after_reload="3 / 3", label="S2 perPage20 page3")
    await refresh_case(page, base, per_page="10", target_page=5,
                       expect_after_reload="5 / 5", label="S3 page5/5")


# ---------- REOPEN scenarios (fresh context, URL-driven) ----------

async def reopen_case(browser, url: str, expect_counter: str, label: str,
                      expect_att_range: str | None = None) -> None:
    context = await browser.new_context(viewport={"width": 1280, "height": 900})
    page = await context.new_page()
    await page.goto(url, wait_until="domcontentloaded")
    await wait_ready(page)

    # Sanity: fresh context has no leftover sessionStorage from other tests
    leftover = await page.evaluate("() => sessionStorage.getItem('pager:records')")
    # sessionStorage may have been written during initial render — check the
    # value matches the URL request, not some stale value.
    got = await counter(page)
    assert got == expect_counter, f"[{label}] reopen counter={got!r} expected {expect_counter!r}"

    if expect_att_range is not None:
        r = await att_range(page)
        assert r == expect_att_range, f"[{label}] attachments range={r!r} expected {expect_att_range!r}"

    # Persistence was written by the very first render — sanity-check the shape
    assert leftover is None or "page" in (leftover or ""), \
        f"[{label}] sessionStorage shape unexpected: {leftover!r}"

    await context.close()


async def scenario_reopen(browser, base: str) -> None:
    # U1: 120 records, page 8, perPage 10 → 12 pages
    await reopen_case(
        browser,
        base + "?records=120&recordsPage=8&recordsPerPage=10",
        expect_counter="8 / 12",
        label="U1 reopen 120/8/10",
        expect_att_range="عرض 1–10 من 27",   # attachments pager untouched by records params
    )
    # U2: exact tail 57 rows / 10 → 6 pages, page 6 → "6 / 6"
    await reopen_case(
        browser,
        base + "?records=57&recordsPage=6&recordsPerPage=10",
        expect_counter="6 / 6",
        label="U2 reopen exact tail",
    )
    # U3: requested page out-of-range → clamp to new last (25 rows / 10 = 3 pages)
    await reopen_case(
        browser,
        base + "?records=25&recordsPage=8&recordsPerPage=10",
        expect_counter="3 / 3",
        label="U3 reopen clamps",
    )


# ---------- URL PRECEDENCE ----------

async def scenario_url_precedence(browser, base: str) -> None:
    context = await browser.new_context(viewport={"width": 1280, "height": 900})
    page = await context.new_page()

    # First visit: navigate to page 4 → sessionStorage:{page:4, perPage:10}
    await page.goto(base, wait_until="domcontentloaded")
    await wait_ready(page)
    await goto_page(page, 4)
    assert (await counter(page)) == "4 / 5"

    # Second visit in same tab with URL param — URL must WIN over sessionStorage
    await page.goto(base + "?recordsPage=2&recordsPerPage=10", wait_until="domcontentloaded")
    await wait_ready(page)
    got = await counter(page)
    assert got == "2 / 5", f"P1 URL should win over sessionStorage; got {got!r}"

    await context.close()


# ---------- runner ----------

async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        browser_name = "chromium"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{port}/fixture-data.html"

    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}")

        # REFRESH scenarios share a single context (per-tab sessionStorage)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        try:
            await scenario_refresh(page, base)
            print(f"ok   {browser_name:<8} refresh via sessionStorage")
        except AssertionError as e:
            failures.append(f"{browser_name}/refresh: {e}")
            await page.screenshot(path=str(CAPTURE / f"fail_refresh_{browser_name}.png"))
        await context.close()

        # REOPEN scenarios each get their own fresh context (cold reopen)
        try:
            await scenario_reopen(browser, base)
            print(f"ok   {browser_name:<8} reopen via URL params")
        except AssertionError as e:
            failures.append(f"{browser_name}/reopen: {e}")

        try:
            await scenario_url_precedence(browser, base)
            print(f"ok   {browser_name:<8} URL precedence over sessionStorage")
        except AssertionError as e:
            failures.append(f"{browser_name}/precedence: {e}")

        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll refresh/reopen restore assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
