"""
Keyboard activation (Enter / Space) on a disabled prev/next MUST NOT
change page or state, at any point during a total/records mutation
storm.

Records pager (native <button disabled>):
  * `.focus()` on a disabled <button> is a no-op in every browser —
    focus does not stick. That alone blocks Enter/Space activation
    (the key event goes to the previously-focused element or <body>).
    We assert `document.activeElement` is NOT the disabled button
    after a focus attempt.
  * We then dispatch Enter and Space via `page.keyboard.press` and
    verify counter + prev/next state are unchanged.

Numbered pager (<a role=button aria-disabled=true disabled tabindex=-1>):
  * Anchors CAN be programmatically focused even with tabindex=-1,
    so keyboard activation is a real risk if the JS click handler
    is fired by an Enter/Space keydown listener. The fixture wires
    ONLY the `click` event with an internal `state.page` guard, so
    Enter/Space on a role=button anchor must be a no-op. We assert
    aria-current, currentPage and body text are unchanged.

Each scenario runs 10 resize rounds and checks post-conditions after
every Enter/Space press.

Run:
    python tests/visual-rtl/run-key-activation-disabled.py
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
                activeId: document.activeElement && document.activeElement.id || null,
            };
        }"""
    )


async def try_focus(page: Page, sel: str) -> None:
    # Try focus but ignore Playwright's strict wait — disabled <button>
    # rejects focus in every browser; we WANT that to happen and observe
    # the resulting activeElement.
    await page.evaluate(f"(s) => {{ const el = document.querySelector(s); el && el.focus && el.focus(); }}", sel)


async def scenario_records(page: Page) -> None:
    # Case A: page 1 → prev disabled after every resize
    await page.locator("#records-per-page").select_option("10")
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("Home")

    for i, n in enumerate([120, 43, 15, 100, 43, 22, 43, 60, 43, 43]):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        # Ensure we're on page 1
        await page.locator('[data-testid="records-pager"]').focus()
        await page.keyboard.press("Home")

        before = await snap_records(page)
        assert before["page"] == 1 and before["prevDisabled"] is True, (
            f"[records@1 #{i} N={n}] pre-check failed: {before}"
        )

        await try_focus(page, "#records-prev")
        after_focus = await snap_records(page)
        assert after_focus["activeId"] != "records-prev", (
            f"[records@1 #{i} N={n}] focus stuck on disabled prev: {after_focus}"
        )

        for key in ("Enter", " "):
            await page.keyboard.press(key)
            after = await snap_records(page)
            assert after["counter"] == before["counter"], (
                f"[records@1 #{i} N={n}] {key!r} on disabled prev changed counter: "
                f"{before['counter']!r} → {after['counter']!r}"
            )
            assert after["prevDisabled"] is True and after["nextDisabled"] == before["nextDisabled"], (
                f"[records@1 #{i} N={n}] {key!r} flipped attrs: {after}"
            )

    # Case B: last page → next disabled after every resize
    await page.evaluate("() => window.__resizeData('records', 43)")
    for i, n in enumerate([50, 43, 45, 43, 60, 43, 50, 40, 43, 43]):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        await page.locator('[data-testid="records-pager"]').focus()
        await page.keyboard.press("End")

        before = await snap_records(page)
        assert before["page"] == before["total"] and before["nextDisabled"] is True, (
            f"[records@last #{i} N={n}] pre-check failed: {before}"
        )

        await try_focus(page, "#records-next")
        after_focus = await snap_records(page)
        assert after_focus["activeId"] != "records-next", (
            f"[records@last #{i} N={n}] focus stuck on disabled next: {after_focus}"
        )

        for key in ("Enter", " "):
            await page.keyboard.press(key)
            after = await snap_records(page)
            assert after["counter"] == before["counter"], (
                f"[records@last #{i} N={n}] {key!r} on disabled next changed counter: "
                f"{before['counter']!r} → {after['counter']!r}"
            )

    # Case C: empty / single page — BOTH disabled, hammer both
    for i, n in enumerate([0, 1, 0, 5, 0, 10, 0, 0]):
        await page.evaluate("(n) => window.__resizeData('records', n)", n)
        before = await snap_records(page)
        assert before["prevDisabled"] and before["nextDisabled"], (
            f"[records single #{i} N={n}] both should be disabled: {before}"
        )
        for target in ("#records-prev", "#records-next"):
            await try_focus(page, target)
            for key in ("Enter", " "):
                await page.keyboard.press(key)
        after = await snap_records(page)
        assert after["counter"] == before["counter"], (
            f"[records single #{i} N={n}] key storm changed counter: {before} → {after}"
        )
        assert after["prevDisabled"] and after["nextDisabled"], (
            f"[records single #{i} N={n}] attrs flipped after key storm: {after}"
        )


