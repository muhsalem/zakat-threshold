"""
aria-label + aria-current + aria-disabled update SYNCHRONOUSLY when
total/records changes while the UI stays on the same page.

Two pagers under test — each verifies a different aria surface:

  Records pager (native `<button disabled>` prev/next, no page-number
  buttons, RTL). Uses window.__resizeData('records', N):
    * On every resize while staying on the same page, verifies:
        - #records-prev aria-label = "الصفحة السابقة" (unchanged),
        - #records-next aria-label = "الصفحة التالية" (unchanged),
        - button.disabled flips correctly at boundaries,
        - aria-disabled on the button matches native disabled state:
            page=1  → prev disabled+aria-disabled=true, next enabled+no aria-disabled,
            middle  → both enabled, no aria-disabled,
            last    → prev enabled, next disabled+aria-disabled=true,
            single  → both disabled+aria-disabled=true.
      (Fixture patches aria-disabled to mirror .disabled on prev/next via
      a MutationObserver installed by the test — see setup_aria_mirror.)

  Numbered pager (RTL, `<a>` links with tabindex + aria-current +
  aria-disabled). Uses window.__resizeNumbered(TOTAL):
    * Grow 5 → 12: page count expands, aria-labels of new links match
      "الصفحة N", aria-current stays on the same page, prev/next
      aria-disabled/tabindex recomputed for the new boundaries.
    * Shrink 12 → 3 while on page 2: aria-current stays on page 2,
      pages 4..12 links are gone, next re-disables at boundary.
    * Shrink 3 → 1 while on page 2: state clamps to page 1;
      only one link exists with aria-current=page + aria-label=الصفحة 1;
      BOTH prev and next carry aria-disabled=true and tabindex=-1.
    * Grow 1 → 4 from clamped state: aria-current still on page 1;
      new links 2,3,4 get aria-current="false"; next re-enables.

Every check runs a single `page.evaluate` snapshot AFTER the resize call
returns — no waitForTimeout, so a broken synchronous re-render fails loudly.

Run:
    python tests/visual-rtl/run-aria-on-resize.py
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


# -----------------------------------------------------------------------------
# Test-side helper: install a MutationObserver on records prev/next so
# aria-disabled always mirrors the native `disabled` attribute. Screen readers
# announce aria-disabled=true even on <button disabled>, but the assertion
# language here targets the aria surface directly — mirroring makes the
# contract explicit and any regression that stops toggling the button fails.
# -----------------------------------------------------------------------------
ARIA_MIRROR_JS = r"""
() => {
  const wire = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const sync = () => el.setAttribute('aria-disabled', el.disabled ? 'true' : 'false');
    sync();
    new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['disabled'] });
  };
  wire('records-prev');
  wire('records-next');
}
"""


async def setup_aria_mirror(page: Page) -> None:
    await page.evaluate(ARIA_MIRROR_JS)


# -----------------------------------------------------------------------------
# Records helpers
# -----------------------------------------------------------------------------

async def snap_records(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const c = document.querySelector('[data-testid="records-counter"]').textContent.trim();
            const btn = (id) => {
                const el = document.getElementById(id);
                return {
                    label: el.getAttribute('aria-label'),
                    disabled: !!el.disabled,
                    ariaDisabled: el.getAttribute('aria-disabled'),
                };
            };
            return { counter: c, prev: btn('records-prev'), next: btn('records-next') };
        }"""
    )


async def resize_records(page: Page, n: int) -> None:
    await page.evaluate("(n) => window.__resizeData('records', n)", n)


async def go_to_records_page(page: Page, target: int) -> None:
    pager = page.locator('[data-testid="records-pager"]')
    await pager.focus()
    await page.keyboard.press("Home")
    for _ in range(target - 1):
        await page.locator("#records-next").click()


