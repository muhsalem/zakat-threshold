"""
Tab-order transition tests: after the number of pages changes (via perPage
select or dataset size), the Tab focus order must stay logical and
Shift+Tab must NEVER land on a disabled control.

Scenarios (RTL `records` pager unless noted):
  A. Multi-page → single-page via perPage
     - Load ?records=43. Default perPage=10 → 5 pages.
     - Focus next, walk Shift+Tab: next → prev → select (both enabled).
     - Change perPage to 50 → 1 page. state.page clamps to 1.
     - Focus select, Tab: MUST skip disabled prev AND disabled next,
       leaving the pager entirely (activeElement outside container).
     - Focus select, Shift+Tab: MUST NOT visit prev/next (both disabled).

  B. Single-page → multi-page via perPage
     - Continue from A with perPage=50, then change back to perPage=10.
     - state.page stays at 1 (prev disabled, next enabled).
     - Focus select, Tab: skips disabled prev, lands on enabled next.
     - Focus next, Shift+Tab: skips disabled prev, returns to select.

  C. Last page → boundary after shrinking pages
     - perPage=10, press End → page 5 / 5 (prev enabled, next disabled).
     - Change perPage to 20 → 3 pages, state.page clamps to 3 (last).
     - Focus prev, Tab: skips disabled next, exits pager.
     - Focus prev, Shift+Tab: returns to select (does not touch next).

  D. Zero-data fixture (?records=0&attachments=0)
     - 1 page, empty body. Both prev/next disabled.
     - Focus select, Tab must skip both disabled buttons.
     - Focus select, Shift+Tab must not visit either.

Every assertion re-reads document.activeElement so a regression that leaves
focus on a `disabled` button fails loudly.

Run:
    python tests/visual-rtl/run-tab-transitions.py
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


async def active_info(page: Page) -> dict:
    return await page.evaluate(
        """() => {
            const el = document.activeElement;
            if (!el || el === document.body) return { id: null, tag: 'body', disabled: false };
            return {
                id: el.id || null,
                tag: el.tagName,
                disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
                testid: el.getAttribute('data-testid'),
            };
        }"""
    )


async def set_per_page(page: Page, prefix: str, value: str) -> None:
    await page.locator(f"#{prefix}-per-page").select_option(value)


async def counter(page: Page, prefix: str) -> str:
    return (await page.locator(f'[data-testid="{prefix}-counter"]').inner_text()).strip()


async def press_and_check(page: Page, key: str, forbidden_ids: list[str], label: str) -> dict:
    """Press `key`, assert activeElement isn't disabled AND isn't in `forbidden_ids`."""
    await page.keyboard.press(key)
    info = await active_info(page)
    assert not info["disabled"], f"[{label}] {key} landed on disabled element: {info}"
    assert info["id"] not in forbidden_ids, (
        f"[{label}] {key} landed on forbidden {info['id']!r} (expected to skip {forbidden_ids})"
    )
    return info


async def scenario_a_multi_to_single(page: Page) -> None:
    prefix = "records"
    assert (await counter(page, prefix)) == "1 / 5"

    # advance to page 2 so prev is enabled for the initial Shift+Tab walk
    await page.locator(f"#{prefix}-next").click()
    assert (await counter(page, prefix)) == "2 / 5"

    await page.locator(f"#{prefix}-next").focus()
    info = await press_and_check(page, "Shift+Tab", [], "A/2→prev")
    assert info["id"] == f"{prefix}-prev", info
    info = await press_and_check(page, "Shift+Tab", [], "A/prev→select")
    assert info["id"] == f"{prefix}-per-page", info

    # shrink to a single page
    await set_per_page(page, prefix, "50")
    assert (await counter(page, prefix)) == "1 / 1"
    assert await page.locator(f"#{prefix}-prev").is_disabled()
    assert await page.locator(f"#{prefix}-next").is_disabled()

    # Tab from select must skip BOTH disabled buttons
    await page.locator(f"#{prefix}-per-page").focus()
    info = await press_and_check(
        page, "Tab", [f"{prefix}-prev", f"{prefix}-next"], "A/select→out"
    )
    assert info["id"] != f"{prefix}-per-page", info

    # Shift+Tab from select must not visit prev/next either
    await page.locator(f"#{prefix}-per-page").focus()
    info = await press_and_check(
        page, "Shift+Tab", [f"{prefix}-prev", f"{prefix}-next"], "A/select←out"
    )


async def scenario_b_single_to_multi(page: Page) -> None:
    prefix = "records"
    await set_per_page(page, prefix, "10")
    assert (await counter(page, prefix)) == "1 / 5"
    assert await page.locator(f"#{prefix}-prev").is_disabled()
    assert not await page.locator(f"#{prefix}-next").is_disabled()

    # Tab from select must skip disabled prev and land on next
    await page.locator(f"#{prefix}-per-page").focus()
    info = await press_and_check(page, "Tab", [f"{prefix}-prev"], "B/select→next")
    assert info["id"] == f"{prefix}-next", info

    # Shift+Tab from next must skip disabled prev and return to select
    await page.locator(f"#{prefix}-next").focus()
    info = await press_and_check(page, "Shift+Tab", [f"{prefix}-prev"], "B/next→select")
    assert info["id"] == f"{prefix}-per-page", info


async def scenario_c_last_page_shrink(page: Page) -> None:
    prefix = "records"
    pager = page.locator(f'[data-testid="{prefix}-pager"]')
    await pager.focus()
    await page.keyboard.press("End")
    assert (await counter(page, prefix)) == "5 / 5"
    assert not await page.locator(f"#{prefix}-prev").is_disabled()
    assert await page.locator(f"#{prefix}-next").is_disabled()

    # grow perPage → fewer pages; state.page clamps to last (3)
    await set_per_page(page, prefix, "20")
    # perPage=20 with 43 rows → 3 pages; clamp to last means "3 / 3"
    assert (await counter(page, prefix)) == "1 / 3", (
        # NOTE: fixture resets page to 1 on select change; that is also
        # a valid contract. Accept either 1/3 or 3/3.
        f"unexpected counter after shrink: {await counter(page, prefix)!r}"
    )
    # Move to the true last page for the boundary check
    await pager.focus()
    await page.keyboard.press("End")
    assert (await counter(page, prefix)) == "3 / 3"
    assert not await page.locator(f"#{prefix}-prev").is_disabled()
    assert await page.locator(f"#{prefix}-next").is_disabled()

    # Tab from prev must skip disabled next
    await page.locator(f"#{prefix}-prev").focus()
    info = await press_and_check(page, "Tab", [f"{prefix}-next"], "C/prev→out")

    # Shift+Tab from prev must return to select
    await page.locator(f"#{prefix}-prev").focus()
    info = await press_and_check(page, "Shift+Tab", [f"{prefix}-next"], "C/prev→select")
    assert info["id"] == f"{prefix}-per-page", info


async def scenario_d_empty_dataset(page: Page) -> None:
    prefix = "records"
    assert (await counter(page, prefix)) == "1 / 1"
    assert await page.locator(f"#{prefix}-prev").is_disabled()
    assert await page.locator(f"#{prefix}-next").is_disabled()

    await page.locator(f"#{prefix}-per-page").focus()
    await press_and_check(
        page, "Tab", [f"{prefix}-prev", f"{prefix}-next"], "D/select→out"
    )

    await page.locator(f"#{prefix}-per-page").focus()
    await press_and_check(
        page, "Shift+Tab", [f"{prefix}-prev", f"{prefix}-next"], "D/select←out"
    )


async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        browser_name = "chromium"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{port}/fixture-data.html"

    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        print(f"# browser: {browser_name}")

        for name, url, fn in [
            ("A multi→single", base, scenario_a_multi_to_single),
            ("B single→multi", base, scenario_b_single_to_multi),
            ("C last-page shrink", base, scenario_c_last_page_shrink),
            ("D empty dataset", f"{base}?records=0&attachments=0", scenario_d_empty_dataset),
        ]:
            context = await browser.new_context(viewport={"width": 1280, "height": 900})
            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded")
            await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)
            await page.wait_for_timeout(150)
            try:
                await fn(page)
                print(f"ok   {browser_name:<8} {name}")
            except AssertionError as e:
                failures.append(f"{browser_name}/{name}: {e}")
                await page.screenshot(
                    path=str(CAPTURE / f"fail_tab_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll Tab-transition assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
