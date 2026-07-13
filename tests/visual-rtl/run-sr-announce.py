"""
Screen-reader announcements + focus/current-page coherence after
__resizeData / __resizeNumbered:

Records pager:
  * The counter is the live region (role=status, aria-live=polite,
    aria-atomic=true, aria-label="رقم الصفحة الحالي"). After every
    __resizeData call the counter TEXT must match `${state.page} / ${totalPages}`
    AND the live-region attributes must remain intact — otherwise the
    announcement never reaches AT even though the DOM updates.
  * Tab / Shift+Tab across the pager (select → prev → next) must, at
    each stop, see the SAME counter text (single source of truth for
    "current page"). We snapshot the counter at every focus stop and
    assert every value equals the current state.

Numbered pager:
  * aria-current="page" MUST live on exactly one anchor at any moment,
    and its data-page MUST equal the live "تعرض عناصر الصفحة N" body
    text (the two SR surfaces must never disagree).
  * After __resizeNumbered(grow / shrink / clamp), re-snapshot both
    surfaces — they must still agree, and there must still be exactly
    one aria-current="page".
  * Tab through num-prev → page-anchors → num-next; at every stop
    aria-current stays on the same page, the body announcement stays
    on the same page, and focus never lands on an aria-disabled anchor.

Run:
    python tests/visual-rtl/run-sr-announce.py
"""


from __future__ import annotations

import asyncio
import functools
import http.server
import os
import re
import socketserver
import sys
import threading
from pathlib import Path

from playwright.async_api import Page, async_playwright

ROOT = Path(__file__).parent
CAPTURE = ROOT / "_capture"
CAPTURE.mkdir(exist_ok=True)


# ---------- records ----------