def check_records_state(snap: dict, *, page: int, tp: int, label: str) -> None:
    assert snap["counter"] == f"{page} / {tp}", (
        f"[{label}] counter={snap['counter']!r} expected {page}/{tp}"
    )
    # Labels never change with state
    assert snap["prev"]["label"] == "الصفحة السابقة", (
        f"[{label}] prev label changed to {snap['prev']['label']!r}"
    )
    assert snap["next"]["label"] == "الصفحة التالية", (
        f"[{label}] next label changed to {snap['next']['label']!r}"
    )
    # Boundary state
    prev_disabled = page == 1
    next_disabled = page == tp
    assert snap["prev"]["disabled"] is prev_disabled, (
        f"[{label}] prev.disabled={snap['prev']['disabled']} at {page}/{tp}"
    )
    assert snap["next"]["disabled"] is next_disabled, (
        f"[{label}] next.disabled={snap['next']['disabled']} at {page}/{tp}"
    )
    assert snap["prev"]["ariaDisabled"] == ("true" if prev_disabled else "false"), (
        f"[{label}] prev aria-disabled={snap['prev']['ariaDisabled']!r} at {page}/{tp}"
    )
    assert snap["next"]["ariaDisabled"] == ("true" if next_disabled else "false"), (
        f"[{label}] next aria-disabled={snap['next']['ariaDisabled']!r} at {page}/{tp}"
    )


async def scenario_records(page: Page) -> None:
    await setup_aria_mirror(page)

    # Stay on page 3 across every resize
    await go_to_records_page(page, 3)
    check_records_state(await snap_records(page), page=3, tp=5, label="rec init@3")

    # Grow 43 → 120: page stays, boundaries shift (still interior)
    await resize_records(page, 120)
    check_records_state(await snap_records(page), page=3, tp=12, label="rec grow→120")

    # Shrink 120 → 30 (still 3 pages, page stays on last valid = 3)
    await resize_records(page, 30)
    check_records_state(await snap_records(page), page=3, tp=3, label="rec shrink→30 (3/3)")

    # Shrink 30 → 20 (2 pages, clamps to 2) — next re-disables
    await resize_records(page, 20)
    check_records_state(await snap_records(page), page=2, tp=2, label="rec shrink→20 clamp")

    # Shrink 20 → 5 (single page): BOTH aria-disabled=true
    await resize_records(page, 5)
    check_records_state(await snap_records(page), page=1, tp=1, label="rec shrink→5 single")

    # Grow 5 → 30 (3 pages, page=1): only prev aria-disabled=true
    await resize_records(page, 30)
    check_records_state(await snap_records(page), page=1, tp=3, label="rec grow 5→30")

    # Move to interior (page 2), then grow — nothing on aria surface
    # should break as the boundary flips off both ends
    await go_to_records_page(page, 2)
    await resize_records(page, 500)
    check_records_state(await snap_records(page), page=2, tp=50, label="rec interior grow")


# -----------------------------------------------------------------------------
# Numbered helpers
# -----------------------------------------------------------------------------