# ---------- numbered ----------

async def snap_numbered(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const nav = document.querySelector('[data-testid="numbered-pager"]');
            const currents = nav.querySelectorAll('a[aria-current="page"]');
            const body = document.getElementById('numbered-body').textContent.trim();
            const bm = body.match(/(\\d+)/);
            const prev = nav.querySelector('[data-testid="num-prev"]');
            const next = nav.querySelector('[data-testid="num-next"]');
            return {
                currentCount: currents.length,
                currentPage: currents[0] ? parseInt(currents[0].getAttribute('data-page'), 10) : null,
                bodyPage: bm ? parseInt(bm[1], 10) : null,
                total: nav.querySelectorAll('a[data-page]').length,
                prevAriaDisabled: prev.getAttribute('aria-disabled'),
                nextAriaDisabled: next.getAttribute('aria-disabled'),
                prevTabindex: prev.getAttribute('tabindex'),
                nextTabindex: next.getAttribute('tabindex'),
                activeTestid: document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-testid'),
            };
        }"""
    )


def strip_focus(s: dict) -> dict:
    return {k: v for k, v in s.items() if k != "activeTestid"}


async def scenario_numbered(page: Page) -> None:
    # Case A: page 1, num-prev disabled across resizes
    for i, t in enumerate([5, 20, 5, 3, 12, 5, 2, 8, 5, 5]):
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        await page.locator('#numbered-list a[data-page="1"]').click()

        before = await snap_numbered(page)
        assert before["currentPage"] == 1 and before["prevAriaDisabled"] == "true", (
            f"[num@1 #{i} T={t}] pre-check failed: {before}"
        )

        # Anchors are programmatically focusable even with tabindex=-1
        await page.locator('[data-testid="num-prev"]').focus()
        for key in ("Enter", " "):
            await page.keyboard.press(key)
            after = await snap_numbered(page)
            assert strip_focus(after) == strip_focus(before), (
                f"[num@1 #{i} T={t}] {key!r} on disabled num-prev changed state: "
                f"{before} → {after}"
            )

    # Case B: last page, num-next disabled across resizes
    for i, t in enumerate([5, 8, 5, 3, 12, 4, 20, 2, 6, 5]):
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        current_total = await page.evaluate(
            "() => document.querySelectorAll('[data-testid=\"numbered-pager\"] a[data-page]').length"
        )
        await page.locator(f'#numbered-list a[data-page="{current_total}"]').click()

        before = await snap_numbered(page)
        assert before["currentPage"] == before["total"] and before["nextAriaDisabled"] == "true", (
            f"[num@last #{i} T={t}] pre-check failed: {before}"
        )

        await page.locator('[data-testid="num-next"]').focus()
        for key in ("Enter", " "):
            await page.keyboard.press(key)
            after = await snap_numbered(page)
            assert strip_focus(after) == strip_focus(before), (
                f"[num@last #{i} T={t}] {key!r} on disabled num-next changed state: "
                f"{before} → {after}"
            )

    # Case C: single-page — both disabled, hammer both with Enter/Space
    for i in range(8):
        await page.evaluate("() => window.__resizeNumbered(1)")
        before = await snap_numbered(page)
        assert before["currentPage"] == 1 and before["total"] == 1
        assert before["prevAriaDisabled"] == "true" and before["nextAriaDisabled"] == "true"

        for target in ('[data-testid="num-prev"]', '[data-testid="num-next"]'):
            await page.locator(target).focus()
            for key in ("Enter", " "):
                await page.keyboard.press(key)
        after = await snap_numbered(page)
        assert strip_focus(after) == strip_focus(before), (
            f"[num single #{i}] key storm changed state: {before} → {after}"
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
        ("records key-activation", scenario_records),
        ("numbered key-activation", scenario_numbered),
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
                    path=str(CAPTURE / f"fail_key_act_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll Enter/Space-on-disabled assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
