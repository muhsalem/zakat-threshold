"""
Focus & Tab/Shift+Tab order remain logical AFTER live total/records changes,
and the disabled boundary buttons are never focus targets.

Uses the fixture hook `window.__resizeData(name, n)` (added for run-live-resize.py)
to change dataset size without a reload, so we can verify the pager DOM
mutations don't leave stale tab stops behind.

Records pager (RTL, uses native `<button disabled>` which browsers skip
during Tab traversal):
  R1. Grow to multi-page while on page 3: prev+next enabled →
      focus select, Tab → prev → next; Shift+Tab back reverses.
  R2. Shrink so current page clamps to last: prev enabled, next disabled →
      Tab from select lands on prev; next MUST be skipped; Shift+Tab from
      prev returns to select.
  R3. Shrink to single page: both disabled →
      Tab from select exits the pager; Shift+Tab likewise skips both.
  R4. Shrink to zero, then grow back to 30 rows: state restored, Tab
      lands on next (prev disabled at page 1), Shift+Tab returns to select
      skipping disabled prev.

Numbered pager (RTL, `<a>` links with `tabindex=-1` on disabled boundary):
  N1. On any page, focusing the `[aria-current="page"]` link succeeds and
      that element IS document.activeElement AND still matches the
      aria-current selector after focus (no state churn).
  N2. On page 1 (prev disabled/tabindex=-1): Tab-walk from page-1 link
      visits every enabled page then next, and NEVER lands on prev.
  N3. On page 5 (next disabled/tabindex=-1): Tab-walk from prev visits
      pages 1..5, and NEVER lands on next.

Run:
    python tests/visual-rtl/run-focus-after-resize.py
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


async def active(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const el = document.activeElement;
            if (!el || el === document.body) return { id: null, tag: 'body', disabled: false };
            return {
                id: el.id || null,
                tag: el.tagName,
                testid: el.getAttribute('data-testid'),
                dataPage: el.getAttribute('data-page'),
                ariaCurrent: el.getAttribute('aria-current'),
                disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
                tabindex: el.getAttribute('tabindex'),
            };
        }"""
    )


async def counter(page: Page, prefix: str) -> str:
    return (await page.locator(f'[data-testid="{prefix}-counter"]').inner_text()).strip()


async def press_tab(page: Page, shift: bool = False) -> dict:
    await page.keyboard.press("Shift+Tab" if shift else "Tab")
    info = await active(page)
    assert not info["disabled"], f"Tab landed on a disabled element: {info}"
    return info


async def go_to_page_records(page: Page, target: int) -> None:
    pager = page.locator('[data-testid="records-pager"]')
    await pager.focus()
    await page.keyboard.press("Home")
    for _ in range(target - 1):
        await page.locator("#records-next").click()


# ---------- records scenarios ----------

async def scenario_r1_grow_multi(page: Page) -> None:
    await go_to_page_records(page, 3)
    assert (await counter(page, "records")) == "3 / 5"
    await resize(page, "records", 120)
    assert (await counter(page, "records")) == "3 / 12"

    await page.locator("#records-per-page").focus()
    info = await press_tab(page)
    assert info["id"] == "records-prev", f"R1 select→prev got {info}"
    info = await press_tab(page)
    assert info["id"] == "records-next", f"R1 prev→next got {info}"

    # Shift+Tab reverses
    await page.locator("#records-next").focus()
    info = await press_tab(page, shift=True)
    assert info["id"] == "records-prev", f"R1 next←prev got {info}"
    info = await press_tab(page, shift=True)
    assert info["id"] == "records-per-page", f"R1 prev←select got {info}"


async def scenario_r2_shrink_clamps_last(page: Page) -> None:
    # start at 5/5, shrink to 25 rows → clamps to 3/3, next disabled
    await go_to_page_records(page, 5)
    assert (await counter(page, "records")) == "5 / 5"
    await resize(page, "records", 25)
    assert (await counter(page, "records")) == "3 / 3"
    assert await page.locator("#records-next").is_disabled()
    assert not await page.locator("#records-prev").is_disabled()

    await page.locator("#records-per-page").focus()
    info = await press_tab(page)
    assert info["id"] == "records-prev", f"R2 select→prev got {info}"
    # next MUST be skipped: pressing Tab again should NOT land on it
    info = await press_tab(page)
    assert info["id"] != "records-next", f"R2 Tab landed on disabled next: {info}"

    # Shift+Tab from prev returns to select (does not visit disabled next)
    await page.locator("#records-prev").focus()
    info = await press_tab(page, shift=True)
    assert info["id"] == "records-per-page", f"R2 prev←select got {info}"