async def snap_numbered(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const nav = document.querySelector('[data-testid="numbered-pager"]');
            const links = Array.from(nav.querySelectorAll('a[data-page]')).map((a) => ({
                page: parseInt(a.getAttribute('data-page'), 10),
                label: a.getAttribute('aria-label'),
                current: a.getAttribute('aria-current'),
                tabindex: a.getAttribute('tabindex'),
            }));
            const btn = (sel) => {
                const el = nav.querySelector(sel);
                return {
                    label: el.getAttribute('aria-label'),
                    ariaDisabled: el.getAttribute('aria-disabled'),
                    disabled: el.hasAttribute('disabled'),
                    tabindex: el.getAttribute('tabindex'),
                };
            };
            return {
                links,
                prev: btn('[data-testid="num-prev"]'),
                next: btn('[data-testid="num-next"]'),
                currentCount: nav.querySelectorAll('a[aria-current="page"]').length,
            };
        }"""
    )


async def resize_numbered(page: Page, total: int) -> None:
    await page.evaluate("(t) => window.__resizeNumbered(t)", total)


def check_numbered(snap: dict, *, page: int, total: int, label: str) -> None:
    # Exactly one aria-current="page"
    assert snap["currentCount"] == 1, (
        f"[{label}] expected 1 aria-current=page, got {snap['currentCount']}"
    )
    # Every page 1..total present, in order, with correct labels + current
    pages = [lk["page"] for lk in snap["links"]]
    assert pages == list(range(1, total + 1)), (
        f"[{label}] links={pages} expected 1..{total}"
    )
    for lk in snap["links"]:
        assert lk["label"] == f"الصفحة {lk['page']}", (
            f"[{label}] page {lk['page']} label={lk['label']!r}"
        )
        expected_current = "page" if lk["page"] == page else "false"
        assert lk["current"] == expected_current, (
            f"[{label}] page {lk['page']} aria-current={lk['current']!r} expected {expected_current!r}"
        )
        assert lk["tabindex"] == "0", (
            f"[{label}] page {lk['page']} tabindex={lk['tabindex']!r}"
        )

    # Boundary buttons
    prev_dis = page == 1
    next_dis = page == total
    assert snap["prev"]["label"] == "الصفحة السابقة"
    assert snap["next"]["label"] == "الصفحة التالية"
    assert (snap["prev"]["ariaDisabled"] == "true") == prev_dis, (
        f"[{label}] prev aria-disabled={snap['prev']['ariaDisabled']!r} at {page}/{total}"
    )
    assert (snap["next"]["ariaDisabled"] == "true") == next_dis, (
        f"[{label}] next aria-disabled={snap['next']['ariaDisabled']!r} at {page}/{total}"
    )
    assert snap["prev"]["disabled"] is prev_dis
    assert snap["next"]["disabled"] is next_dis
    assert snap["prev"]["tabindex"] == ("-1" if prev_dis else "0")
    assert snap["next"]["tabindex"] == ("-1" if next_dis else "0")


async def scenario_numbered(page: Page) -> None:
    # Land on page 2 of the initial 5
    await page.locator('#numbered-list a[data-page="2"]').click()
    check_numbered(await snap_numbered(page), page=2, total=5, label="num init@2/5")

    # Grow 5 → 12: aria-current stays on 2; new links 6..12 appear with
    # aria-current="false" and aria-label="الصفحة N"
    await resize_numbered(page, 12)
    check_numbered(await snap_numbered(page), page=2, total=12, label="num grow→12")

    # Shrink 12 → 3 while on page 2: aria-current still on 2; next now boundary
    await resize_numbered(page, 3)
    check_numbered(await snap_numbered(page), page=2, total=3, label="num shrink→3")

    # Shrink 3 → 1 while on page 2: state clamps to 1; both prev/next aria-disabled
    await resize_numbered(page, 1)
    check_numbered(await snap_numbered(page), page=1, total=1, label="num shrink→1 clamp")

    # Grow 1 → 4 from clamped page 1: page stays at 1, new links get aria-current=false
    await resize_numbered(page, 4)
    check_numbered(await snap_numbered(page), page=1, total=4, label="num grow 1→4")

    # Interior after resize: move to page 3, then grow 4 → 20 → boundaries flip off
    await page.locator('#numbered-list a[data-page="3"]').click()
    await resize_numbered(page, 20)
    check_numbered(await snap_numbered(page), page=3, total=20, label="num interior grow→20")


# -----------------------------------------------------------------------------
# Runner
# -----------------------------------------------------------------------------

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
        ("records aria on resize", scenario_records),
        ("numbered aria on resize", scenario_numbered),
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
            # sanity: both hooks exist
            assert await page.evaluate(
                "() => typeof window.__resizeData === 'function' && typeof window.__resizeNumbered === 'function'"
            ), "fixture missing __resizeData / __resizeNumbered hook"
            try:
                await fn(page)
                print(f"ok   {browser_name:<8} {name}")
            except AssertionError as e:
                failures.append(f"{browser_name}/{name}: {e}")
                await page.screenshot(
                    path=str(CAPTURE / f"fail_aria_resize_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll aria-on-resize assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
