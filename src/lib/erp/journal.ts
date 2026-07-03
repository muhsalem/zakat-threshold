/**
 * ERP Journal Entry Builder + Adapters
 * ------------------------------------
 * يحوّل نتيجة حساب الزكاة إلى قيد محاسبي مزدوج (double-entry) طبقًا لـ
 * AAOIFI FAS 9 (Zakah) + IFRS/IAS 37 (Provisions)، ثم يوفّر محوّلات إلى
 * صيغ أنظمة ERP الشائعة: QuickBooks, Xero, SAP (IDoc XML), Odoo, NetSuite,
 * وكذلك CSV عام + XBRL (ZATCA-friendly) + Generic JSON.
 *
 * القيد المعياري:
 *   Dr  Zakat Expense                 (Income Statement)     = zakat_due
 *      Cr  Zakat Payable              (Balance Sheet Liab.)  = zakat_due
 *
 * كل مُحوِّل يُرجع { contentType, body } يمكن إرسالها مباشرةً كـ Response.
 */

export type JournalCurrency = string; // ISO-4217

export interface ZakatCalcInput {
  entity_name: string;
  entity_id?: string;
  reference?: string;           // مثل: رقم الإقرار / رقم العملية
  currency: JournalCurrency;
  zakat_due: number;
  base_amount?: number;         // الوعاء الزكوي
  rate?: number;                // 0.025 أو 0.02577
  period_start: string;         // ISO date
  period_end: string;           // ISO date (تاريخ حولان الحول)
  jurisdiction?: string;        // ISO-3166 alpha-2
  fatwa_authority?: string;     // e.g. "AAOIFI-35" | "ZATCA" | "IFA-OIC"
  memo?: string;
}

export interface JournalLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface NormalizedJournalEntry {
  id: string;                   // نُنشئه من reference + timestamp
  date: string;                 // ISO date (period_end)
  currency: JournalCurrency;
  memo: string;
  reference: string;
  lines: JournalLine[];
  meta: {
    standard: "AAOIFI-FAS-9";
    jurisdiction?: string;
    fatwa_authority?: string;
    rate?: number;
    base_amount?: number;
    generated_at: string;
    generator: "zakat-calculator/1.0";
  };
}

// دليل الحسابات الافتراضي (قابل للتخصيص لاحقًا لكل مؤسسة)
export const DEFAULT_CHART_OF_ACCOUNTS = {
  zakat_expense: { code: "5900", name: "Zakat Expense" },
  zakat_payable: { code: "2400", name: "Zakat Payable" },
} as const;

export function buildNormalizedJournal(
  input: ZakatCalcInput,
  chart = DEFAULT_CHART_OF_ACCOUNTS,
): NormalizedJournalEntry {
  const amount = Number((input.zakat_due ?? 0).toFixed(2));
  if (!(amount > 0)) throw new Error("zakat_due must be > 0");
  const ref = input.reference ?? `ZKT-${Date.now()}`;
  const memo =
    input.memo ??
    `Zakat provision for ${input.entity_name} — period ${input.period_start} → ${input.period_end}`;

  return {
    id: `${ref}`,
    date: input.period_end,
    currency: input.currency,
    memo,
    reference: ref,
    lines: [
      {
        account_code: chart.zakat_expense.code,
        account_name: chart.zakat_expense.name,
        debit: amount,
        credit: 0,
        description: `Zakat @ ${((input.rate ?? 0.025) * 100).toFixed(3)}%`,
      },
      {
        account_code: chart.zakat_payable.code,
        account_name: chart.zakat_payable.name,
        debit: 0,
        credit: amount,
        description: "Zakat obligation payable to eligible recipients",
      },
    ],
    meta: {
      standard: "AAOIFI-FAS-9",
      jurisdiction: input.jurisdiction,
      fatwa_authority: input.fatwa_authority,
      rate: input.rate,
      base_amount: input.base_amount,
      generated_at: new Date().toISOString(),
      generator: "zakat-calculator/1.0",
    },
  };
}

