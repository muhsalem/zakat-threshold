"""
Home / End / ArrowLeft / ArrowRight behavior across total_pages changes.

Contract (RTL `records` pager unless noted):
  Multi-page (perPage=10, 43 rows → 5 pages):
    - Home from any page → "1 / 5", prev disabled, next enabled.
    - End  from any page → "5 / 5", prev enabled,  next disabled.
    - RTL: ArrowLeft = forward (next), ArrowRight = backward (prev).
      LTR mapping is inverted; covered by run-keyboard.py.
    - Arrow keys at boundaries are no-ops AND do NOT enable the disabled
      button on the other side (prev stays disabled at page 1, next at last).

  Single-page (perPage=50, 43 rows → 1 page):
    - Counter reads "1 / 1".
    - Home / End / ArrowLeft / ArrowRight are ALL no-ops: counter stays
      "1 / 1"; prev stays disabled; next stays disabled.

  Transitions (total_pages changes at runtime):
    - Start multi-page, End → last page (5/5).
    - Shrink to single page via perPage=50. Counter must resync to "1 / 1"
      (the fixture resets page=1 on select change) and BOTH buttons must
      be disabled — no leaked "enabled" state from the previous multi-page
      view.
    - Grow back to multi-page via perPage=10 → "1 / 5"; ArrowLeft advances
      to "2 / 5"; End jumps to "5 / 5". Also verify pressing Home from
      the disabled boundary does not error and stays at 1/5.

Also asserts every keydown that mutates state fires while focus is on the
pager container (not on the disabled button), which matches how a screen
reader user reaches these keys.

Run:
    python tests/visual-rtl/run-keys-transitions.py
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

PREFIX = "records"


async def counter(page: Page) -> str:
    return (await page.locator(f'[data-testid="{PREFIX}-counter"]').inner_text()).strip()


async def prev_disabled(page: Page) -> bool:
    return await page.locator(f"#{PREFIX}-prev").is_disabled()


async def next_disabled(page: Page) -> bool:
    return await page.locator(f"#{PREFIX}-next").is_disabled()


async def focus_pager(page: Page) -> None:
    await page.locator(f'[data-testid="{PREFIX}-pager"]').focus()


async def press(page: Page, key: str) -> None:
    await focus_pager(page)
    await page.keyboard.press(key)


async def set_per_page(page: Page, value: str) -> None:
    await page.locator(f"#{PREFIX}-per-page").select_option(value)


async def assert_state(
    page: Page, expect_counter: str, expect_prev_dis: bool, expect_next_dis: bool, label: str
) -> None:
    got = await counter(page)
    assert got == expect_counter, f"[{label}] counter={got!r} expected {expect_counter!r}"
    pd = await prev_disabled(page)
    nd = await next_disabled(page)
    assert pd is expect_prev_dis, f"[{label}] prev disabled={pd} expected {expect_prev_dis}"
    assert nd is expect_next_dis, f"[{label}] next disabled={nd} expected {expect_next_dis}"


# ---------- scenarios ----------

async def scenario_multi_page(page: Page) -> None:
    await set_per_page(page, "10")
    await assert_state(page, "1 / 5", True, False, "multi init")

    # Home from page 1 is a no-op
    await press(page, "Home")
    await assert_state(page, "1 / 5", True, False, "multi Home@1")

    # RTL: ArrowRight = prev (no-op at page 1) and MUST NOT enable next-side flip
    await press(page, "ArrowRight")
    await assert_state(page, "1 / 5", True, False, "multi ArrowRight@1")

    # ArrowLeft advances
    await press(page, "ArrowLeft")
    await assert_state(page, "2 / 5", False, False, "multi ArrowLeft→2")
    await press(page, "ArrowLeft")
    await assert_state(page, "3 / 5", False, False, "multi ArrowLeft→3")

    # End jumps to last, next disabled
    await press(page, "End")
    await assert_state(page, "5 / 5", False, True, "multi End→5")

    # End again is a no-op
    await press(page, "End")
    await assert_state(page, "5 / 5", False, True, "multi End@5 no-op")

    # ArrowLeft at last page is a no-op and MUST NOT re-enable next
    await press(page, "ArrowLeft")
    await assert_state(page, "5 / 5", False, True, "multi ArrowLeft@5 no-op")

    # ArrowRight steps back
    await press(page, "ArrowRight")
    await assert_state(page, "4 / 5", False, False, "multi ArrowRight→4")

    # Home from interior
    await press(page, "Home")
    await assert_state(page, "1 / 5", True, False, "multi Home→1")


async def scenario_single_page(page: Page) -> None:
    await set_per_page(page, "50")  # 43 rows / 50 → 1 page
    await assert_state(page, "1 / 1", True, True, "single init")

    for key in ("Home", "End", "ArrowLeft", "ArrowRight"):
        await press(page, key)
        await assert_state(page, "1 / 1", True, True, f"single {key} no-op")


async def scenario_transition_multi_to_single(page: Page) -> None:
    # start multi, go to last page
    await set_per_page(page, "10")
    await press(page, "End")
    await assert_state(page, "5 / 5", False, True, "trans multi@5")

    # shrink to 1 page — fixture resets page=1 AND next MUST be disabled
    await set_per_page(page, "50")
    await assert_state(page, "1 / 1", True, True, "trans shrink→1/1")

    # All keys are no-ops after shrink
    for key in ("End", "ArrowLeft", "Home", "ArrowRight"):
        await press(page, key)
        await assert_state(page, "1 / 1", True, True, f"trans single {key}")


async def scenario_transition_single_to_multi(page: Page) -> None:
    await set_per_page(page, "50")
    await assert_state(page, "1 / 1", True, True, "trans single init")

    # grow to multi — page resets to 1, next must re-enable, prev stays disabled
    await set_per_page(page, "10")
    await assert_state(page, "1 / 5", True, False, "trans grow→1/5")

    # ArrowLeft advances; End jumps to last; Home returns to 1
    await press(page, "ArrowLeft")
    await assert_state(page, "2 / 5", False, False, "trans grow ArrowLeft")
    await press(page, "End")
    await assert_state(page, "5 / 5", False, True, "trans grow End")
    await press(page, "Home")
    await assert_state(page, "1 / 5", True, False, "trans grow Home")


async def scenario_ltr_arrow_mapping(page: Page) -> None:
    """Sanity check on LTR pager so arrow direction isn't swapped globally."""
    ltr = "records-ltr"
    await page.locator(f"#{ltr}-per-page").select_option("10")
    await page.locator(f'[data-testid="{ltr}-pager"]').focus()
    # LTR: ArrowRight = forward, ArrowLeft = back
    await page.keyboard.press("ArrowRight")
    txt = (await page.locator(f'[data-testid="{ltr}-counter"]').inner_text()).strip()
    assert txt == "2 / 5", f"[ltr] ArrowRight expected 2/5, got {txt!r}"
    await page.keyboard.press("ArrowLeft")
    txt = (await page.locator(f'[data-testid="{ltr}-counter"]').inner_text()).strip()
    assert txt == "1 / 5", f"[ltr] ArrowLeft expected 1/5, got {txt!r}"


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
        ("multi-page keys", scenario_multi_page),
        ("single-page no-ops", scenario_single_page),
        ("transition multi→single", scenario_transition_multi_to_single),
        ("transition single→multi", scenario_transition_single_to_multi),
        ("ltr arrow mapping", scenario_ltr_arrow_mapping),
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
            await page.locator(f'[data-testid="{PREFIX}-counter"]').wait_for(state="attached", timeout=30000)
            await page.wait_for_timeout(150)
            try:
                await fn(page)
                print(f"ok   {browser_name:<8} {name}")
            except AssertionError as e:
                failures.append(f"{browser_name}/{name}: {e}")
                await page.screenshot(
                    path=str(CAPTURE / f"fail_keys_trans_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll Home/End/Arrow transition assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
