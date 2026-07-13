"""
Force-click resilience: firing synthetic clicks on prev/next WHILE
total/records is mutating must never advance the page beyond the
current bounds, never activate a disabled control, and never leave
the counter / aria-current disagreeing with state.page.

Threat model:
  * A stale pointer event lands on prev at the exact moment a resize
    clamps the current page to 1 (prev flips disabled between
    mousedown and click).
  * A user hammers next at the last page while __resizeData runs.
  * A touchend fires on a page anchor that was just removed by a
    shrink resize.

Scenarios (records + numbered, RTL):
  1. At page 1, force-click prev 10× interleaved with grow/shrink
     resizes. Assertion: page never leaves 1, prev stays disabled,
     counter never reads anything other than "1 / M".
  2. At last page, force-click next 10× interleaved with resizes that
     add/remove trailing pages. Assertion: page always equals the
     current totalPages, never overshoots, next stays disabled after
     each clamp.
  3. Empty / single page: force-click both prev+next interleaved with
     resize(0) / resize(1). Both remain disabled; page stays 1/1.
  4. Transition storm: alternate a force-click on next with a resize
     that flips its enabled/disabled state; over 20 rounds the
     counter must always equal state.page and state.page must never
     exceed totalPages.

Every assertion is post-condition — we let the resize + click settle,
snapshot state, and compare. Any synchronous state leak fails
immediately.

Run:
    python tests/visual-rtl/run-force-click-during-resize.py
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


# ---------- shared snapshot ----------

async def snap_records(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const c = document.querySelector('[data-testid="records-counter"]').textContent.trim();
            const m = c.match(/^(\\d+)\\s*\\/\\s*(\\d+)$/);
            const prev = document.getElementById('records-prev');
            const next = document.getElementById('records-next');
            return {
                counter: c,
                page: m ? parseInt(m[1], 10) : null,
                total: m ? parseInt(m[2], 10) : null,
                prevDisabled: prev.disabled,
                nextDisabled: next.disabled,
                prevAriaDisabled: prev.getAttribute('aria-disabled'),
                nextAriaDisabled: next.getAttribute('aria-disabled'),
            };
        }"""
    )


