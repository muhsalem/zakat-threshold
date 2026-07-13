"""
Post-resize disabled-click regression:

After every mutation of total/records, if prev or next is disabled at
its boundary, clicking it must:
  * NOT change state.page (counter / aria-current stable)
  * NOT flip any prev/next attribute (disabled, aria-disabled, tabindex)
  * NOT move focus to an UNINTENDED target — specifically:
      - never onto the opposite enabled boundary control
      - never onto an unrelated page-number anchor
      - never onto <body> (i.e. focus is not just dropped and lost)

Allowed focus landing zones (per current browser semantics):
  * The pre-click sentinel we focused (select / outer element)
  * The wrapping pager <nav>  (records-pager container is tabbable)
  * The clicked control itself — accepted only for the numbered
    anchor because browsers focus <a> on mousedown even with
    tabindex=-1; screen readers still read aria-disabled=true.
    Native <button disabled> in records CANNOT accept focus, so
    for records the sentinel must remain the active element.

Coverage:
  * records @ page 1  across 6 resize states (prev disabled)
  * records @ last    across 6 resize states (next disabled)
  * records @ single  across 4 states (both disabled)
  * numbered @ page 1 across 6 states (num-prev disabled)
  * numbered @ last   across 6 states (num-next disabled)
  * numbered @ single across 4 states (both disabled)

Run:
    python tests/visual-rtl/run-post-resize-disabled-click.py
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


# ---------- shared ----------

ACTIVE_JS = """() => {
    const a = document.activeElement;
    if (!a || a === document.body) return { key: 'BODY', tag: 'BODY', dataPage: null, testid: null, id: null, ariaDisabled: null };
    return {
        key: (a.id ? '#' + a.id : (a.getAttribute && a.getAttribute('data-testid') ? '[data-testid=' + a.getAttribute('data-testid') + ']' : (a.dataset && a.dataset.page ? '[data-page=' + a.dataset.page + ']' : a.tagName))),
        tag: a.tagName,
        dataPage: (a.dataset && a.dataset.page) || null,
        testid: a.getAttribute && a.getAttribute('data-testid'),
        id: a.id || null,
        ariaDisabled: a.getAttribute && a.getAttribute('aria-disabled'),
    };
}"""


async def active(page: Page) -> dict:
    return await page.evaluate(ACTIVE_JS)


# ---------- records ----------

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
                prev: { disabled: prev.disabled, ariaDisabled: prev.getAttribute('aria-disabled'), tabindex: prev.getAttribute('tabindex') },
                next: { disabled: next.disabled, ariaDisabled: next.getAttribute('aria-disabled'), tabindex: next.getAttribute('tabindex') },
            };
        }"""
    )


async def go_records_home(page: Page) -> None:
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("Home")


async def go_records_end(page: Page) -> None:
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("End")


async def assert_records_click(page: Page, target_id: str, expected_boundary: str, where: str) -> None:
    """
    Focus the per-page select (safe sentinel), click the disabled
    boundary button, and assert nothing meaningful moved.
    """
    await page.locator("#records-per-page").focus()
    a0 = await active(page)
    assert a0["id"] == "records-per-page", f"[{where}] pre-check: sentinel not focused: {a0}"

    before = await snap_records(page)
    assert before[expected_boundary]["disabled"] is True, (
        f"[{where}] expected {expected_boundary} disabled: {before}"
    )

    await page.locator(f"#{target_id}").click(force=True)
    after = await snap_records(page)
    a1 = await active(page)

    assert after["counter"] == before["counter"], (
        f"[{where}] counter drifted: {before['counter']!r} → {after['counter']!r}"
    )
    assert after["prev"] == before["prev"] and after["next"] == before["next"], (
        f"[{where}] prev/next attrs flipped: before={before} after={after}"
    )

    # Native <button disabled> refuses focus in every browser, so the
    # sentinel select MUST still be the active element. Landing on the
    # disabled button, the opposite enabled sibling, an unrelated page
    # anchor, or falling through to <body> are all regressions.
    assert a1["id"] == "records-per-page", (
        f"[{where}] focus moved to unintended target: expected #records-per-page, "
        f"got {a1}"
    )


RECORDS_RESIZES = [43, 120, 15, 22, 100, 43]
RECORDS_SINGLE  = [0, 1, 0, 10]


