"""
Clicking a disabled prev/next MUST be a total no-op:
  - counter / state.page unchanged,
  - tabindex on prev/next unchanged,
  - aria-disabled on prev/next unchanged,
  - document.activeElement unchanged (focus doesn't jump to the disabled control),
  - the OTHER (enabled) boundary button also doesn't have its state flipped
    as a side effect.

We test both pager flavors, because they use different "disabled" mechanics:

  Records pager (RTL):
    Native `<button disabled>`. Playwright refuses to click by default —
    we force-click to simulate a user firing the DOM event anyway (touch,
    stale event target, etc.) and make sure the handler stays inert.
    * Page 1  → prev disabled: force-click prev, verify no-op.
    * Last    → next disabled: force-click next, verify no-op.
    * Single  → both disabled: force-click each, verify no-op.

  Numbered pager (RTL):
    `<a aria-disabled="true" disabled>` — the disabled attr is inert on
    anchors, only the JS guard prevents movement, so this is where a
    regression is most likely to slip in.
    * Page 1 → num-prev disabled: click it (no force needed) → aria-current
      stays on page 1, tabindex on prev stays -1, focus does NOT jump onto
      the anchor.
    * Page 5 → num-next disabled: same, mirrored.

Every scenario captures a "before" snapshot (activeElement + tabindex +
aria-disabled + counter/current) and re-captures "after", then asserts
strict equality.

Run:
    python tests/visual-rtl/run-disabled-click-noop.py
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


# ---------- records ----------

async def snap_records(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const btn = (id) => {
                const el = document.getElementById(id);
                return {
                    disabled: !!el.disabled,
                    ariaDisabled: el.getAttribute('aria-disabled'),
                    tabindex: el.getAttribute('tabindex'),
                };
            };
            return {
                counter: document.querySelector('[data-testid="records-counter"]').textContent.trim(),
                prev: btn('records-prev'),
                next: btn('records-next'),
                activeId: document.activeElement && document.activeElement.id || null,
                activeTag: document.activeElement && document.activeElement.tagName || null,
            };
        }"""
    )


async def goto_records(page: Page, target: int) -> None:
    pager = page.locator('[data-testid="records-pager"]')
    await pager.focus()
    await page.keyboard.press("Home")
    for _ in range(target - 1):
        await page.locator("#records-next").click()


async def resize_records(page: Page, n: int) -> None:
    await page.evaluate("(n) => window.__resizeData('records', n)", n)


async def scenario_records_boundaries(page: Page) -> None:
    # ---- Page 1: prev disabled ----
    await goto_records(page, 1)
    # Move focus somewhere neutral so we can detect any jump
    await page.locator("#records-per-page").focus()
    before = await snap_records(page)
    assert before["counter"] == "1 / 5"
    assert before["prev"]["disabled"] is True
    assert before["activeId"] == "records-per-page"

    await page.locator("#records-prev").click(force=True)
    after = await snap_records(page)
    assert after == before, f"[records@1 prev] state changed: before={before} after={after}"

    # ---- Last page: next disabled ----
    await goto_records(page, 5)
    await page.locator("#records-per-page").focus()
    before = await snap_records(page)
    assert before["counter"] == "5 / 5"
    assert before["next"]["disabled"] is True
    assert before["activeId"] == "records-per-page"

    await page.locator("#records-next").click(force=True)
    after = await snap_records(page)
    assert after == before, f"[records@5 next] state changed: before={before} after={after}"

    # ---- Single page: both disabled ----
    await resize_records(page, 5)  # 5 rows / perPage=10 → 1 page
    await page.locator("#records-per-page").focus()
    before = await snap_records(page)
    assert before["counter"] == "1 / 1"
    assert before["prev"]["disabled"] and before["next"]["disabled"]

    await page.locator("#records-prev").click(force=True)
    mid = await snap_records(page)
    assert mid == before, f"[records single prev] state changed: {mid} != {before}"

    await page.locator("#records-next").click(force=True)
    after = await snap_records(page)
    assert after == before, f"[records single next] state changed: {after} != {before}"


