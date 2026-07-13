"""
axe-core scan across the RTL pager fixture after live total/records
resizes. Verifies ARIA integrity of the pager surface (aria-current,
aria-label, roles, aria-disabled, name-role-value) at multiple
states:

  * baseline       — records 43, numbered TOTAL 5
  * records grow   — __resizeData('records', 120)
  * records clamp  — __resizeData('records', 15)  (page clamps)
  * records empty  — __resizeData('records', 0)
  * numbered grow  — __resizeNumbered(20)
  * numbered clamp — __resizeNumbered(2)
  * numbered single— __resizeNumbered(1)

Each state runs axe with a strict rule set focused on ARIA + names:
  aria-allowed-attr, aria-required-attr, aria-required-children,
  aria-required-parent, aria-roles, aria-valid-attr,
  aria-valid-attr-value, aria-hidden-focus, button-name, link-name,
  label, aria-command-name, aria-tooltip-name, presentation-role-conflict,
  duplicate-id-aria.

Scope is limited to the three pager <nav>s + the select surroundings
via `include` selectors so unrelated fixture chrome doesn't pollute
results. Any violation FAILS the test with a per-node summary.

Run:
    python tests/visual-rtl/run-axe-resize.py
"""


from __future__ import annotations

import asyncio
import functools
import http.server
import json
import os
import socketserver
import sys
import threading
from pathlib import Path

from playwright.async_api import Page, async_playwright

ROOT = Path(__file__).parent
CAPTURE = ROOT / "_capture"
CAPTURE.mkdir(exist_ok=True)
AXE_JS = ROOT / "vendor" / "axe.min.js"

RULES = [
    "aria-allowed-attr",
    "aria-required-attr",
    "aria-required-children",
    "aria-required-parent",
    "aria-roles",
    "aria-valid-attr",
    "aria-valid-attr-value",
    "aria-hidden-focus",
    "button-name",
    "link-name",
    "label",
    "aria-command-name",
    "aria-tooltip-name",
    "presentation-role-conflict",
    "duplicate-id-aria",
]

INCLUDE = [
    ['[data-testid="records-pager"]'],
    ['[data-testid="attachments-pager"]'],
    ['[data-testid="numbered-pager"]'],
    ['[data-testid="records-ltr-pager"]'],
]


async def inject_axe(page: Page) -> None:
    await page.add_script_tag(path=str(AXE_JS))
    # Sanity — axe must be available before we call run
    has = await page.evaluate("() => typeof window.axe === 'object' && typeof window.axe.run === 'function'")
    assert has, "axe-core failed to load"


async def run_axe(page: Page, label: str) -> list[dict]:
    """Return the list of violations for the pager surface only."""
    result = await page.evaluate(
        """async ({ include, rules }) => {
            const options = {
                runOnly: { type: 'rule', values: rules },
                resultTypes: ['violations'],
            };
            const ctx = { include };
            const r = await window.axe.run(ctx, options);
            // Trim to serializable shape
            return r.violations.map(v => ({
                id: v.id,
                impact: v.impact,
                help: v.help,
                nodes: v.nodes.map(n => ({
                    target: n.target,
                    failureSummary: n.failureSummary,
                    html: (n.html || '').slice(0, 240),
                })),
            }));
        }""",
        {"include": INCLUDE, "rules": RULES},
    )
    return result


def format_violations(vs: list[dict], where: str) -> str:
    lines = [f"axe violations at [{where}]:"]
    for v in vs:
        lines.append(f"  * {v['id']} ({v['impact']}) — {v['help']}")
        for n in v["nodes"]:
            lines.append(f"      target: {n['target']}")
            lines.append(f"      html:   {n['html']}")
            summary = (n.get("failureSummary") or "").splitlines()
            for s in summary[:4]:
                lines.append(f"      {s}")
    return "\n".join(lines)


STATES = [
    ("baseline", ""),
    ("records grow 120",   "window.__resizeData('records', 120)"),
    ("records clamp 15",   "window.__resizeData('records', 15)"),
    ("records empty 0",    "window.__resizeData('records', 0)"),
    ("records restore 43", "window.__resizeData('records', 43)"),
    ("numbered grow 20",   "window.__resizeNumbered(20)"),
    ("numbered clamp 2",   "window.__resizeNumbered(2)"),
    ("numbered single 1",  "window.__resizeNumbered(1)"),
    ("numbered restore 5", "window.__resizeNumbered(5)"),
]


async def run() -> int:
    browser_name = os.environ.get("PW_BROWSER", "chromium").lower()
    if browser_name not in ("chromium", "firefox", "webkit"):
        browser_name = "chromium"

    assert AXE_JS.exists(), f"vendored axe missing: {AXE_JS}"

    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{port}/fixture-data.html"

    failures: list[str] = []
    async with async_playwright() as p:
        launcher = getattr(p, browser_name)
        browser = await launcher.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded")
        await page.locator('[data-testid="records-counter"]').wait_for(state="attached", timeout=30000)
        await inject_axe(page)
        print(f"# browser: {browser_name}  |  axe rules: {len(RULES)}  |  states: {len(STATES)}")

        # Exercise a handful of live interior page moves to increase the
        # chance of catching stale ARIA nodes still attached to the DOM.
        await page.locator('[data-testid="records-pager"]').focus()
        await page.keyboard.press("Home")
        await page.locator("#records-next").click()  # page 2
        await page.locator("#records-next").click()  # page 3
        await page.locator('#numbered-list a[data-page="3"]').click()

        for label, mutation in STATES:
            if mutation:
                await page.evaluate(f"() => {{ {mutation}; }}")
            violations = await run_axe(page, label)
            if violations:
                failures.append(format_violations(violations, f"{browser_name}/{label}"))
                dump = CAPTURE / f"axe_{browser_name}_{label.replace(' ', '_')}.json"
                dump.write_text(json.dumps(violations, indent=2, ensure_ascii=False))
                await page.screenshot(path=str(CAPTURE / f"axe_{browser_name}_{label.replace(' ', '_')}.png"))
                print(f"FAIL {browser_name:<8} {label}  ({len(violations)} violations)")
            else:
                print(f"ok   {browser_name:<8} {label}")

        await context.close()
        await browser.close()
    httpd.shutdown()

    if failures:
        print("\nAxe violations:")
        for f in failures:
            print(f)
            print()
        return 1
    print("\nAll axe scans clean across resizes.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