/* ------------------------------------------------------------------ */
/*                             ADAPTERS                                */
/* ------------------------------------------------------------------ */

export interface AdapterOutput {
  contentType: string;
  filenameSuffix: string;
  body: string;
}

// QuickBooks Online — JournalEntry API (v3)
// docs: developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry
export function toQuickBooks(j: NormalizedJournalEntry): AdapterOutput {
  const body = {
    JournalEntry: {
      TxnDate: j.date,
      DocNumber: j.reference,
      PrivateNote: j.memo,
      CurrencyRef: { value: j.currency },
      Line: j.lines.map((l, i) => ({
        Id: String(i + 1),
        Description: l.description,
        Amount: l.debit || l.credit,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: l.debit ? "Debit" : "Credit",
          AccountRef: { value: l.account_code, name: l.account_name },
        },
      })),
    },
  };
  return { contentType: "application/json", filenameSuffix: "qbo.json", body: JSON.stringify(body, null, 2) };
}

// Xero — ManualJournal API
// docs: developer.xero.com/documentation/api/accounting/manualjournals
export function toXero(j: NormalizedJournalEntry): AdapterOutput {
  const body = {
    ManualJournals: [
      {
        Narration: j.memo,
        Date: j.date,
        Status: "DRAFT",
        LineAmountTypes: "NoTax",
        Reference: j.reference,
        JournalLines: j.lines.map((l) => ({
          LineAmount: l.debit ? l.debit : -l.credit, // Xero: negative = credit
          AccountCode: l.account_code,
          Description: l.description,
        })),
      },
    ],
  };
  return { contentType: "application/json", filenameSuffix: "xero.json", body: JSON.stringify(body, null, 2) };
}

// Odoo — account.move payload (usable via XML-RPC / REST wrapper)
export function toOdoo(j: NormalizedJournalEntry): AdapterOutput {
  const body = {
    model: "account.move",
    values: {
      ref: j.reference,
      date: j.date,
      journal_id: "ZAKAT",
      narration: j.memo,
      currency_id: j.currency,
      line_ids: j.lines.map((l) => [
        0,
        0,
        {
          name: l.description,
          account_id: l.account_code,
          debit: l.debit,
          credit: l.credit,
        },
      ]),
    },
  };
  return { contentType: "application/json", filenameSuffix: "odoo.json", body: JSON.stringify(body, null, 2) };
}

// NetSuite — SuiteTalk JournalEntry
export function toNetSuite(j: NormalizedJournalEntry): AdapterOutput {
  const body = {
    recordType: "journalentry",
    tranDate: j.date,
    memo: j.memo,
    externalId: j.reference,
    currency: { refName: j.currency },
    line: j.lines.map((l, i) => ({
      line: i,
      account: { externalId: l.account_code, refName: l.account_name },
      debit: l.debit || undefined,
      credit: l.credit || undefined,
      memo: l.description,
    })),
  };
  return { contentType: "application/json", filenameSuffix: "netsuite.json", body: JSON.stringify(body, null, 2) };
}

