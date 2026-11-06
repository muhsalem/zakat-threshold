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
- Compare published dealer bids with today's selected thresholds in a display-only component using shared weights; never fill missing bids with asks or estimated spreads, because proceeds must not imply an unquoted purchase offer.
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
- Resolve today's official amounts through the calculator's shared resolver and query, invalidated by the root public listener independently of metal-price slots; retain market gram prices and never represent an announcement as a gram-price formula.
- Own public jeweler-price realtime subscriptions in one root-mounted visitor listener, deduplicate actual price changes and invalidate country quote caches; this prevents per-hook subscriptions and timestamp-only alerts.
- Ground questions in database-owned verified excerpts with separate publication and verification dates, never automatically treat a fatwa or guideline as a daily monetary announcement.
- Save admin-entered jeweler prices through an authenticated, role-checked transactional RPC that updates the live feed, UTC history and audit row together; this prevents activation without a durable update record.
- Annual daily archives read persisted country/currency-matched UTC history through a public read-only function; missing metal prices remain missing, and historical standards use shared valuation weights rather than current FX or reconstructed annual estimates.
- Personal historical calculations live in an owner-only persistent table behind authenticated functions; derive threshold, rate and due server-side from the selected history row and snapshot its provenance so public visitors never receive private calculations.
- Refresh country prices through the country-prices hook at 11:00 and 23:00 local time using COUNTRY_TIME_ZONES, closing a slot only after its history row is written; the daily jeweler-feed job fills missing rows only, which keeps prices from changing outside the two local slots.
