"""
ARIA / semantics checks for the pagination fixture.

Verifies that every pagination component is announced correctly by
assistive tech in BOTH RTL and LTR:

  <nav>         → role=navigation + non-empty aria-label
  Prev / Next   → accessible name + aria-disabled reflects disabled state
  Select        → non-empty accessible name (aria-label)
  Counter       → role=status + aria-live=polite + aria-atomic=true,
                  and its text updates after navigation (SR announces it)
  Numbered      → aria-current="page" on active link only, moves correctly,
                  disabled boundary link exposes aria-disabled="true",
                  every link has an accessible name
  Direction     → RTL sections carry dir="rtl" and lang="ar" on the section

Browser via PW_BROWSER = chromium (default) | firefox | webkit. CI matrix
runs all three; see .github/workflows/ci.yml.

Run locally:
    python tests/visual-rtl/run-aria.py
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

# (prefix, section_id, dir, expected_lang, expected_pages_at_default_perpage)
PAGERS = [
    ("records",      "records-rtl",     "rtl", "ar", 5),
    ("attachments",  "attachments-rtl", "rtl", "ar", 3),
    ("records-ltr",  "records-ltr",     "ltr", "en", 5),
]


async def accessible_name(page: Page, selector: str) -> str:
    """Return the accessible name Playwright computes for the element."""
    handle = await page.locator(selector).element_handle()
    if handle is None:
        return ""
    return await page.evaluate(
        """(el) => {
            if (!el) return '';
            // aria-labelledby wins, then aria-label, then text content, then title
            const labelledby = el.getAttribute('aria-labelledby');
            if (labelledby) {
                const parts = labelledby.split(/\\s+/).map(id => document.getElementById(id));
                return parts.filter(Boolean).map(n => n.textContent.trim()).join(' ').trim();
            }
            const aria = el.getAttribute('aria-label');
            if (aria) return aria.trim();
            const text = (el.textContent || '').trim();
            if (text) return text;
            return (el.getAttribute('title') || '').trim();
        }""",
        handle,
    )


async def assert_pager_aria(page: Page, prefix: str, section_id: str, direction: str, lang: str, total: int) -> None:
    section = page.locator(f"#{section_id}")
    nav = page.locator(f'[data-testid="{prefix}-pager"]')
    prev = page.locator(f"#{prefix}-prev")
    next_ = page.locator(f"#{prefix}-next")
    select = page.locator(f"#{prefix}-per-page")
    counter = page.locator(f'[data-testid="{prefix}-counter"]')

    # ---- section direction + lang -------------------------------------------------
    assert (await section.get_attribute("dir")) == direction, \
        f"[{prefix}] section dir expected {direction}"
    assert (await section.get_attribute("lang")) == lang, \
        f"[{prefix}] section lang expected {lang}"

    # ---- <nav> role + aria-label --------------------------------------------------
    tag = (await nav.evaluate("el => el.tagName.toLowerCase()"))
    assert tag == "nav", f"[{prefix}] pager container is <{tag}>, not <nav>"
    nav_label = (await nav.get_attribute("aria-label") or "").strip()
    assert nav_label, f"[{prefix}] <nav> is missing aria-label"

    # ---- select accessible name ---------------------------------------------------
    name = await accessible_name(page, f"#{prefix}-per-page")
    assert name, f"[{prefix}] select has no accessible name"
    # NOT the visible sibling label — must be a real attribute so SR announces it
    assert (await select.get_attribute("aria-label")), \
        f"[{prefix}] select missing aria-label attribute"

    # ---- prev / next accessible names ---------------------------------------------
    for btn, id_ in ((prev, f"{prefix}-prev"), (next_, f"{prefix}-next")):
        n = await accessible_name(page, f"#{id_}")
        assert n, f"[{prefix}] button #{id_} has no accessible name"

    # ---- disabled state on page 1: prev should be disabled AND aria-disabled ------
    counter_text = (await counter.inner_text()).strip()
    assert counter_text == f"1 / {total}", f"[{prefix}] initial counter {counter_text!r}"

    prev_disabled = await prev.evaluate("el => el.disabled")
    assert prev_disabled, f"[{prefix}] prev must be disabled on page 1"
    # native <button disabled> is announced as disabled; aria-disabled optional but
    # if authors add it, it must not contradict the disabled attribute
    prev_aria_dis = await prev.get_attribute("aria-disabled")
    if prev_aria_dis is not None:
        assert prev_aria_dis == "true", f"[{prefix}] prev aria-disabled contradicts disabled"

    # ---- counter is a live region -------------------------------------------------
    assert (await counter.get_attribute("role")) == "status", \
        f"[{prefix}] counter must have role=status"
    assert (await counter.get_attribute("aria-live")) == "polite", \
        f"[{prefix}] counter must have aria-live=polite"
    assert (await counter.get_attribute("aria-atomic")) == "true", \
        f"[{prefix}] counter must have aria-atomic=true"

    # ---- counter text updates when the page changes (what SR will announce) -------
    await next_.click()
    after = (await counter.inner_text()).strip()
    assert after == f"2 / {total}", f"[{prefix}] counter did not update, got {after!r}"

    # after moving to page 2, prev should now be enabled
    assert not (await prev.evaluate("el => el.disabled")), \
        f"[{prefix}] prev should be enabled on page 2"

    # jump to last page → next becomes disabled
    for _ in range(total):
        if await next_.evaluate("el => el.disabled"):
            break
        await next_.click()
    assert (await next_.evaluate("el => el.disabled")), \
        f"[{prefix}] next must be disabled on last page"

    # reset for later assertions
    await page.locator(f'[data-testid="{prefix}-pager"]').focus()
    await page.keyboard.press("Home")
    assert (await counter.inner_text()).strip() == f"1 / {total}"


async def assert_numbered_aria(page: Page) -> None:
    nav = page.locator('[data-testid="numbered-pager"]')
    assert (await nav.evaluate("el => el.tagName.toLowerCase()")) == "nav"
    assert (await nav.get_attribute("aria-label")), "numbered <nav> missing aria-label"

    # exactly ONE aria-current="page" at a time
    current = page.locator('#numbered-list a[aria-current="page"]')
    assert (await current.count()) == 1, "numbered pager must have exactly one aria-current=page"
    assert (await current.inner_text()).strip() == "1", "initial current page should be 1"

    # every anchor has an accessible name
    anchors = page.locator("#numbered-list a")
    count = await anchors.count()
    assert count > 0, "numbered list rendered no anchors"
    for i in range(count):
        el = anchors.nth(i)
        name = (await el.get_attribute("aria-label") or "").strip() or (await el.inner_text()).strip()
        assert name, f"numbered anchor #{i} has no accessible name"

    # prev on page 1 exposes aria-disabled=true
    num_prev = page.locator('[data-testid="num-prev"]')
    num_next = page.locator('[data-testid="num-next"]')
    assert (await num_prev.get_attribute("aria-disabled")) == "true", \
        "num-prev must have aria-disabled=true on page 1"
    assert (await num_prev.get_attribute("tabindex")) == "-1", \
        "num-prev must be removed from tab order when disabled"

    # click a numbered page → aria-current moves
    await page.locator('#numbered-list a[data-page="3"]').click()
    current = page.locator('#numbered-list a[aria-current="page"]')
    assert (await current.count()) == 1
    assert (await current.get_attribute("data-page")) == "3", "aria-current did not move to page 3"

    # both prev/next are enabled in the middle
    assert (await num_prev.get_attribute("aria-disabled")) != "true"
    assert (await num_next.get_attribute("aria-disabled")) != "true"

    # decorative chevrons are hidden from AT
    chevs = page.locator('[data-testid="num-prev"] svg, [data-testid="num-next"] svg')
    n = await chevs.count()
    for i in range(n):
        assert (await chevs.nth(i).get_attribute("aria-hidden")) == "true", \
            f"chevron #{i} must be aria-hidden"


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

        for prefix, section_id, direction, lang, total in PAGERS:
            try:
                await assert_pager_aria(page, prefix, section_id, direction, lang, total)
                print(f"ok   {browser_name:<8} {direction:<3} {prefix}")
            except AssertionError as e:
                failures.append(f"{browser_name}/{direction}/{prefix}: {e}")
                await page.screenshot(
                    path=str(CAPTURE / f"fail_aria_{browser_name}_{direction}_{prefix}.png")
                )

        try:
            await assert_numbered_aria(page)
            print(f"ok   {browser_name:<8} rtl numbered")
        except AssertionError as e:
            failures.append(f"{browser_name}/rtl/numbered: {e}")
            await page.screenshot(path=str(CAPTURE / f"fail_aria_{browser_name}_numbered.png"))

        await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll ARIA / semantics assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
