<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the home price overview unframed, scope its visual styling to `.nisab-home`, and reuse the existing country/city controls and price resolution; this prevents visual refinements from changing financial behavior or unrelated pages.
- Use UTC for homepage day boundaries and compare only the exact previous UTC day's persisted history, because the history writer keys daily rows in UTC; do not substitute another date when yesterday is missing.
- Share price-check timing through the browser-safe daily-nisab module and retain separate historical cache timing, so intraday refreshes do not multiply historical-series fetches.