# ---------- numbered ----------

async def snap_numbered(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const nav = document.querySelector('[data-testid="numbered-pager"]');
            const btn = (sel) => {
                const el = nav.querySelector(sel);
                return {
                    ariaDisabled: el.getAttribute('aria-disabled'),
                    disabled: el.hasAttribute('disabled'),
                    tabindex: el.getAttribute('tabindex'),
                    label: el.getAttribute('aria-label'),
                };
            };
            const current = nav.querySelector('a[aria-current="page"]');
            return {
                currentPage: current ? current.getAttribute('data-page') : null,
                currentCount: nav.querySelectorAll('a[aria-current="page"]').length,
                prev: btn('[data-testid="num-prev"]'),
                next: btn('[data-testid="num-next"]'),
                activeTestid: document.activeElement && document.activeElement.getAttribute('data-testid'),
                activeId: document.activeElement && document.activeElement.id || null,
                activeTag: document.activeElement && document.activeElement.tagName || null,
            };
        }"""
    )


async def scenario_numbered_boundaries(page: Page) -> None:
    # ---- Page 1: num-prev disabled ----
    await page.locator('#numbered-list a[data-page="1"]').click()
    # Move focus off the pager entirely to detect any unexpected jump
    await page.locator("#records-per-page").focus()
    before = await snap_numbered(page)
    assert before["currentPage"] == "1"
    assert before["prev"]["ariaDisabled"] == "true"
    assert before["prev"]["tabindex"] == "-1"
    assert before["activeId"] == "records-per-page"

    # Regular click — no `force`, since anchors accept clicks. Only the JS
    # handler guard prevents movement, which is exactly what we want to test.
    await page.locator('[data-testid="num-prev"]').click(force=True)
    after = await snap_numbered(page)
    assert after["currentPage"] == "1", f"[num@1 prev] currentPage moved: {after}"
    assert after["currentCount"] == 1
    assert after["prev"] == before["prev"], (
        f"[num@1 prev] prev attrs flipped: before={before['prev']} after={after['prev']}"
    )
    assert after["next"] == before["next"], (
        f"[num@1 prev] next attrs flipped as side-effect: before={before['next']} after={after['next']}"
    )
    assert after["activeTestid"] != "num-prev", (
        f"[num@1 prev] focus jumped onto disabled anchor: {after}"
    )

    # ---- Page 5: num-next disabled ----
    await page.locator('#numbered-list a[data-page="5"]').click()
    await page.locator("#records-per-page").focus()
    before = await snap_numbered(page)
    assert before["currentPage"] == "5"
    assert before["next"]["ariaDisabled"] == "true"
    assert before["next"]["tabindex"] == "-1"

    await page.locator('[data-testid="num-next"]').click(force=True)
    after = await snap_numbered(page)
    assert after["currentPage"] == "5", f"[num@5 next] currentPage moved: {after}"
    assert after["next"] == before["next"], (
        f"[num@5 next] next attrs flipped: before={before['next']} after={after['next']}"
    )
    assert after["prev"] == before["prev"], (
        f"[num@5 next] prev attrs flipped as side-effect: before={before['prev']} after={after['prev']}"
    )
    assert after["activeTestid"] != "num-next", (
        f"[num@5 next] focus jumped onto disabled anchor: {after}"
    )

    # Repeat the disabled click a few times to catch any state that leaks
    # only after multiple activations (e.g. counter, style, event-bubbling).
    await page.locator('#numbered-list a[data-page="1"]').click()
    await page.locator("#records-per-page").focus()
    before = await snap_numbered(page)
    for _ in range(5):
        await page.locator('[data-testid="num-prev"]').click(force=True)
    after = await snap_numbered(page)
    assert after == before, f"[num repeated disabled clicks] state drift: {after} != {before}"


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
        ("records disabled clicks", scenario_records_boundaries),
        ("numbered disabled clicks", scenario_numbered_boundaries),
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
                    path=str(CAPTURE / f"fail_dis_click_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll disabled-click no-op assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