async def snap_numbered(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const nav = document.querySelector('[data-testid="numbered-pager"]');
            const currents = nav.querySelectorAll('a[aria-current="page"]');
            const body = document.getElementById('numbered-body').textContent.trim();
            const bm = body.match(/(\\d+)/);
            const total = nav.querySelectorAll('a[data-page]').length;
            const prev = nav.querySelector('[data-testid="num-prev"]');
            const next = nav.querySelector('[data-testid="num-next"]');
            return {
                currentCount: currents.length,
                currentPage: currents[0] ? parseInt(currents[0].getAttribute('data-page'), 10) : null,
                bodyPage: bm ? parseInt(bm[1], 10) : null,
                total,
                prevAriaDisabled: prev.getAttribute('aria-disabled'),
                nextAriaDisabled: next.getAttribute('aria-disabled'),
                prevTabindex: prev.getAttribute('tabindex'),
                nextTabindex: next.getAttribute('tabindex'),
            };
        }"""
    )


def check_records_invariants(s: dict, where: str) -> None:
    assert s["page"] is not None, f"[{where}] counter unparseable: {s}"
    assert 1 <= s["page"] <= s["total"], f"[{where}] page {s['page']} out of [1..{s['total']}]: {s}"
    if s["page"] == 1:
        assert s["prevDisabled"] is True, f"[{where}] prev not disabled at page 1: {s}"
    else:
        assert s["prevDisabled"] is False, f"[{where}] prev unexpectedly disabled: {s}"
    if s["page"] == s["total"]:
        assert s["nextDisabled"] is True, f"[{where}] next not disabled at last page: {s}"
    else:
        assert s["nextDisabled"] is False, f"[{where}] next unexpectedly disabled: {s}"


def check_numbered_invariants(s: dict, where: str) -> None:
    assert s["currentCount"] == 1, f"[{where}] aria-current count != 1: {s}"
    assert s["currentPage"] == s["bodyPage"], f"[{where}] SR surfaces disagree: {s}"
    assert 1 <= s["currentPage"] <= s["total"], f"[{where}] page out of bounds: {s}"
    if s["currentPage"] == 1:
        assert s["prevAriaDisabled"] == "true", f"[{where}] num-prev not disabled at page 1: {s}"
        assert s["prevTabindex"] == "-1", f"[{where}] num-prev tabindex wrong at page 1: {s}"
    else:
        assert s["prevAriaDisabled"] != "true", f"[{where}] num-prev unexpectedly disabled: {s}"
    if s["currentPage"] == s["total"]:
        assert s["nextAriaDisabled"] == "true", f"[{where}] num-next not disabled at last page: {s}"
        assert s["nextTabindex"] == "-1", f"[{where}] num-next tabindex wrong at last page: {s}"
    else:
        assert s["nextAriaDisabled"] != "true", f"[{where}] num-next unexpectedly disabled: {s}"


# ---------- records ----------

async def go_records_to(page: Page, target: int) -> None:
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("Home")
    for _ in range(target - 1):
        await page.locator("#records-next").click()


async def scenario_records(page: Page) -> None:
    # (1) Page 1 hammered while total grows/shrinks
    await page.locator("#records-per-page").select_option("10")
    await go_records_to(page, 1)
    resizes = [120, 43, 15, 100, 43, 22, 43, 60, 43, 43]
    for i, n in enumerate(resizes):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        await page.locator("#records-prev").click(force=True)
        s = await snap_records(page)
        check_records_invariants(s, f"records@1 round #{i} (N={n})")
        assert s["page"] == 1, f"records@1 round #{i}: page leaked to {s['page']} (N={n})"

    # (2) Last page hammered while trailing pages come and go
    await page.evaluate("() => window.__resizeData('records', 43)")
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("End")  # page 5 of 5
    for i, n in enumerate([50, 43, 45, 43, 60, 43, 50, 40, 43, 43]):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        # After clamp, jump to end again so we test the "at last page" case
        await page.locator('[data-testid="records-pager"]').focus()
        await page.keyboard.press("End")
        await page.locator("#records-next").click(force=True)
        s = await snap_records(page)
        check_records_invariants(s, f"records@last round #{i} (N={n})")
        assert s["page"] == s["total"], (
            f"records@last round #{i}: page {s['page']} != total {s['total']} (N={n})"
        )

    # (3) Empty / single-page storm
    for i, n in enumerate([0, 1, 0, 5, 0, 1, 0, 10, 0, 0]):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        await page.locator("#records-prev").click(force=True)
        await page.locator("#records-next").click(force=True)
        s = await snap_records(page)
        check_records_invariants(s, f"records empty/single #{i} (N={n})")
        if n <= 10:
            # perPage=10 → 1 page total (0 records floors totalPages at 1)
            assert s["total"] == 1 and s["page"] == 1, (
                f"records empty/single #{i}: expected 1/1, got {s['counter']}"
            )

    # (4) Transition storm on records-next: alternate a force-click with a
    # resize that flips next's enabled/disabled state.
    await page.evaluate("() => window.__resizeData('records', 43)")  # 5 pages
    await go_records_to(page, 4)  # next currently enabled (page 4 of 5)
    for i in range(20):
        # Odd rounds shrink so page 4 becomes last (next disabled);
        # even rounds grow so page 4 is interior (next enabled).
        n = 32 if i % 2 else 100
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        await page.locator("#records-next").click(force=True)
        s = await snap_records(page)
        check_records_invariants(s, f"records transition #{i} (N={n})")
        assert s["page"] <= s["total"], (
            f"records transition #{i}: page overshoot {s['page']} > {s['total']}"
        )


# ---------- numbered ----------

async def scenario_numbered(page: Page) -> None:
    # (1) Page 1 hammered while TOTAL grows/shrinks
    await page.evaluate("() => window.__resizeNumbered(5)")
    await page.locator('#numbered-list a[data-page="1"]').click()
    for i, t in enumerate([20, 5, 3, 12, 5, 2, 1, 8, 5, 5]):
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        # After each resize, reassert page-1 by clicking the (still existing) anchor
        await page.locator('#numbered-list a[data-page="1"]').click()
        await page.locator('[data-testid="num-prev"]').click(force=True)
        s = await snap_numbered(page)
        check_numbered_invariants(s, f"num@1 round #{i} (T={t})")
        assert s["currentPage"] == 1, f"num@1 round #{i}: leaked to {s['currentPage']}"

    # (2) Last page hammered while TOTAL grows/shrinks
    await page.evaluate("() => window.__resizeNumbered(5)")
    for i, t in enumerate([5, 8, 5, 3, 12, 4, 20, 2, 6, 5]):
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        # Go to whatever the current last page is
        current_total = await page.evaluate(
            "() => document.querySelectorAll('[data-testid=\"numbered-pager\"] a[data-page]').length"
        )
        await page.locator(f'#numbered-list a[data-page="{current_total}"]').click()
        await page.locator('[data-testid="num-next"]').click(force=True)
        s = await snap_numbered(page)
        check_numbered_invariants(s, f"num@last round #{i} (T={t})")
        assert s["currentPage"] == s["total"], (
            f"num@last round #{i}: page {s['currentPage']} != total {s['total']} (T={t})"
        )

    # (3) Single-page storm
    for i in range(8):
        await page.evaluate("() => window.__resizeNumbered(1)")
        await page.locator('[data-testid="num-prev"]').click(force=True)
        await page.locator('[data-testid="num-next"]').click(force=True)
        s = await snap_numbered(page)
        check_numbered_invariants(s, f"num single #{i}")
        assert s["currentPage"] == 1 and s["total"] == 1, (
            f"num single #{i}: expected 1/1, got {s['currentPage']}/{s['total']}"
        )

    # (4) Transition storm: at page 3, alternate __resizeNumbered(3) (page
    # 3 becomes last → next disabled) with __resizeNumbered(10) (page 3
    # interior → next enabled), and force-click next each round.
    await page.evaluate("() => window.__resizeNumbered(10)")
    await page.locator('#numbered-list a[data-page="3"]').click()
    for i in range(20):
        t = 3 if i % 2 else 10
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        await page.locator('[data-testid="num-next"]').click(force=True)
        s = await snap_numbered(page)
        check_numbered_invariants(s, f"num transition #{i} (T={t})")
        assert s["currentPage"] <= s["total"], (
            f"num transition #{i}: overshoot {s['currentPage']} > {s['total']}"
        )


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
        ("records force-click storm", scenario_records),
        ("numbered force-click storm", scenario_numbered),
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
            try:
                await fn(page)
                print(f"ok   {browser_name:<8} {name}")
            except AssertionError as e:
                failures.append(f"{browser_name}/{name}: {e}")
                await page.screenshot(
                    path=str(CAPTURE / f"fail_force_click_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll force-click-during-resize assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
