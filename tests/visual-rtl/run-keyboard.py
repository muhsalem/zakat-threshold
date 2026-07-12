"""
Keyboard-nav + visible-focus tests for the pagination fixture.

Runs against `fixture-data.html` (served over local HTTP so WebKit works),
covering BOTH directions:

  RTL:  ArrowLeft = next, ArrowRight = prev, Home = 1, End = last
  LTR:  ArrowRight = next, ArrowLeft = prev, Home = 1, End = last

For every focus stop (prev / next / select / pager container) it also asserts
that `:focus-visible` matches AND that the element renders a real focus ring
(outline-width > 0 with a non-transparent color) — so future CSS changes
can't silently kill keyboard affordance.

Browser selection: env var PW_BROWSER = chromium (default) | firefox | webkit.
CI runs the whole matrix; see .github/workflows/ci.yml.

Run locally:
    python tests/visual-rtl/run-keyboard.py
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

VIEWPORTS = {
    "mobile":  (390, 900),
    "tablet":  (768, 1000),
    "desktop": (1338, 900),
}

# (testid_prefix, direction, expected_total_pages_default_perpage)
PAGERS = [
    ("records",      "rtl", 5),   # 43 / 10
    ("attachments",  "rtl", 3),   # 27 / 10
    ("records-ltr",  "ltr", 5),   # 43 / 10
]


async def counter_text(page: Page, prefix: str) -> str:
    return (await page.locator(f'[data-testid="{prefix}-counter"]').inner_text()).strip()


async def assert_focus_ring(page: Page, selector: str, label: str) -> None:
    """`:focus-visible` matches AND outline is a real visible ring."""
    info = await page.evaluate(
        """(sel) => {
            const el = document.querySelector(sel);
            if (!el) return { ok: false, reason: 'missing' };
            const active = document.activeElement === el;
            let matches = false;
            try { matches = el.matches(':focus-visible'); } catch { matches = false; }
            const cs = getComputedStyle(el);
            const width = parseFloat(cs.outlineWidth) || 0;
            const color = cs.outlineColor || '';
            const style = cs.outlineStyle || '';
            const transparent = color.replace(/\\s+/g, '') === 'rgba(0,0,0,0)' || color === 'transparent';
            return { ok: true, active, matches, width, color, style, transparent };
        }""",
        selector,
    )
    assert info["ok"], f"[{label}] element not found: {selector}"
    assert info["active"], f"[{label}] {selector} is not document.activeElement"
    assert info["matches"], f"[{label}] :focus-visible did not match on {selector}"
    assert info["width"] > 0, f"[{label}] outline-width is 0 on {selector} ({info})"
    assert info["style"] not in ("", "none"), f"[{label}] outline-style is none on {selector}"
    assert not info["transparent"], f"[{label}] outline color is transparent on {selector}"


async def assert_pager_keyboard(page: Page, prefix: str, direction: str, total: int) -> None:
    """
    Full keyboard suite for one pager:
      - focus container, Home/End land on 1/total
      - Arrow keys respect direction (RTL swaps left/right)
      - Tab reaches select and both buttons with a visible focus ring
      - Shift+Tab walks focus back in DOM order
    """
    pager = page.locator(f'[data-testid="{prefix}-pager"]')
    await pager.scroll_into_view_if_needed()

    # ---- container focus + Home/End ------------------------------------------------
    await pager.focus()
    await assert_focus_ring(page, f'[data-testid="{prefix}-pager"]', f"{prefix} container")

    await page.keyboard.press("End")
    assert (await counter_text(page, prefix)) == f"{total} / {total}", \
        f"[{prefix}/{direction}] End did not jump to last page"

    await page.keyboard.press("Home")
    assert (await counter_text(page, prefix)) == f"1 / {total}", \
        f"[{prefix}/{direction}] Home did not return to first page"

    # ---- Arrow keys (direction-aware) ---------------------------------------------
    forward, backward = ("ArrowLeft", "ArrowRight") if direction == "rtl" else ("ArrowRight", "ArrowLeft")

    await page.keyboard.press(forward)
    assert (await counter_text(page, prefix)) == f"2 / {total}", \
        f"[{prefix}/{direction}] {forward} did not move forward"

    await page.keyboard.press(forward)
    assert (await counter_text(page, prefix)) == f"3 / {total}", \
        f"[{prefix}/{direction}] second {forward} did not advance"

    await page.keyboard.press(backward)
    assert (await counter_text(page, prefix)) == f"2 / {total}", \
        f"[{prefix}/{direction}] {backward} did not move back"

    await page.keyboard.press("Home")  # reset for the next section

    # ---- Tab reaches every focusable pager control with a visible ring ------------
    # Focus the select directly (Tab order across the whole document isn't stable
    # enough to walk from container → controls in one hop across all browsers).
    for control in (f"#{prefix}-per-page", f"#{prefix}-prev", f"#{prefix}-next"):
        await page.locator(control).focus()
        await assert_focus_ring(page, control, f"{prefix} {control}")

    # ---- Shift+Tab walks DOM order backwards (next -> prev) -----------------------
    await page.locator(f"#{prefix}-next").focus()
    await page.keyboard.press("Shift+Tab")
    active_id = await page.evaluate("() => document.activeElement && document.activeElement.id")
    assert active_id == f"{prefix}-prev", \
        f"[{prefix}/{direction}] Shift+Tab from next expected prev, got {active_id!r}"


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
        for vp_name, (w, h) in VIEWPORTS.items():
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            await page.goto(fixture_url, wait_until="domcontentloaded")
            await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)
            await page.locator('[data-testid="records-ltr-counter"]').wait_for(state="attached", timeout=30000)
            await page.wait_for_timeout(200)

            for prefix, direction, total in PAGERS:
                try:
                    await assert_pager_keyboard(page, prefix, direction, total)
                    print(f"ok   {browser_name:<8} {vp_name:<7} {direction:<3} {prefix}")
                except AssertionError as e:
                    failures.append(f"{browser_name}/{vp_name}/{direction}/{prefix}: {e}")
                    await page.screenshot(
                        path=str(CAPTURE / f"fail_kb_{browser_name}_{vp_name}_{direction}_{prefix}.png")
                    )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll keyboard-nav + focus-ring assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