async def scenario_records(page: Page) -> None:
    await page.locator("#records-per-page").select_option("10")

    # Page 1: prev disabled after every resize (page 1 is always valid)
    for i, n in enumerate(RECORDS_RESIZES):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        await go_records_home(page)
        await assert_records_click(page, "records-prev", "prev", f"records@1 #{i} N={n}")

    # Last page: next disabled after every resize
    for i, n in enumerate(RECORDS_RESIZES):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        await go_records_end(page)
        await assert_records_click(page, "records-next", "next", f"records@last #{i} N={n}")

    # Single / empty: both disabled — click each and check invariants twice
    for i, n in enumerate(RECORDS_SINGLE):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        await assert_records_click(page, "records-prev", "prev", f"records single-prev #{i} N={n}")
        await assert_records_click(page, "records-next", "next", f"records single-next #{i} N={n}")


# ---------- numbered ----------

async def snap_numbered(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const nav = document.querySelector('[data-testid="numbered-pager"]');
            const cur = nav.querySelector('a[aria-current="page"]');
            const prev = nav.querySelector('[data-testid="num-prev"]');
            const next = nav.querySelector('[data-testid="num-next"]');
            return {
                currentPage: cur ? parseInt(cur.getAttribute('data-page'), 10) : null,
                bodyText: document.getElementById('numbered-body').textContent.trim(),
                total: nav.querySelectorAll('a[data-page]').length,
                prev: { ariaDisabled: prev.getAttribute('aria-disabled'), tabindex: prev.getAttribute('tabindex'), disabled: prev.hasAttribute('disabled') },
                next: { ariaDisabled: next.getAttribute('aria-disabled'), tabindex: next.getAttribute('tabindex'), disabled: next.hasAttribute('disabled') },
            };
        }"""
    )


async def assert_numbered_click(page: Page, target_testid: str, expected_boundary: str, where: str) -> None:
    # Focus outside the numbered pager entirely
    await page.locator("#records-per-page").focus()
    a0 = await active(page)
    assert a0["id"] == "records-per-page", f"[{where}] pre-check sentinel: {a0}"

    before = await snap_numbered(page)
    assert before[expected_boundary]["ariaDisabled"] == "true", (
        f"[{where}] expected {expected_boundary} aria-disabled: {before}"
    )

    await page.locator(f'[data-testid="{target_testid}"]').click(force=True)
    after = await snap_numbered(page)
    a1 = await active(page)

    assert after["currentPage"] == before["currentPage"], (
        f"[{where}] currentPage moved: {before['currentPage']} → {after['currentPage']}"
    )
    assert after["bodyText"] == before["bodyText"], (
        f"[{where}] body text drifted: {before['bodyText']!r} → {after['bodyText']!r}"
    )
    assert after["prev"] == before["prev"] and after["next"] == before["next"], (
        f"[{where}] prev/next attrs flipped: before={before} after={after}"
    )

    # Allowed focus targets:
    #   - The sentinel (#records-per-page)                — best case
    #   - The wrapping numbered <nav> (via closest)       — Firefox may do this
    #   - The clicked disabled anchor itself              — browser mousedown-focus
    # FORBIDDEN:
    #   - Any page-number anchor (would advance-by-mouse-focus surface)
    #   - The OPPOSITE boundary anchor
    #   - <body> (focus dropped)
    opposite = "num-next" if target_testid == "num-prev" else "num-prev"
    assert a1["dataPage"] is None, (
        f"[{where}] focus jumped to page anchor {a1['dataPage']}: {a1}"
    )
    assert a1["testid"] != opposite, (
        f"[{where}] focus leaked to opposite boundary: {a1}"
    )
    assert a1["tag"] != "BODY", f"[{where}] focus dropped to <body>: {a1}"


NUM_RESIZES = [5, 20, 3, 8, 2, 5]
NUM_SINGLE  = [1, 1, 1, 1]


async def scenario_numbered(page: Page) -> None:
    # Page 1: num-prev disabled
    for i, t in enumerate(NUM_RESIZES):
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        await page.locator('#numbered-list a[data-page="1"]').click()
        await assert_numbered_click(page, "num-prev", "prev", f"num@1 #{i} T={t}")

    # Last page: num-next disabled
    for i, t in enumerate(NUM_RESIZES):
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        last = await page.evaluate(
            "() => document.querySelectorAll('[data-testid=\"numbered-pager\"] a[data-page]').length"
        )
        await page.locator(f'#numbered-list a[data-page="{last}"]').click()
        await assert_numbered_click(page, "num-next", "next", f"num@last #{i} T={t}")

    # Single-page: both disabled
    for i, t in enumerate(NUM_SINGLE):
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        await assert_numbered_click(page, "num-prev", "prev", f"num single-prev #{i} T={t}")
        await assert_numbered_click(page, "num-next", "next", f"num single-next #{i} T={t}")


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
        ("records post-resize disabled click", scenario_records),
        ("numbered post-resize disabled click", scenario_numbered),
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
                    path=str(CAPTURE / f"fail_post_resize_click_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll post-resize disabled-click focus assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