async def snap_records_live(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const c = document.querySelector('[data-testid="records-counter"]');
            return {
                text: c.textContent.trim(),
                role: c.getAttribute('role'),
                ariaLive: c.getAttribute('aria-live'),
                ariaAtomic: c.getAttribute('aria-atomic'),
                ariaLabel: c.getAttribute('aria-label'),
            };
        }"""
    )


def assert_live_intact(s: dict, where: str) -> None:
    assert s["role"] == "status", f"[{where}] role lost: {s}"
    assert s["ariaLive"] == "polite", f"[{where}] aria-live lost: {s}"
    assert s["ariaAtomic"] == "true", f"[{where}] aria-atomic lost: {s}"
    assert s["ariaLabel"], f"[{where}] aria-label lost: {s}"


async def scenario_records_announce(page: Page) -> None:
    # Interior page for a meaningful "N / M" reading (43 records / 10 = page 3 of 5)
    await page.locator("#records-per-page").select_option("10")
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("Home")
    await page.locator("#records-next").click()
    await page.locator("#records-next").click()  # now page 3 / 5

    s0 = await snap_records_live(page)
    assert s0["text"] == "3 / 5", f"pre-resize baseline wrong: {s0}"
    assert_live_intact(s0, "records baseline")

    # Grow → totalPages jumps to 12, current page (3) still valid: announce "3 / 12"
    await page.evaluate("() => window.__resizeData('records', 120)")
    s1 = await snap_records_live(page)
    assert s1["text"] == "3 / 12", f"grow announcement wrong: {s1}"
    assert_live_intact(s1, "records grow")

    # Shrink so current page clamps down → announcement must reflect clamped page
    await page.evaluate("() => window.__resizeData('records', 15)")  # 2 pages
    s2 = await snap_records_live(page)
    assert s2["text"] == "2 / 2", f"clamp announcement wrong: {s2}"
    assert_live_intact(s2, "records clamp")

    # Shrink to 0 records → still "1 / 1" (pager floors totalPages at 1)
    await page.evaluate("() => window.__resizeData('records', 0)")
    s3 = await snap_records_live(page)
    assert s3["text"] == "1 / 1", f"empty announcement wrong: {s3}"
    assert_live_intact(s3, "records empty")

    # Restore a healthy dataset and verify Tab/Shift+Tab never disagrees
    # with the live counter (single source of truth for current page).
    await page.evaluate("() => window.__resizeData('records', 43)")
    await page.locator("#records-per-page").select_option("10")
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("Home")
    await page.locator("#records-next").click()  # page 2 / 5

    expected = "2 / 5"
    # Start focus on the select and Tab forward through prev, counter (skipped —
    # it's not focusable), next. At every stop the counter text must still
    # equal `expected` — no stale/mid-transition announcement.
    await page.locator("#records-per-page").focus()
    stops = []
    for _ in range(4):
        s = await snap_records_live(page)
        active = await page.evaluate("() => document.activeElement && document.activeElement.id || null")
        stops.append((active, s["text"]))
        await page.keyboard.press("Tab")
    for active, text in stops:
        assert text == expected, f"[Tab stop id={active}] counter drifted: {text!r} != {expected!r}"

    # Shift+Tab backward — same invariant
    for _ in range(4):
        s = await snap_records_live(page)
        assert s["text"] == expected, f"[Shift+Tab] counter drifted: {s}"
        await page.keyboard.press("Shift+Tab")


# ---------- numbered ----------

async def snap_numbered_agreement(page: Page) -> dict:
    """Both SR surfaces on the numbered pager must agree on the current page."""
    return await page.evaluate(
        """() => {
            const nav = document.querySelector('[data-testid="numbered-pager"]');
            const currents = nav.querySelectorAll('a[aria-current="page"]');
            const body = document.getElementById('numbered-body').textContent.trim();
            const m = body.match(/(\\d+)/);
            return {
                currentCount: currents.length,
                currentPage: currents[0] && currents[0].getAttribute('data-page'),
                bodyPage: m ? m[1] : null,
                bodyText: body,
                activeTag: document.activeElement && document.activeElement.tagName,
                activePage: document.activeElement && document.activeElement.dataset && document.activeElement.dataset.page || null,
                activeAriaDisabled: document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('aria-disabled'),
            };
        }"""
    )


def assert_surfaces_agree(s: dict, where: str) -> None:
    assert s["currentCount"] == 1, f"[{where}] aria-current count != 1: {s}"
    assert s["currentPage"] == s["bodyPage"], (
        f"[{where}] SR surfaces disagree: aria-current={s['currentPage']!r} "
        f"body={s['bodyText']!r}"
    )


async def scenario_numbered_announce(page: Page) -> None:
    # Baseline: page 1 / 5
    await page.evaluate("() => window.__resizeNumbered(5)")
    await page.locator('#numbered-list a[data-page="1"]').click()
    s = await snap_numbered_agreement(page)
    assert_surfaces_agree(s, "num baseline")
    assert s["currentPage"] == "1"

    # Move to page 3 (via click), then grow total → both surfaces still agree on "3"
    await page.locator('#numbered-list a[data-page="3"]').click()
    await page.evaluate("() => window.__resizeNumbered(20)")
    s = await snap_numbered_agreement(page)
    assert_surfaces_agree(s, "num grow")
    assert s["currentPage"] == "3", f"grow lost page: {s}"

    # Shrink so total < current → both surfaces move together to clamped last page
    await page.evaluate("() => window.__resizeNumbered(2)")
    s = await snap_numbered_agreement(page)
    assert_surfaces_agree(s, "num clamp")
    assert s["currentPage"] == "2", f"clamp mismatch: {s}"

    # Shrink to 1 → single page, both surfaces agree on "1", prev/next disabled
    await page.evaluate("() => window.__resizeNumbered(1)")
    s = await snap_numbered_agreement(page)
    assert_surfaces_agree(s, "num single")
    assert s["currentPage"] == "1"

    # Restore to 5 pages, go to page 2, then Tab through the whole pager.
    # At every stop: (a) both SR surfaces still agree on "2", (b) focus never
    # lands on an aria-disabled anchor.
    await page.evaluate("() => window.__resizeNumbered(5)")
    await page.locator('#numbered-list a[data-page="2"]').click()
    # Start from a non-pager control to enter the nav from outside
    await page.locator("#records-per-page").focus()
    # Advance focus enough times to walk the nav and past it
    for i in range(12):
        s = await snap_numbered_agreement(page)
        assert_surfaces_agree(s, f"num Tab stop #{i}")
        assert s["currentPage"] == "2", (
            f"[num Tab stop #{i}] current page drifted: {s}"
        )
        if s["activePage"] is not None or s["activeTag"] == "A":
            assert s["activeAriaDisabled"] != "true", (
                f"[num Tab stop #{i}] focus on aria-disabled: {s}"
            )
        await page.keyboard.press("Tab")

    # Shift+Tab back — same invariants
    for i in range(12):
        s = await snap_numbered_agreement(page)
        assert_surfaces_agree(s, f"num Shift+Tab stop #{i}")
        assert s["currentPage"] == "2", (
            f"[num Shift+Tab stop #{i}] current page drifted: {s}"
        )
        if s["activePage"] is not None or s["activeTag"] == "A":
            assert s["activeAriaDisabled"] != "true", (
                f"[num Shift+Tab stop #{i}] focus on aria-disabled: {s}"
            )
        await page.keyboard.press("Shift+Tab")


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
        ("records SR announce", scenario_records_announce),
        ("numbered SR agreement", scenario_numbered_announce),
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
                    path=str(CAPTURE / f"fail_sr_announce_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll SR announcement + focus-agreement assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
