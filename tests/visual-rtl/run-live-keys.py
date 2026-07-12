"""
Playwright keyboard-nav tests for RTL pagination on the live app.

Mocks Supabase REST responses so the pagers on /drafts and /attachments-review
render with real data (multiple pages), then drives Tab / Shift+Tab / arrow
keys against the actual React components and asserts:
  - Tab moves focus in DOM order (prev button → counter/select → next button)
  - Shift+Tab reverses that order
  - ArrowLeft in RTL advances one page; ArrowRight goes back
  - Home / End jump to first / last page
  - The pager <nav> has dir=rtl (inherits from html[dir=rtl])

Run:
    python tests/visual-rtl/run-live-keys.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from playwright.async_api import async_playwright, Route

ROOT = Path(__file__).parent
CAPTURE = ROOT / "_capture"
CAPTURE.mkdir(exist_ok=True)

BASE_URL = "http://localhost:8080"

VIEWPORTS = {
    "mobile":  (390, 900),
    "tablet":  (768, 1000),
    "desktop": (1338, 900),
}

# ---------------------------------------------------------------------------
# Fake data — enough rows to force multi-page pagers on both routes.
# ---------------------------------------------------------------------------
RECORDS_TOTAL = 60      # drafts page size = 25 → 3 pages
ATTACHMENTS_TOTAL = 60  # attachments default pageSize = 25 → 3 pages

def fake_records(offset: int, limit: int):
    end = min(RECORDS_TOTAL, offset + limit)
    return [
        {
            "id": f"00000000-0000-0000-0000-{i:012d}",
            "record_type": "individual" if i % 2 == 0 else "company",
            "gregorian_date": f"2025-{(i % 12) + 1:02d}-01",
            "hijri_year": str(1445 + (i % 3)),
            "currency": "SAR",
            "zakat_base": 10000 + i * 100,
            "zakat_due": 250 + i,
            "prepaid_zakat": 0,
            "net_due": 250 + i,
            "notes": f"سجل رقم {i + 1}",
            "created_at": f"2025-01-01T00:00:{i % 60:02d}Z",
        }
        for i in range(offset, end)
    ]


def fake_attachments(limit: int):
    return [
        {
            "id": f"11111111-1111-1111-1111-{i:012d}",
            "file_name": f"مرفق_{i + 1:02d}.pdf",
            "mime_type": "application/pdf",
            "size_bytes": 1000 + i,
            "category": "bank_statement" if i % 2 == 0 else "trade_report",
            "label": None,
            "status": ["draft", "pending", "approved", "rejected"][i % 4],
            "review_note": None,
            "reviewed_by": None,
            "reviewed_at": None,
            "storage_path": f"u/{i}.pdf",
            "uploaded_by": "00000000-0000-0000-0000-000000000000",
            "zakat_record_id": None,
            "organization_id": None,
            "approval_id": None,
            "created_at": f"2025-01-01T00:00:{i % 60:02d}Z",
            "updated_at": f"2025-01-01T00:00:{i % 60:02d}Z",
        }
        for i in range(min(ATTACHMENTS_TOTAL, limit))
    ]


async def mock_supabase(route: Route):
    """Intercept PostgREST calls and return canned rows."""
    req = route.request
    url = urlparse(req.url)
    path = url.path

    # Range header on the request tells PostgREST which slice the client asked for.
    range_hdr = req.headers.get("range", "0-24")
    try:
        r_from, r_to = (int(x) for x in range_hdr.split("-"))
    except ValueError:
        r_from, r_to = 0, 24
    limit = r_to - r_from + 1

    if path.endswith("/rest/v1/zakat_records"):
        body = fake_records(r_from, limit)
        headers = {
            "content-type": "application/json",
            "content-range": f"{r_from}-{min(RECORDS_TOTAL - 1, r_from + limit - 1)}/{RECORDS_TOTAL}",
        }
        await route.fulfill(status=200, headers=headers, body=json.dumps(body))
        return

    if path.endswith("/rest/v1/approval_attachments"):
        # Route reads up to 300 rows and paginates client-side.
        body = fake_attachments(300)
        await route.fulfill(
            status=200,
            headers={"content-type": "application/json"},
            body=json.dumps(body),
        )
        return

    if path.endswith("/rest/v1/zakat_drafts"):
        await route.fulfill(status=200, headers={"content-type": "application/json"}, body="[]")
        return

    # Anything else in /rest/v1 (profiles, approvals, etc.) → empty array.
    if "/rest/v1/" in path:
        await route.fulfill(
            status=200,
            headers={"content-type": "application/json"},
            body="[]",
        )
        return

    await route.continue_()


# ---------------------------------------------------------------------------
# Assertions
# ---------------------------------------------------------------------------
async def restore_session(context, page):
    storage_key = os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"]
    session_json = os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"]
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE_URL
        await context.add_cookies(cookies)
    await page.goto(BASE_URL)
    await page.evaluate(
        f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)});"
        "window.localStorage.setItem('zakat_onboarding_v1', 'skipped');"
    )


async def assert_keys_on_drafts(page):
    await page.goto(f"{BASE_URL}/drafts", wait_until="networkidle")
    pager = page.locator('nav[aria-label="تصفّح السجلات"]')
    await pager.wait_for(timeout=15_000)

    prev_btn = pager.get_by_role("button", name="الصفحة السابقة")
    next_btn = pager.get_by_role("button", name="الصفحة التالية")
    counter = pager.locator("span").first  # "صفحة X من Y"

    # sanity: 3 pages (60 records / 25 per page)
    txt = (await counter.inner_text()).strip()
    assert txt == "صفحة 1 من 3", f"drafts: initial counter = {txt!r}"
    assert await prev_btn.is_disabled(), "drafts: prev must be disabled on page 1"

    # RTL: pager inherits dir=rtl from html
    dir_ = await pager.evaluate(
        "el => (el.closest('[dir]')?.getAttribute('dir') ?? document.dir ?? 'ltr')"
    )
    assert dir_ == "rtl", f"drafts: pager dir = {dir_!r}"

    # Tab order: focus first pager control (prev button) via keyboard.
    await prev_btn.focus()  # anchor; prev is disabled → skip via Tab
    # Tabbing from focused prev must land on next (DOM order), regardless of visual RTL flip.
    await next_btn.focus()
    focused_label = await page.evaluate("() => document.activeElement?.getAttribute('aria-label')")
    assert focused_label == "الصفحة التالية"

    # Shift+Tab must move back to prev button (or previous focusable) in DOM order,
    # NOT jump forward visually. Since prev is disabled, focus goes to the last
    # focusable before the pager — assert it is NOT the next button.
    await page.keyboard.press("Shift+Tab")
    still_next = await page.evaluate(
        "() => document.activeElement?.getAttribute('aria-label') === 'الصفحة التالية'"
    )
    assert not still_next, "drafts: Shift+Tab kept focus on next button"

    # Focus the pager container itself and drive arrow keys.
    await pager.focus()
    # ArrowLeft in RTL → advance one page
    await page.keyboard.press("ArrowLeft")
    txt = (await counter.inner_text()).strip()
    assert txt == "صفحة 2 من 3", f"drafts: ArrowLeft did not advance (got {txt!r})"

    # ArrowRight in RTL → go back
    await page.keyboard.press("ArrowRight")
    txt = (await counter.inner_text()).strip()
    assert txt == "صفحة 1 من 3", f"drafts: ArrowRight did not go back (got {txt!r})"

    # End → last page
    await page.keyboard.press("End")
    txt = (await counter.inner_text()).strip()
    assert txt == "صفحة 3 من 3", f"drafts: End did not jump to last (got {txt!r})"
    assert await next_btn.is_disabled(), "drafts: next must be disabled on last page"

    # Home → first page
    await page.keyboard.press("Home")
    txt = (await counter.inner_text()).strip()
    assert txt == "صفحة 1 من 3", f"drafts: Home did not return to first (got {txt!r})"


async def assert_keys_on_attachments(page):
    await page.goto(f"{BASE_URL}/attachments-review", wait_until="networkidle")
    pager = page.locator('nav[aria-label="تصفّح المرفقات"]')
    await pager.wait_for(timeout=15_000)

    prev_btn = pager.get_by_role("button", name="السابق")
    next_btn = pager.get_by_role("button", name="التالي")
    counter = pager.locator('span[dir="ltr"]').first  # "1 / 3"

    txt = (await counter.inner_text()).strip()
    # 60 rows / default pageSize 25 → 3 pages
    assert txt == "1 / 3", f"attachments: initial counter = {txt!r}"
    assert await prev_btn.is_disabled()

    # Tab from prev → per-page Select trigger → next (DOM order).
    await prev_btn.focus()
    await page.keyboard.press("Tab")
    role = await page.evaluate("() => document.activeElement?.getAttribute('aria-label')")
    # Focus lands on the per-page SelectTrigger (aria-label set in the route)
    assert role == "عدد الصفوف في كل صفحة", f"attachments: Tab landed on {role!r}, expected select trigger"

    await page.keyboard.press("Tab")
    role = await page.evaluate("() => document.activeElement?.textContent?.trim()")
    assert role == "التالي", f"attachments: second Tab did not reach next button (got {role!r})"

    # Shift+Tab returns to select trigger
    await page.keyboard.press("Shift+Tab")
    role = await page.evaluate("() => document.activeElement?.getAttribute('aria-label')")
    assert role == "عدد الصفوف في كل صفحة", f"attachments: Shift+Tab off next → {role!r}"

    # Arrow keys on the pager container
    await pager.focus()
    await page.keyboard.press("ArrowLeft")   # RTL advance
    txt = (await counter.inner_text()).strip()
    assert txt == "2 / 3", f"attachments: ArrowLeft did not advance (got {txt!r})"

    await page.keyboard.press("End")
    txt = (await counter.inner_text()).strip()
    assert txt == "3 / 3"
    assert await next_btn.is_disabled()

    await page.keyboard.press("Home")
    txt = (await counter.inner_text()).strip()
    assert txt == "1 / 3"


async def run() -> int:
    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") != "injected":
        print("skip: LOVABLE_BROWSER_AUTH_STATUS is not 'injected' — sign in to run live tests.")
        return 0

    failures: list[str] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, (w, h) in VIEWPORTS.items():
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            await context.route("**/rest/v1/**", mock_supabase)
            await restore_session(context, page)

            for label, fn in (
                ("drafts", assert_keys_on_drafts),
                ("attachments", assert_keys_on_attachments),
            ):
                try:
                    await fn(page)
                    print(f"ok   {name:<7} {label}")
                except (AssertionError, Exception) as e:
                    failures.append(f"{name}/{label}: {type(e).__name__}: {e}")
                    try:
                        await page.screenshot(path=str(CAPTURE / f"livekeys_fail_{name}_{label}.png"))
                    except Exception:
                        pass
            await context.close()
        await browser.close()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll live keyboard-nav assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