async def scenario_r3_shrink_single(page: Page) -> None:
    await resize(page, "records", 5)
    assert (await counter(page, "records")) == "1 / 1"
    assert await page.locator("#records-prev").is_disabled()
    assert await page.locator("#records-next").is_disabled()

    await page.locator("#records-per-page").focus()
    info = await press_tab(page)
    assert info["id"] not in ("records-prev", "records-next"), \
        f"R3 Tab hit disabled boundary: {info}"

    await page.locator("#records-per-page").focus()
    info = await press_tab(page, shift=True)
    assert info["id"] not in ("records-prev", "records-next"), \
        f"R3 Shift+Tab hit disabled boundary: {info}"


async def scenario_r4_zero_then_grow(page: Page) -> None:
    await resize(page, "records", 0)
    assert (await counter(page, "records")) == "1 / 1"
    await resize(page, "records", 30)
    assert (await counter(page, "records")) == "1 / 3"
    assert await page.locator("#records-prev").is_disabled()
    assert not await page.locator("#records-next").is_disabled()

    await page.locator("#records-per-page").focus()
    info = await press_tab(page)
    assert info["id"] == "records-next", f"R4 select→next (skips disabled prev) got {info}"
    info = await press_tab(page, shift=True)
    assert info["id"] == "records-per-page", f"R4 next←select got {info}"


# ---------- numbered scenarios ----------

async def scenario_n1_current_focus(page: Page) -> None:
    # Click page 3 then verify focusing the aria-current link works and
    # the focused element IS the one matching [aria-current="page"].
    await page.locator('#numbered-list a[data-page="3"]').click()
    await page.locator('#numbered-list a[aria-current="page"]').focus()
    info = await active(page)
    assert info["dataPage"] == "3", f"N1 focused page={info!r}"
    assert info["ariaCurrent"] == "page", f"N1 focused aria-current={info['ariaCurrent']!r}"

    # And that same node still matches the selector after focus
    matches = await page.evaluate(
        """() => document.activeElement.matches('#numbered-list a[aria-current="page"]')"""
    )
    assert matches, "N1 activeElement no longer matches aria-current selector"


async def walk_tab_ids(page: Page, max_steps: int) -> list[str]:
    order = []
    for _ in range(max_steps):
        await page.keyboard.press("Tab")
        info = await active(page)
        tid = info["testid"] or (f"p{info['dataPage']}" if info["dataPage"] else None)
        if not tid:
            break
        order.append(tid)
        if info["testid"] == "num-next":
            break
    return order


async def scenario_n2_page1_skips_prev(page: Page) -> None:
    # Reset to page 1
    await page.locator('#numbered-list a[data-page="1"]').click()
    # Verify prev is really disabled + tabindex=-1
    prev_ti = await page.locator('[data-testid="num-prev"]').get_attribute("tabindex")
    assert prev_ti == "-1", f"N2 prev tabindex expected -1, got {prev_ti!r}"

    # Seed focus on page-1 link and walk Tab
    await page.locator('#numbered-list a[data-page="1"]').focus()
    order = await walk_tab_ids(page, 10)
    assert "num-prev" not in order, f"N2 Tab hit disabled num-prev: {order}"
    # Must reach every remaining page and end at num-next
    for expected in ("p2", "p3", "p4", "p5", "num-next"):
        assert expected in order, f"N2 missing {expected} in {order}"


async def scenario_n3_page5_skips_next(page: Page) -> None:
    # Jump to last page
    await page.locator('#numbered-list a[data-page="5"]').click()
    next_ti = await page.locator('[data-testid="num-next"]').get_attribute("tabindex")
    assert next_ti == "-1", f"N3 next tabindex expected -1, got {next_ti!r}"

    # Seed focus on num-prev (now enabled) and walk Tab
    await page.locator('[data-testid="num-prev"]').focus()
    info = await active(page)
    assert info["testid"] == "num-prev", info

    order = []
    for _ in range(10):
        await page.keyboard.press("Tab")
        info = await active(page)
        tid = info["testid"] or (f"p{info['dataPage']}" if info["dataPage"] else None)
        if not tid:
            break
        order.append(tid)
    assert "num-next" not in order, f"N3 Tab hit disabled num-next: {order}"
    for expected in ("p1", "p2", "p3", "p4", "p5"):
        assert expected in order, f"N3 missing {expected} in {order}"


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
        ("R1 grow→multi",          scenario_r1_grow_multi),
        ("R2 shrink clamps last",  scenario_r2_shrink_clamps_last),
        ("R3 shrink→single",       scenario_r3_shrink_single),
        ("R4 zero→grow",           scenario_r4_zero_then_grow),
        ("N1 aria-current focus",  scenario_n1_current_focus),
        ("N2 page1 skips prev",    scenario_n2_page1_skips_prev),
        ("N3 page5 skips next",    scenario_n3_page5_skips_next),
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
                    path=str(CAPTURE / f"fail_focus_resize_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll focus-after-resize assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