// SAP — IDoc ACC_DOCUMENT03 (Financial Accounting Document)
export function toSapIDoc(j: NormalizedJournalEntry): AdapterOutput {
  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" } as any)[c]);
  const items = j.lines
    .map(
      (l, i) => `    <E1BPACGL09>
      <ITEMNO_ACC>${String(i + 1).padStart(10, "0")}</ITEMNO_ACC>
      <GL_ACCOUNT>${esc(l.account_code)}</GL_ACCOUNT>
      <ITEM_TEXT>${esc(l.description ?? "")}</ITEM_TEXT>
    </E1BPACGL09>
    <E1BPACCR09>
      <ITEMNO_ACC>${String(i + 1).padStart(10, "0")}</ITEMNO_ACC>
      <CURRENCY>${esc(j.currency)}</CURRENCY>
      <AMT_DOCCUR>${(l.debit || -l.credit).toFixed(2)}</AMT_DOCCUR>
    </E1BPACCR09>`,
    )
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<ACC_DOCUMENT03>
  <IDOC BEGIN="1">
    <E1BPACHE09>
      <OBJ_TYPE>BKPFF</OBJ_TYPE>
      <OBJ_KEY>${esc(j.reference)}</OBJ_KEY>
      <DOC_DATE>${j.date.replace(/-/g, "")}</DOC_DATE>
      <PSTNG_DATE>${j.date.replace(/-/g, "")}</PSTNG_DATE>
      <DOC_TYPE>SA</DOC_TYPE>
      <HEADER_TXT>${esc(j.memo).slice(0, 25)}</HEADER_TXT>
    </E1BPACHE09>
${items}
  </IDOC>
</ACC_DOCUMENT03>`;
  return { contentType: "application/xml", filenameSuffix: "sap-idoc.xml", body };
}

// Zoho Books / Sage / Wave / generic CSV
export function toCsv(j: NormalizedJournalEntry): AdapterOutput {
  const rows = [
    ["Date", "Reference", "Account Code", "Account Name", "Description", "Debit", "Credit", "Currency"],
    ...j.lines.map((l) => [
      j.date,
      j.reference,
      l.account_code,
      l.account_name,
      (l.description ?? "").replace(/"/g, '""'),
      l.debit.toFixed(2),
      l.credit.toFixed(2),
      j.currency,
    ]),
  ];
  const body = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  return { contentType: "text/csv; charset=utf-8", filenameSuffix: "csv", body };
}

// XBRL — مبسّط (compatible with ZATCA e-invoicing tagging conventions)
export function toXbrl(j: NormalizedJournalEntry): AdapterOutput {
  const total = j.lines.reduce((s, l) => s + l.debit, 0);
  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" } as any)[c]);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance"
      xmlns:zkt="https://schema.zakat.lovable.app/2026"
      xmlns:iso4217="http://www.xbrl.org/2003/iso4217">
  <context id="PeriodEnd">
    <entity><identifier scheme="https://zakat.lovable.app">${esc(j.meta.jurisdiction ?? "GLOBAL")}</identifier></entity>
    <period><instant>${j.date}</instant></period>
  </context>
  <unit id="CUR"><measure>iso4217:${esc(j.currency)}</measure></unit>
  <zkt:ZakatDue contextRef="PeriodEnd" unitRef="CUR" decimals="2">${total.toFixed(2)}</zkt:ZakatDue>
  <zkt:ZakatBase contextRef="PeriodEnd" unitRef="CUR" decimals="2">${(j.meta.base_amount ?? 0).toFixed(2)}</zkt:ZakatBase>
  <zkt:ZakatRate contextRef="PeriodEnd" decimals="5">${j.meta.rate ?? 0.025}</zkt:ZakatRate>
  <zkt:FatwaAuthority contextRef="PeriodEnd">${esc(j.meta.fatwa_authority ?? "AAOIFI-35")}</zkt:FatwaAuthority>
</xbrl>`;
  return { contentType: "application/xml", filenameSuffix: "xbrl.xml", body };
}

export type ErpFormat = "generic" | "quickbooks" | "xero" | "odoo" | "netsuite" | "sap" | "csv" | "xbrl";

export function renderJournal(j: NormalizedJournalEntry, format: ErpFormat): AdapterOutput {
  switch (format) {
    case "quickbooks": return toQuickBooks(j);
    case "xero":       return toXero(j);
    case "odoo":       return toOdoo(j);
    case "netsuite":   return toNetSuite(j);
    case "sap":        return toSapIDoc(j);
    case "csv":        return toCsv(j);
    case "xbrl":       return toXbrl(j);
    case "generic":
    default:
      return {
        contentType: "application/json",
        filenameSuffix: "json",
        body: JSON.stringify(j, null, 2),
      };
  }
}

export const SUPPORTED_ERP_FORMATS: ErpFormat[] = [
  "generic", "quickbooks", "xero", "odoo", "netsuite", "sap", "csv", "xbrl",
];
