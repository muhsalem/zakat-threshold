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
python tests/visual-rtl/run.py            # compare against baselines
python tests/visual-rtl/run.py --update   # (re)generate baselines after
                                          # an intentional visual change
```

Baselines live in `baselines/`. Failures write the actual capture and a
red-highlighted diff into `diffs/` and exit non-zero.

Tolerance: `< 0.1%` of pixels may differ (accounts for font-hinting wobble).
Direction flips or mis-aligned buttons produce diffs in the 3–15% range and
fail immediately.
