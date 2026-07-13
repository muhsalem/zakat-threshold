"""
Focus RETURN: after a total/records resize or a page-number click, focus
MUST stay on the same logical control the user was operating — never leak
to <body>, the wrapping <nav>, or an unrelated element.

Records pager (stable DOM: prev/next/select are never replaced):
  * Focus the per-page <select>, change perPage via selectOption →
    document.activeElement stays on the select (data-resize triggered by
    native change event; pager re-renders but does not steal focus).
  * Focus records-next at an interior page, click it → focus stays on
    records-next (same DOM node persists across state.page mutation).
  * Focus records-prev at an interior page, live-resize records to a size
    that keeps the current page valid → focus stays on records-prev
    (re-render must not blur controls).

Numbered pager (list.innerHTML swap destroys anchors — the fixture MUST
re-focus the logical equivalent after re-render):
  * Click page anchor 3 → activeElement is the FRESH a[data-page="3"].
  * Focus a[data-page="4"], call __resizeNumbered(20) (grow) → focus
    returns to a[data-page="4"] (same logical page anchor).
  * Focus num-next, click it (page 1 → 2) → focus returns to the fresh
    num-next anchor (still enabled at page 2 of 5).
  * Focus num-prev at page 3, shrink total to 3 (page 3 becomes last, so
    num-next flips disabled but num-prev stays enabled) → focus returns
    to num-prev.
  * Boundary safety: focus num-next at page 4 of 5, __resizeNumbered(4)
    (page clamps to 4, num-next flips disabled) → focus falls back to
    the current page anchor a[data-page="4"], NEVER lands on the now
    aria-disabled num-next and NEVER escapes to <body>.

Run:
    python tests/visual-rtl/run-focus-return.py
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


async def active_desc(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const a = document.activeElement;
            if (!a || a === document.body) return { id: null, tag: 'BODY', testid: null, page: null };
            return {
                id: a.id || null,
                tag: a.tagName,
                testid: a.getAttribute && a.getAttribute('data-testid'),
                page: a.dataset && a.dataset.page || null,
                ariaDisabled: a.getAttribute && a.getAttribute('aria-disabled'),
            };
        }"""
    )


# ---------- records ----------

async def scenario_records(page: Page) -> None:
    # (1) select keeps focus across perPage change + re-render
    await page.locator("#records-per-page").focus()
    await page.locator("#records-per-page").select_option("20")
    a = await active_desc(page)
    assert a["id"] == "records-per-page", f"select lost focus after resize: {a}"

    # (2) records-next keeps focus across a click (interior page)
    await page.locator("#records-per-page").select_option("10")
    # go to interior page 2 (of 5), keeping the next button enabled after +1 more
    await page.locator("#records-prev").focus()  # neutral start
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("Home")
    # focus next, then click; expect page advance while focus stays on next
    await page.locator("#records-next").focus()
    counter_before = await page.locator("#records-counter").text_content()
    await page.locator("#records-next").click()
    counter_after = await page.locator("#records-counter").text_content()
    assert counter_before != counter_after, "click did not advance page"
    a = await active_desc(page)
    assert a["id"] == "records-next", f"records-next lost focus after click: {a}"

    # (3) records-prev keeps focus across live-resize that keeps current page valid.
    # Now on page 2 of 5 (43 records / 10). Resize to 100 records → 10 pages,
    # page 2 stays valid, prev stays enabled.
    await page.locator("#records-prev").focus()
    await page.evaluate("() => window.__resizeData('records', 100)")
    a = await active_desc(page)
    assert a["id"] == "records-prev", f"records-prev lost focus after resize: {a}"


# ---------- numbered ----------

async def scenario_numbered(page: Page) -> None:
    # Start from a clean state on page 1 / 5 (default TOTAL=5)
    await page.evaluate("() => window.__resizeNumbered(5)")
    await page.locator('#numbered-list a[data-page="1"]').click()

    # (1) clicking page 3 keeps focus on the fresh page-3 anchor
    await page.locator('#numbered-list a[data-page="3"]').click()
    a = await active_desc(page)
    assert a["page"] == "3", f"click on page 3 did not retain focus: {a}"

    # (2) focus page 4, grow total → focus returns to page 4
    await page.locator('#numbered-list a[data-page="4"]').focus()
    await page.evaluate("() => window.__resizeNumbered(20)")
    a = await active_desc(page)
    assert a["page"] == "4", f"focus lost after grow-resize: {a}"

    # (3) shrink back to a range where page 4 still exists, then jump to
    # page 1 and click num-next → focus stays on num-next (fresh node).
    await page.evaluate("() => window.__resizeNumbered(5)")
    await page.locator('#numbered-list a[data-page="1"]').click()
    await page.locator('[data-testid="num-next"]').focus()
    await page.locator('[data-testid="num-next"]').click()
    a = await active_desc(page)
    assert a["testid"] == "num-next", f"num-next focus lost after click: {a}"
    assert a["ariaDisabled"] != "true", f"focus landed on disabled num-next: {a}"

    # (4) at page 3, focus num-prev, shrink total to 3 (page 3 becomes last,
    # num-next flips disabled but num-prev stays enabled) → focus on num-prev
    await page.locator('#numbered-list a[data-page="3"]').click()
    await page.locator('[data-testid="num-prev"]').focus()
    await page.evaluate("() => window.__resizeNumbered(3)")
    a = await active_desc(page)
    assert a["testid"] == "num-prev", f"num-prev focus lost after shrink: {a}"
    assert a["ariaDisabled"] != "true", f"num-prev unexpectedly disabled: {a}"

    # (5) boundary fallback: at page 4 of 5, focus num-next then shrink total
    # to 4. Current page clamps to 4 (=last), num-next flips disabled.
    # Focus MUST fall back to the current page anchor — never lands on the
    # now-disabled num-next, never escapes to <body>.
    await page.evaluate("() => window.__resizeNumbered(5)")
    await page.locator('#numbered-list a[data-page="4"]').click()
    await page.locator('[data-testid="num-next"]').focus()
    await page.evaluate("() => window.__resizeNumbered(4)")
    a = await active_desc(page)
    assert a["tag"] != "BODY", f"focus escaped to <body> at boundary: {a}"
    assert a["testid"] != "num-next" or a["ariaDisabled"] != "true", (
        f"focus stayed on now-disabled num-next: {a}"
    )
    # Accepted fallback: current page anchor (data-page == "4")
    assert a["page"] == "4", f"focus did not fall back to current page anchor: {a}"


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
        ("records focus-return", scenario_records),
        ("numbered focus-return", scenario_numbered),
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
                    path=str(CAPTURE / f"fail_focus_return_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll focus-return assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
