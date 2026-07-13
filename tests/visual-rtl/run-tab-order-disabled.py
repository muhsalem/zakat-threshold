"""
Tab order across the pager surface after live total/records changes must:

  * NEVER stop on a disabled control:
      - records prev/next use native <button disabled> — browsers skip
        it automatically, but a stale tabindex or aria-disabled attribute
        left behind by a re-render can still trap focus. We verify no
        Tab stop has `disabled` set or `aria-disabled="true"`.
      - numbered num-prev / num-next at a boundary carry
        `aria-disabled="true" disabled tabindex="-1"` — Tab MUST skip
        them entirely.
  * NEVER skip an ENABLED control that lives in the pager. We compute
    the expected focusable set from the live DOM (elements without
    `disabled`, without `aria-disabled="true"`, with `tabindex` >= 0
    or naturally tabbable) and assert the Tab walk visits exactly
    those elements in document order.

Scenarios (each runs the full walk for records + numbered pagers):
  * baseline (records=43 / TOTAL=5, page 1)
  * records grow 120  (page 1 stays valid — prev disabled, next enabled)
  * records interior  (page 3 of 5 — both prev + next enabled)
  * records clamp to last page (next flips disabled mid-life)
  * records empty 0  (1/1 — both prev + next disabled)
  * numbered grow 20 (page 3 — both anchors enabled, 20 page links)
  * numbered clamp 2 (page clamps to 2 = last — num-next disabled)
  * numbered single 1 (only page anchor visible — both prev/next disabled)

Both Tab (forward) and Shift+Tab (backward) traversals are checked.

Run:
    python tests/visual-rtl/run-tab-order-disabled.py
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


# ---------- helpers ----------

INSTALL_SENTINELS = """() => {
    // Idempotent: install a focusable sentinel <button> immediately
    // before AND after every pager <nav> so we can enter Tab traversal
    // from a known point outside the pager and detect the moment focus
    // leaves it. Buttons are visually inert (opacity 0, no size) but
    // remain in the accessibility tree / focus order.
    const style = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
    document.querySelectorAll('nav.pager, [data-testid$="pager"]').forEach((nav) => {
        const key = nav.getAttribute('data-testid') || 'pager';
        if (!nav.previousElementSibling || nav.previousElementSibling.dataset.sentinel !== `before-${key}`) {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.sentinel = `before-${key}`;
            b.setAttribute('aria-hidden', 'false');
            b.textContent = `>${key}<`;
            b.style.cssText = style;
            nav.parentNode.insertBefore(b, nav);
        }
        if (!nav.nextElementSibling || nav.nextElementSibling.dataset.sentinel !== `after-${key}`) {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.sentinel = `after-${key}`;
            b.textContent = `<${key}>`;
            b.style.cssText = style;
            nav.parentNode.insertBefore(b, nav.nextSibling);
        }
    });
}"""


def _stable_key_js() -> str:
    return """
        function keyOf(el) {
            if (!el) return null;
            if (el.id) return `#${el.id}`;
            const t = el.getAttribute && el.getAttribute('data-testid');
            if (t) return `[data-testid=${t}]`;
            const p = el.dataset && el.dataset.page;
            if (p) return `[data-page=${p}]`;
            const s = el.dataset && el.dataset.sentinel;
            if (s) return `[sentinel=${s}]`;
            return el.tagName;
        }
    """


async def expected_focusables(page: Page, nav_selector: str) -> list[str]:
    return await page.evaluate(
        f"""(sel) => {{
            {_stable_key_js()}
            const nav = document.querySelector(sel);
            if (!nav) return [];
            const cand = nav.querySelectorAll('a, button, select, input, [tabindex]');
            const out = [];
            // The nav container itself may carry tabindex="0" (records pager).
            const navTi = nav.getAttribute('tabindex');
            if (navTi !== null && parseInt(navTi, 10) >= 0) out.push(keyOf(nav));
            for (const el of cand) {{
                if (el === nav) continue;
                if (el.hasAttribute && el.hasAttribute('disabled')) continue;
                if (el.getAttribute && el.getAttribute('aria-disabled') === 'true') continue;
                const ti = el.getAttribute && el.getAttribute('tabindex');
                if (ti !== null && parseInt(ti, 10) < 0) continue;
                out.push(keyOf(el));
            }}
            return out;
        }}""",
        nav_selector,
    )


async def active_desc(page: Page) -> dict:
    return await page.evaluate(
        _stable_key_js() + """
        () => {
            const a = document.activeElement;
            if (!a || a === document.body) return { key: null, tag: 'BODY', ariaDisabled: null, disabled: false, inNav: null };
            const nav = a.closest && a.closest('nav.pager, [data-testid$="pager"]');
            return {
                key: keyOf(a),
                tag: a.tagName,
                ariaDisabled: a.getAttribute && a.getAttribute('aria-disabled'),
                disabled: a.hasAttribute && a.hasAttribute('disabled'),
                inNav: nav ? (nav.getAttribute('data-testid') || 'pager') : null,
            };
        }
        """
    )


async def walk_tab(page: Page, nav_testid: str, direction: str, max_steps: int = 60) -> list[dict]:
    """
    Enter the given pager from its sentinel and press Tab (or Shift+Tab)
    until focus leaves the pager. Returns the ordered list of focus
    descriptors observed INSIDE the nav (sentinels excluded).
    """
    assert direction in ("Tab", "Shift+Tab")
    entry_sel = (
        f'[data-sentinel="before-{nav_testid}"]'
        if direction == "Tab"
        else f'[data-sentinel="after-{nav_testid}"]'
    )
    await page.locator(entry_sel).focus()
    stops: list[dict] = []
    for _ in range(max_steps):
        await page.keyboard.press(direction)
        info = await active_desc(page)
        if info["inNav"] != nav_testid:
            # exited the pager
            break
        stops.append(info)
    else:
        raise AssertionError(f"Tab walk in {nav_testid} did not exit after {max_steps} steps")
    return stops


def _assert_no_disabled_stops(stops: list[dict], nav: str, direction: str) -> None:
    for i, s in enumerate(stops):
        assert s["ariaDisabled"] != "true", (
            f"[{nav}/{direction}] stop #{i} landed on aria-disabled: {s}"
        )
        assert not s["disabled"], (
            f"[{nav}/{direction}] stop #{i} landed on disabled: {s}"
        )


def _assert_sequence(actual: list[dict], expected: list[str], nav: str, direction: str) -> None:
    got = [s["key"] for s in actual]
    if direction == "Shift+Tab":
        expected = list(reversed(expected))
    assert got == expected, (
        f"[{nav}/{direction}] tab order mismatch\n"
        f"  expected: {expected}\n"
        f"  got:      {got}"
    )


async def verify_pager(page: Page, nav_testid: str, label: str) -> None:
    sel = f'[data-testid="{nav_testid}"]'
    expected = await expected_focusables(page, sel)

    for direction in ("Tab", "Shift+Tab"):
        stops = await walk_tab(page, nav_testid, direction)
        _assert_no_disabled_stops(stops, nav_testid, direction)
        _assert_sequence(stops, expected, nav_testid, direction)
    print(f"    ok  {nav_testid:<24} [{label}]  ({len(expected)} stops)")


# ---------- scenarios ----------

async def scenario_records(page: Page) -> None:
    # baseline: records=43, page 1  → prev disabled
    await page.locator("#records-per-page").select_option("10")
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("Home")
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "records-pager", "records baseline page 1/5")

    # interior: page 3 of 5 → both enabled
    await page.locator("#records-next").click()
    await page.locator("#records-next").click()
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "records-pager", "records interior page 3/5")

    # grow while interior: 120 records / 10 = 12 pages, page 3 valid → both enabled
    await page.evaluate("() => window.__resizeData('records', 120)")
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "records-pager", "records grow 120 page 3/12")

    # clamp: shrink so page 3 becomes last → next flips disabled mid-life
    await page.evaluate("() => window.__resizeData('records', 22)")  # 3 pages, page 3 = last
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "records-pager", "records clamp last page 3/3")

    # empty: both disabled, only the select + nav container remain tabbable
    await page.evaluate("() => window.__resizeData('records', 0)")
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "records-pager", "records empty 1/1")

    # restore and go to page 1
    await page.evaluate("() => window.__resizeData('records', 43)")
    await page.locator('[data-testid="records-pager"]').focus()
    await page.keyboard.press("Home")
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "records-pager", "records restore page 1/5")


async def scenario_numbered(page: Page) -> None:
    await page.evaluate("() => window.__resizeNumbered(5)")
    await page.locator('#numbered-list a[data-page="1"]').click()
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "numbered-pager", "numbered baseline page 1/5")

    # page 3 of 5 → both prev + next enabled
    await page.locator('#numbered-list a[data-page="3"]').click()
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "numbered-pager", "numbered interior page 3/5")

    # grow to 20 pages, still on page 3 → both enabled, 20 page links
    await page.evaluate("() => window.__resizeNumbered(20)")
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "numbered-pager", "numbered grow 20 page 3/20")

    # clamp: shrink to 2 → page clamps to 2 = last, num-next disabled
    await page.evaluate("() => window.__resizeNumbered(2)")
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "numbered-pager", "numbered clamp last page 2/2")

    # single page: both prev + next disabled
    await page.evaluate("() => window.__resizeNumbered(1)")
    await page.evaluate(INSTALL_SENTINELS)
    await verify_pager(page, "numbered-pager", "numbered single 1/1")


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
        ("records tab order", scenario_records),
        ("numbered tab order", scenario_numbered),
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
                print(f"  {name}")
                await fn(page)
                print(f"ok   {browser_name:<8} {name}")
            except AssertionError as e:
                failures.append(f"{browser_name}/{name}: {e}")
                await page.screenshot(
                    path=str(CAPTURE / f"fail_tab_order_{browser_name}_{name.split()[0]}.png")
                )
            await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll tab-order-vs-disabled assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
