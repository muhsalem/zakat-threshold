# Visual regression — RTL pagination

Guards the direction of pagination strips (counter + prev/next buttons +
per-page select) so future CSS or component changes cannot silently flip or
mis-align them.

## What it covers

`fixture.html` renders three isolated cards that mirror the markup shipped in
`src/routes/_authenticated/drafts.tsx` and
`src/routes/_authenticated/attachments-review.tsx`:

- `pager-rtl` — icon-only prev/next with `صفحة X من Y` counter
- `pager-rtl-labeled` — labeled buttons + `Select` + `dir="ltr"` numeric counter
- `pager-ltr` — the LTR counterpart, to catch regressions that would break
  the non-Arabic locale

Chevrons that live in RTL cards intentionally point in the reading direction
(previous → right, next → left) so any accidental mirror shows up as pixel
drift.

## Run

```bash
python tests/visual-rtl/run.py            # visual snapshots vs baselines
python tests/visual-rtl/run.py --update   # (re)generate baselines
python tests/visual-rtl/run-data.py       # behavioral test with fake data
python tests/visual-rtl/run-live-keys.py  # Tab/Shift+Tab/Arrow keys on live /drafts + /attachments-review
```

`run-data.py` drives `fixture-data.html` (43 fake records + 27 attachments
with working prev/next, per-page select, counter "2 / 5", RTL arrow keys)
across mobile / tablet / desktop viewports and asserts: counter format,
disabled state on first/last page, RTL button ordering (prev right of next),
`ArrowLeft` advances in RTL, `Home`/`End` jump, per-page recomputes total
pages, and no horizontal overflow.

`run-live-keys.py` opens the real `/drafts` and `/attachments-review` routes
in an authenticated session and mocks Supabase REST responses (60 fake
records, 60 fake attachments — enough for 3 pages each). It asserts, across
mobile / tablet / desktop:

- initial counter format (`صفحة 1 من 3`, `1 / 3`)
- `dir="rtl"` inherited on the pager `<nav>`
- Prev disabled on first page, next disabled on last page
- Tab / Shift+Tab move focus in DOM order (Select trigger ↔ next when prev
  is disabled; Select ↔ prev ↔ next when prev is enabled)
- ArrowLeft advances one page in RTL, ArrowRight goes back
- Home / End jump to first / last page

The mock exposes `Content-Range` via `Access-Control-Expose-Headers` so
supabase-js's `count: "exact"` parsing works on the intercepted responses.

Baselines live in `baselines/`. Failures write the actual capture and a
red-highlighted diff into `diffs/` and exit non-zero.

Tolerance: `< 0.1%` of pixels may differ (accounts for font-hinting wobble).
Direction flips or mis-aligned buttons produce diffs in the 3–15% range and
fail immediately.
