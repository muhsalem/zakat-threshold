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
- Centralize per-metal valuation and manual precedence in the browser-safe valuation module; a manual override for one metal must not suppress the other metal's local quote.
- Share country-specific public paths and UTC-dated calculated values, never fabricate a city or label a calculated quote as an official announcement.
- Keep the silver-weight preference hydrated and device-local; persisted comparisons must use the matching historical standard.
- Keep database query-contract inspection test-only and AST-based against generated database types; it catches schema drift in page queries without importing application clients or changing financial behavior.
- Gate the entire jeweler-feed callback with withCronAuthorization using the shared cron bearer verifier before loading privileged clients; this makes refusal-before-update testable, and the legacy job-token RPC must never authorize writes.
- Zakat visitor questions use a public server function with the AI Gateway SDK and an anonymous read-only client; validate server-owned citation IDs and distinguish official excerpts from app summaries to prevent invented authority or leaked private data.
- Confirm account writes before showing success or clearing inputs; share this completion boundary across alerts and partner actions to avoid false saved states.
- Synchronize reviewed price submissions into public quotes through a database trigger, retaining submission IDs for votes; authorize role grants through the existing authenticated admin server function rather than browser writes.
- Restrict raw price-submission reads to their owner and admins; public prices must use public_price_quotes so moderation details never become visitor data.
- Track authorized scheduled jeweler-feed executions in durable admin-only audit rows before and after execution; store structured status and UTC timestamps, never raw exception text or credentials.
- Keep AI asset organization as proposed typed items requiring per-item user confirmation; aggregate only reviewed values into matching calculator fields without changing valuation, purity, jewelry treatment, hawl or investment-percentage formulas.
- Display calculated calculator thresholds through the shared useNisab valuation hook; explicit refresh must refresh both market and local quotes so home and calculator retain the same current inputs.
- Resolve the calculator's selected threshold per metal from a same-UTC-day, same-country, same-currency official announcement, falling back to shared useNisab values; refresh the official record alongside prices and label historical announcements without reusing them as today's amount.
