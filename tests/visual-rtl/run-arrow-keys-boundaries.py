"""
Arrow-key navigation inside the pager must:

  * Change the page ONLY when the direction's boundary control
    (prev / next) is enabled.
  * Silently no-op at the boundary — never advance past 1, never
    past totalPages, never mutate prev/next attrs, never move focus
    away from the pager container.
  * Home / End must jump to the first / last valid page and settle
    with the correct boundary control disabled.
  * Respect direction: in RTL, ArrowLeft = next, ArrowRight = prev.
    In LTR, ArrowLeft = prev, ArrowRight = next.

Coverage matrix (records RTL + records LTR):
  * baseline (43 records / 10 = 5 pages, at page 1)
  * grow 120  (12 pages, at page 1 → interior after ArrowLeft in RTL)
  * shrink 15 (2 pages, walk to boundary each way)
  * empty 0   (1 page, all arrows are no-op)
  * restore 43

Numbered pager has NO arrow-key handler by design — we verify that
arrows there are a no-op (page never changes, aria-current stable)
after resizes, to confirm we don't accidentally introduce a rogue
handler that could bypass boundary guards.

Run:
    python tests/visual-rtl/run-arrow-keys-boundaries.py
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


# ---------- generic snapshot for a records-style pager ----------

SNAP_JS = """(cfg) => {
    const nav = document.querySelector(cfg.nav);
    const counter = document.querySelector(cfg.counter).textContent.trim();
    const m = counter.match(/^(\\d+)\\s*\\/\\s*(\\d+)$/);
    const prev = document.getElementById(cfg.prev);
    const next = document.getElementById(cfg.next);
    return {
        counter,
        page: m ? parseInt(m[1], 10) : null,
        total: m ? parseInt(m[2], 10) : null,
        prevDisabled: prev.disabled,
        nextDisabled: next.disabled,
        prevAriaDisabled: prev.getAttribute('aria-disabled'),
        nextAriaDisabled: next.getAttribute('aria-disabled'),
        activeInNav: !!(document.activeElement && nav.contains(document.activeElement)),
    };
}"""


PAGERS = {
    "rtl": {
        "nav": '[data-testid="records-pager"]',
        "counter": '[data-testid="records-counter"]',
        "prev": "records-prev",
        "next": "records-next",
        "select": "#records-per-page",
        # In RTL, ArrowLeft moves forward, ArrowRight moves backward.
        "forward_key": "ArrowLeft",
        "back_key": "ArrowRight",
    },
    "ltr": {
        "nav": '[data-testid="records-ltr-pager"]',
        "counter": '[data-testid="records-ltr-counter"]',
        "prev": "records-ltr-prev",
        "next": "records-ltr-next",
        "select": "#records-ltr-per-page",
        "forward_key": "ArrowRight",
        "back_key": "ArrowLeft",
    },
}


async def snap(page: Page, cfg: dict) -> dict:
    return await page.evaluate(SNAP_JS, cfg)


async def go_home(page: Page, cfg: dict) -> None:
    await page.locator(cfg["nav"]).focus()
    await page.keyboard.press("Home")


async def go_end(page: Page, cfg: dict) -> None:
    await page.locator(cfg["nav"]).focus()
    await page.keyboard.press("End")


def check_state_shape(s: dict, where: str) -> None:
    assert s["page"] is not None, f"[{where}] counter unparseable: {s}"
    assert 1 <= s["page"] <= s["total"], f"[{where}] page out of [1..{s['total']}]: {s}"
    assert (s["page"] == 1) == s["prevDisabled"], f"[{where}] prev.disabled mismatch: {s}"
    assert (s["page"] == s["total"]) == s["nextDisabled"], f"[{where}] next.disabled mismatch: {s}"


async def verify_boundaries(page: Page, name: str, cfg: dict, resize_records: int) -> None:
    # Restore dataset for both RTL and LTR pagers (they share RECORDS array
    # only in that the RTL section drives records/attachments; LTR pager
    # reads the same RECORDS array too via pager({data: RECORDS, ...})).
    await page.evaluate("(n) => window.__resizeData('records', n)", resize_records)

    # ---- At page 1 (prev disabled) ----
    await go_home(page, cfg)
    before = await snap(page, cfg)
    assert before["page"] == 1
    check_state_shape(before, f"{name} home baseline (N={resize_records})")

    # back_key must be a silent no-op at page 1
    await page.keyboard.press(cfg["back_key"])
    after = await snap(page, cfg)
    assert after == before, (
        f"[{name} page 1] {cfg['back_key']!r} mutated state: {before} → {after}"
    )
    assert after["activeInNav"], f"[{name} page 1] focus escaped nav after no-op arrow: {after}"

    # forward_key advances only if totalPages > 1
    await page.keyboard.press(cfg["forward_key"])
    after_fwd = await snap(page, cfg)
    if before["total"] == 1:
        assert after_fwd == before, (
            f"[{name} single page] {cfg['forward_key']!r} mutated state: {before} → {after_fwd}"
        )
    else:
        assert after_fwd["page"] == 2, (
            f"[{name} page 1→2] {cfg['forward_key']!r} did not advance: {after_fwd}"
        )
        assert after_fwd["prevDisabled"] is False and (
            after_fwd["nextDisabled"] is False or after_fwd["total"] == 2
        )

    # ---- At last page (next disabled) ----
    await go_end(page, cfg)
    last = await snap(page, cfg)
    assert last["page"] == last["total"]
    check_state_shape(last, f"{name} end (N={resize_records})")

    await page.keyboard.press(cfg["forward_key"])
    after_last = await snap(page, cfg)
    assert after_last == last, (
        f"[{name} last page] {cfg['forward_key']!r} mutated state: {last} → {after_last}"
    )
    assert after_last["activeInNav"], (
        f"[{name} last page] focus escaped nav after no-op arrow: {after_last}"
    )

    # back_key retreats only if totalPages > 1
    await page.keyboard.press(cfg["back_key"])
    after_back = await snap(page, cfg)
    if last["total"] == 1:
        assert after_back == last, (
            f"[{name} single page] {cfg['back_key']!r} mutated state: {last} → {after_back}"
        )
    else:
        assert after_back["page"] == last["total"] - 1, (
            f"[{name} last→last-1] {cfg['back_key']!r} did not retreat: {after_back}"
        )


async def scenario_records_pager(page: Page, side: str) -> None:
    cfg = PAGERS[side]
    # Set perPage = 10 so 43 records → 5 pages, giving room for interior + boundary
    await page.locator(cfg["select"]).select_option("10")

    for n in [43, 120, 15, 0, 43]:
        await verify_boundaries(page, f"{side}@N={n}", cfg, n)

    # Interior grind: at page 3 of 12 (after grow), both arrows change state
    await page.evaluate("() => window.__resizeData('records', 120)")
    await go_home(page, cfg)
    for _ in range(2):
        await page.keyboard.press(cfg["forward_key"])  # page 3
    interior = await snap(page, cfg)
    assert interior["page"] == 3 and interior["total"] == 12
    check_state_shape(interior, f"{side} interior page 3/12")

    await page.keyboard.press(cfg["forward_key"])
    s = await snap(page, cfg)
    assert s["page"] == 4, f"{side} interior forward failed: {s}"

    await page.keyboard.press(cfg["back_key"])
    s = await snap(page, cfg)
    assert s["page"] == 3, f"{side} interior back failed: {s}"


# ---------- numbered pager: arrows must be inert ----------

async def snap_numbered(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const nav = document.querySelector('[data-testid="numbered-pager"]');
            const cur = nav.querySelector('a[aria-current="page"]');
            return {
                currentPage: cur ? parseInt(cur.getAttribute('data-page'), 10) : null,
                bodyText: document.getElementById('numbered-body').textContent.trim(),
                total: nav.querySelectorAll('a[data-page]').length,
                prevAriaDisabled: nav.querySelector('[data-testid="num-prev"]').getAttribute('aria-disabled'),
                nextAriaDisabled: nav.querySelector('[data-testid="num-next"]').getAttribute('aria-disabled'),
            };
        }"""
    )


async def scenario_numbered_inert_arrows(page: Page) -> None:
    for t in [5, 20, 3, 1, 8]:
        await page.evaluate("(t) => window.__resizeNumbered(t)", t)
        # Sit on page 1 or the last available page
        anchor_page = min(2, t)  # interior when possible, else 1
        await page.locator(f'#numbered-list a[data-page="{anchor_page}"]').click()

        before = await snap_numbered(page)
        # Fire every direction + Home/End on the nav — numbered pager has NO
        # keydown handler, so ALL of these must be no-ops.
        await page.locator('[data-testid="numbered-pager"]').focus()
        for key in ("ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"):
            await page.keyboard.press(key)
        after = await snap_numbered(page)
        assert after == before, (
            f"[numbered T={t} anchor={anchor_page}] arrow storm mutated state: {before} → {after}"
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
        ("records RTL arrow boundaries", lambda p: scenario_records_pager(p, "rtl")),
        ("records LTR arrow boundaries", lambda p: scenario_records_pager(p, "ltr")),
        ("numbered arrows are inert",    scenario_numbered_inert_arrows),
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
                    path=str(CAPTURE / f"fail_arrow_bounds_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll arrow-key boundary assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
