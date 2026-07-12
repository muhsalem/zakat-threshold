"""
RTL accessibility checks: Tab focus order + aria-current + aria-label
per pagination pattern.

Complements run-aria.py (attribute presence) and run-keyboard.py (arrow/Home/End
mechanics) by walking Tab focus through every pager as an assistive-tech user
would, and asserting:

  RTL pagers (records / attachments):
    - Tab order follows DOM order (select → prev → next), NOT visual order.
      This is the correct behavior in RTL: Tab must not "reverse" just because
      the layout is mirrored.
    - Every focus stop exposes a real aria-label attribute (SR announces it).
    - On page 2, Shift+Tab walks the same path backwards.

  Numbered pager (shadcn pattern):
    - Tab visits: prev → page-1 … page-N → next in DOM order.
    - Boundary links (`aria-disabled="true"`) are skipped (tabindex=-1).
    - Exactly one anchor carries `aria-current="page"` at any time; clicking
      another page moves aria-current AND its aria-label matches the page number
      (e.g. الصفحة 3).
    - prev/next keep their aria-label unchanged as the current page moves.

Browser via PW_BROWSER = chromium (default) | firefox | webkit.

Run:
    python tests/visual-rtl/run-a11y.py
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

# RTL pagers only (matches user's ask); LTR is covered by run-keyboard.py.
RTL_PAGERS = [
    ("records", 5),      # 43 / 10 default
    ("attachments", 3),  # 27 / 10 default
]


async def active_id(page: Page) -> str | None:
    return await page.evaluate("() => document.activeElement && document.activeElement.id || null")


async def active_testid(page: Page) -> str | None:
    return await page.evaluate(
        "() => document.activeElement && document.activeElement.getAttribute('data-testid')"
    )


async def active_data_page(page: Page) -> str | None:
    return await page.evaluate(
        "() => document.activeElement && document.activeElement.getAttribute('data-page')"
    )


async def press_tab_until(page: Page, matcher, max_steps: int = 40) -> bool:
    """Press Tab up to max_steps times until matcher(page) returns truthy."""
    for _ in range(max_steps):
        if await matcher(page):
            return True
        await page.keyboard.press("Tab")
    return await matcher(page)


async def assert_rtl_pager_tab_order(page: Page, prefix: str, total: int) -> None:
    section = page.locator(f'[data-testid="{prefix}-pager"]')
    await section.scroll_into_view_if_needed()

    # Seed focus on the select, then Tab MUST visit prev then next in DOM order,
    # regardless of RTL visual mirroring.
    select = page.locator(f"#{prefix}-per-page")
    await select.focus()
    assert (await active_id(page)) == f"{prefix}-per-page", \
        f"[{prefix}] focus did not land on select"

    # aria-label on select
    label = await select.get_attribute("aria-label")
    assert label and label.strip(), f"[{prefix}] select missing aria-label"

    # advance the page so prev is enabled (otherwise Tab may skip it if it's disabled)
    await page.locator(f'[data-testid="{prefix}-pager"]').focus()
    await page.keyboard.press("End" if total > 1 else "Home")
    await page.keyboard.press("Home")
    await page.locator(f"#{prefix}-next").click()  # → page 2, both buttons enabled

    await select.focus()
    await page.keyboard.press("Tab")
    assert (await active_id(page)) == f"{prefix}-prev", \
        f"[{prefix}] Tab from select expected prev, got {await active_id(page)!r}"
    prev_label = await page.locator(f"#{prefix}-prev").get_attribute("aria-label")
    assert prev_label and prev_label.strip(), f"[{prefix}] prev missing aria-label"

    await page.keyboard.press("Tab")
    assert (await active_id(page)) == f"{prefix}-next", \
        f"[{prefix}] Tab from prev expected next, got {await active_id(page)!r}"
    next_label = await page.locator(f"#{prefix}-next").get_attribute("aria-label")
    assert next_label and next_label.strip(), f"[{prefix}] next missing aria-label"

    # Shift+Tab reverses DOM order: next → prev → select
    await page.keyboard.press("Shift+Tab")
    assert (await active_id(page)) == f"{prefix}-prev"
    await page.keyboard.press("Shift+Tab")
    assert (await active_id(page)) == f"{prefix}-per-page", \
        f"[{prefix}] Shift+Tab did not return to select"

    # reset to page 1 for the next test
    await page.locator(f'[data-testid="{prefix}-pager"]').focus()
    await page.keyboard.press("Home")


async def assert_numbered_a11y(page: Page) -> None:
    nav = page.locator('[data-testid="numbered-pager"]')
    await nav.scroll_into_view_if_needed()

    # Exactly one aria-current="page" initially, on page 1
    current = page.locator('#numbered-list a[aria-current="page"]')
    assert (await current.count()) == 1, "numbered: must have exactly one aria-current=page"
    assert (await current.get_attribute("data-page")) == "1", "initial aria-current not on page 1"

    # Every numbered link has aria-label matching its page number ("الصفحة N")
    links = page.locator("#numbered-list a[data-page]")
    n = await links.count()
    assert n >= 5, f"numbered: expected ≥5 page links, got {n}"
    for i in range(n):
        el = links.nth(i)
        p = await el.get_attribute("data-page")
        aria = (await el.get_attribute("aria-label") or "").strip()
        assert aria == f"الصفحة {p}", f"numbered: page {p} aria-label={aria!r}"

    # prev/next aria-labels
    prev = page.locator('[data-testid="num-prev"]')
    next_ = page.locator('[data-testid="num-next"]')
    prev_label_before = await prev.get_attribute("aria-label")
    next_label_before = await next_.get_attribute("aria-label")
    assert prev_label_before == "الصفحة السابقة"
    assert next_label_before == "الصفحة التالية"

    # ---- Tab focus order: seed at prev sibling (numbered nav has no external anchor),
    # then walk Tab and record every focus stop's data-page / data-testid.
    # prev is disabled on page 1 (tabindex=-1) so it should be skipped.
    # Seed focus on the first enabled numbered link, then Tab through the pager.
    await page.locator('#numbered-list a[data-page="1"]').focus()
    order: list[str] = ["p1"]
    for _ in range(10):
        await page.keyboard.press("Tab")
        tid = await active_testid(page)
        dp = await active_data_page(page)
        if tid == "num-next":
            order.append("next")
            break
        if dp:
            order.append(f"p{dp}")
        else:
            # stepped outside the numbered nav → stop
            break

    # Expected: p1, p2, p3, p4, p5, next   (prev disabled → skipped)
    expected = ["p1", "p2", "p3", "p4", "p5", "next"]
    assert order == expected, f"numbered Tab order {order} != {expected}"

    # ---- Click page 3 → aria-current moves, aria-labels on prev/next unchanged
    await page.locator('#numbered-list a[data-page="3"]').click()
    current = page.locator('#numbered-list a[aria-current="page"]')
    assert (await current.count()) == 1
    assert (await current.get_attribute("data-page")) == "3", "aria-current did not move to page 3"

    # Other links should NOT have aria-current="page"
    others = await page.locator('#numbered-list a[data-page]:not([aria-current="page"])').count()
    assert others == n - 1, f"expected {n-1} non-current links, got {others}"

    # prev/next labels are stable regardless of state changes
    assert (await prev.get_attribute("aria-label")) == prev_label_before
    assert (await next_.get_attribute("aria-label")) == next_label_before

    # After moving off page 1, prev becomes enabled and re-enters tab order
    assert (await prev.get_attribute("aria-disabled")) != "true", \
        "num-prev should be enabled on page 3"
    assert (await prev.get_attribute("tabindex")) == "0", \
        "num-prev should be in tab order on page 3"


async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        print(f"Unknown PW_BROWSER={browser_name}; falling back to chromium.")
        browser_name = "chromium"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    fixture_url = f"http://127.0.0.1:{port}/fixture-data.html"

    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}  fixture: {fixture_url}")

        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        await page.goto(fixture_url, wait_until="domcontentloaded")
        await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)
        await page.wait_for_timeout(200)

        for prefix, total in RTL_PAGERS:
            try:
                await assert_rtl_pager_tab_order(page, prefix, total)
                print(f"ok   {browser_name:<8} rtl {prefix} tab-order+aria-label")
            except AssertionError as e:
                failures.append(f"{browser_name}/rtl/{prefix}: {e}")
                await page.screenshot(path=str(CAPTURE / f"fail_a11y_{browser_name}_{prefix}.png"))

        try:
            await assert_numbered_a11y(page)
            print(f"ok   {browser_name:<8} rtl numbered tab-order+aria-current+aria-label")
        except AssertionError as e:
            failures.append(f"{browser_name}/rtl/numbered: {e}")
            await page.screenshot(path=str(CAPTURE / f"fail_a11y_{browser_name}_numbered.png"))

        await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll RTL a11y (tab-order + aria-current + aria-label) assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
