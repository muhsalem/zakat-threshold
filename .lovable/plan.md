# Award-Ready Zakat Platform — Roadmap

## Goal
Transform this remix into a world-class Zakat calculation, audit, governance, and compliance platform that can be submitted for Islamic finance / fintech / innovation awards.

## Phase 1 — Close immediate gaps (Week 1-2)

Implement the four pending tasks already defined in `.lovable/plan.md`:

1. **Deduction transparency in PDF & Excel**
   - Extend `PrintReportData` rows with optional `deductions` array.
   - Add a "بيان الخصومات والمبرّرات" table in `ReactPdfReport.tsx` and `exportExcel.ts`.
   - Each deduction line shows: original amount, included/excluded, reason (e.g., دين غير مليء), and a short Sharia reference.

2. **Manual multi-currency conversion before export**
   - Reuse `CurrencyConverterCard` and pure `src/lib/fx.ts`.
   - Call `applyFxToReport` before every Excel/PDF export.
   - Add a visible "سعر الصرف المستخدم" column in exported reports.

3. **QR badge on the final PDF page**
   - Generate a short `reportId` from report content + timestamp hash.
   - Use `qrcode` to produce a data URL; render it on the final PDF page with a verification link.

4. **Always show Rikaz (treasure) Zakat like Crops**
   - Mirror the Crops card layout in `IndividualTab` so Rikaz appears regardless of sector.

**Deliverable:** `tsgo` clean, `exportExcel.test.ts` updated, build passes.

## Phase 2 — Audit, governance, and trust (Week 3-4)

Make the platform defensible to a judging panel:

1. **Governance & roles**
   - Enforce the existing `user_roles` table with `app_role` enum.
   - Add an admin/auditor panel to review and approve zakat records.
   - Add organization-level audit workflow (`zakat_approvals` table).

2. **Sharia audit trail**
   - Expand `sharia_audit_log` to record every calculation step, inputs, and fiqh choices.
   - Add a printable Sharia attestation page with references, signatures, and a tamper-evident hash.

3. **Security hardening**
   - Run a security scan; address any critical findings.
   - Ensure all `.server.ts` imports are protected and `supabaseAdmin` is only used inside authorized handlers.
   - Add rate limiting and input validation on public API routes.

4. **Compliance pages**
   - Create or update public `legal/privacy`, `legal/terms`, and a trust/security page that states platform facts only (no unverified certifications).

## Phase 3 — Competitive differentiation (Week 5-8)

1. **Smart nisab history & quality index**
   - Complete `nisab_prices` coverage for 1926–2025 across EG, SA, AE, TR, US, and GLOBAL.
   - Add a quality/confidence column per year (direct, derived, estimated).
   - Expose a `/nisab-audit` page that visualizes consistency before/after data backfill.

2. **Live metals & market prices**
   - Strengthen `prices.functions.ts` and `metalPrices.functions.ts` with fallback chains and caching.
   - Add a "Nisab today" widget and a global purchasing-power index.

3. **More zakat types & advanced tools**
   - Ensure livestock, ESOP, Waqf, Rikaz, crypto, and digital assets are fully wired into reports and PDF/Excel exports.
   - Add a company audit/compliance tab and an individual advanced tools hub.

4. **AI-powered advisor**
   - Use the existing Lovable AI Gateway to add a fiqh-aware Q&A assistant that cites Sharia standards and does not give legal advice.

## Phase 4 — Award submission assets (Week 9-10)

1. **Comprehensive evaluation report**
   - Generate a 1000-point scoring report across sharia, financial, technical, UX, security, and reporting axes.
   - Include SWOT, gap analysis, risk matrix, and a 12/36-month roadmap.

2. **Demo data & judge walkthrough**
   - Seed sample records for individuals, companies, and organizations.
   - Prepare a 3-minute demo script that highlights audit, governance, and multi-asset coverage.

3. **Marketing & trust kit**
   - Create a public landing page with value proposition, screenshots, and a feature matrix.
   - Add Open Graph/Twitter meta tags and a clean README.

4. **Performance & accessibility**
   - Verify Lighthouse scores, RTL layout, and responsive design.
   - Add Arabic/English toggle and font-size controls if not already present.

## Technical foundation

- **Framework:** TanStack Start v1 + React 19 + Tailwind v4.
- **Backend:** Lovable Cloud / Supabase; use `createServerFn` for app logic, `src/routes/api/public/*` only for webhooks/public APIs.
- **Auth:** Use existing Supabase auth + `profiles` table + `user_roles` for RBAC.
- **Exports:** `@react-pdf/renderer` for PDF, `xlsx` for Excel, `qrcode` for QR badge.
- **Tests:** Extend `src/lib/exportExcel.test.ts` and `src/lib/zakat.test.ts` for all new flows.

## Recommended first action

Start Phase 1 immediately by implementing the four pending `.lovable/plan.md` tasks. This is the fastest way to move from "remixed" to "award-ready" while keeping the build green.