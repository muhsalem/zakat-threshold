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
```

`run-data.py` drives `fixture-data.html` (43 fake records + 27 attachments
with working prev/next, per-page select, counter "2 / 5", RTL arrow keys)
across mobile / tablet / desktop viewports and asserts: counter format,
disabled state on first/last page, RTL button ordering (prev right of next),
`ArrowLeft` advances in RTL, `Home`/`End` jump, per-page recomputes total
pages, and no horizontal overflow.

Baselines live in `baselines/`. Failures write the actual capture and a
red-highlighted diff into `diffs/` and exit non-zero.

Tolerance: `< 0.1%` of pixels may differ (accounts for font-hinting wobble).
Direction flips or mis-aligned buttons produce diffs in the 3–15% range and
fail immediately.
