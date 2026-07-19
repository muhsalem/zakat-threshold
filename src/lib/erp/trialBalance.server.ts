/**
 * Trial Balance Fetchers — سحب ميزان المراجعة حياً من كل ERP
 * ----------------------------------------------------------
 * Server-only. لكل مزوّد طريقة جلبه الخاصة:
 *   - Odoo:  JSON-RPC → account.account (الأنواع) + account.move.line read_group (الأرصدة)
 *   - SAP:   OData API_TRIALBALANCE (S/4HANA Cloud — سيناريو الاتصال SAP_COM_0580)
 *   - *_sandbox: مجموعة بيانات تجريبية واقعية لتجربة المسار كاملاً بدون نظام حي
 */
import type { ErpCreds } from "./providers.server";
import type { TrialBalanceRow } from "./zakatMapping";

const TIMEOUT_MS = 20_000;

async function jfetch(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init.timeoutMs ?? TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const txt = await res.text();
    let json: unknown = null;
    try {
      json = txt ? JSON.parse(txt) : null;
    } catch {
      json = txt;
    }
    return { status: res.status, ok: res.ok, body: json };
  } finally {
    clearTimeout(t);
  }
}

export interface TrialBalanceResult {
  ok: boolean;
  rows: TrialBalanceRow[];
  source: "live" | "sandbox_demo";
  as_of: string;
  error?: string;
}

/* ============================== ODOO ============================== */

async function odooRpc(baseUrl: string, params: unknown) {
  return jfetch(`${baseUrl.replace(/\/$/, "")}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params }),
  });
}

async function fetchOdooTrialBalance(c: ErpCreds, dateTo: string): Promise<TrialBalanceResult> {
  try {
    // 1) المصادقة
    const auth = await odooRpc(c.base_url, {
      service: "common",
      method: "authenticate",
      args: [c.db_name ?? "", c.username ?? "", c.api_key, {}],
    });
    const uid = (auth.body as { result?: number } | null)?.result;
    if (!uid || typeof uid !== "number") {
      return { ok: false, rows: [], source: "live", as_of: dateTo, error: "odoo_auth_failed" };
    }

    const exec = (model: string, method: string, args: unknown[], kwargs: unknown = {}) =>
      odooRpc(c.base_url, {
        service: "object",
        method: "execute_kw",
        args: [c.db_name ?? "", uid, c.api_key, model, method, args, kwargs],
      });

    // 2) دليل الحسابات مع النوع الرسمي
    const accountsRes = await exec("account.account", "search_read", [[]], {
      fields: ["id", "code", "name", "account_type"],
      limit: 1000,
    });
    const accounts =
      ((accountsRes.body as { result?: unknown[] } | null)?.result as Array<{
        id: number;
        code: string;
        name: string;
        account_type: string;
      }>) ?? [];
    if (!accounts.length) {
      return { ok: false, rows: [], source: "live", as_of: dateTo, error: "odoo_no_accounts" };
    }

    // 3) الأرصدة المجمّعة حتى تاريخ الفترة (قيود مرحّلة فقط)
    const balancesRes = await exec(
      "account.move.line",
      "read_group",
      [
        [
          ["date", "<=", dateTo],
          ["parent_state", "=", "posted"],
        ],
        ["balance:sum"],
        ["account_id"],
      ],
      { lazy: true },
    );
    const groups =
      ((balancesRes.body as { result?: unknown[] } | null)?.result as Array<{
        account_id: [number, string] | false;
        balance: number;
      }>) ?? [];
    const balanceByAccount = new Map<number, number>();
    for (const g of groups) {
      if (Array.isArray(g.account_id)) balanceByAccount.set(g.account_id[0], g.balance ?? 0);
    }

    const rows: TrialBalanceRow[] = accounts
      .map((a) => ({
        code: a.code ?? String(a.id),
        name: a.name,
        balance: +(balanceByAccount.get(a.id) ?? 0).toFixed(2),
        erpType: a.account_type,
      }))
      .filter((r) => r.balance !== 0);

    return { ok: true, rows, source: "live", as_of: dateTo };
  } catch (e) {
    return {
      ok: false,
      rows: [],
      source: "live",
      as_of: dateTo,
      error: e instanceof Error ? e.message : "odoo_fetch_failed",
    };
  }
}

/* =============================== SAP =============================== */

function sapAuthHeader(c: ErpCreds): Record<string, string> {
  if (c.provider === "sap_sandbox") return { APIKey: c.api_key };
  const basic = Buffer.from(`${c.username ?? ""}:${c.api_key}`).toString("base64");
  return { Authorization: `Basic ${basic}` };
}

async function fetchSapTrialBalance(c: ErpCreds, dateTo: string): Promise<TrialBalanceResult> {
  try {
    // S/4HANA Cloud — خدمة ميزان المراجعة القياسية (تتطلب تفعيل سيناريو الاتصال SAP_COM_0580)
    const base = c.base_url.replace(/\/$/, "");
    const url =
      `${base}/sap/opu/odata/sap/API_TRIALBALANCE/TrialBalanceResult` +
      `?$select=GLAccount,GLAccountName,EndingBalanceAmtInCoCodeCrcy` +
      `&$filter=ToPostingDate eq datetime'${dateTo}T00:00:00'&$top=1000&$format=json`;
    const r = await jfetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...sapAuthHeader(c) },
    });
    if (!r.ok) {
      return {
        ok: false,
        rows: [],
        source: "live",
        as_of: dateTo,
        error: `sap_http_${r.status} — تأكد من تفعيل سيناريو الاتصال SAP_COM_0580 (Trial Balance)`,
      };
    }
    const results =
      ((r.body as { d?: { results?: unknown[] } } | null)?.d?.results as Array<{
        GLAccount?: string;
        GLAccountName?: string;
        EndingBalanceAmtInCoCodeCrcy?: string | number;
      }>) ?? [];
    const rows: TrialBalanceRow[] = results
      .map((x) => ({
        code: x.GLAccount ?? "",
        name: x.GLAccountName ?? x.GLAccount ?? "",
        balance: +Number(x.EndingBalanceAmtInCoCodeCrcy ?? 0).toFixed(2),
      }))
      .filter((r2) => r2.code && r2.balance !== 0);

    return { ok: true, rows, source: "live", as_of: dateTo };
  } catch (e) {
    return {
      ok: false,
      rows: [],
      source: "live",
      as_of: dateTo,
      error: e instanceof Error ? e.message : "sap_fetch_failed",
    };
  }
}

/* ============================ SANDBOX ============================= */

/** ميزان مراجعة تجريبي واقعي (شركة تجارية) لتجربة المسار كاملاً بدون نظام حي */
function sandboxTrialBalance(provider: "odoo" | "sap", dateTo: string): TrialBalanceResult {
  const odooRows: TrialBalanceRow[] = [
    { code: "1010", name: "الصندوق — Cash on Hand", balance: 85000, erpType: "asset_cash" },
    { code: "1020", name: "البنك الأهلي — Bank", balance: 420000, erpType: "asset_cash" },
    { code: "1100", name: "ذمم العملاء — Accounts Receivable", balance: 310000, erpType: "asset_receivable" },
    { code: "1200", name: "مخزون البضاعة — Inventory", balance: 275000, erpType: "asset_current" },
    { code: "1250", name: "استثمارات قصيرة الأجل — Trading Securities", balance: 90000, erpType: "asset_current" },
    { code: "1300", name: "مصروفات مدفوعة مقدماً — Prepaid", balance: 18000, erpType: "asset_prepayments" },
    { code: "1500", name: "سيارات ومعدات — Vehicles & Equipment", balance: 350000, erpType: "asset_fixed" },
    { code: "2100", name: "ذمم الموردين — Accounts Payable", balance: -195000, erpType: "liability_payable" },
    { code: "2200", name: "رواتب مستحقة — Salaries Payable", balance: -42000, erpType: "liability_current" },
    { code: "2500", name: "قرض طويل الأجل — LT Loan", balance: -220000, erpType: "liability_non_current" },
    { code: "3000", name: "رأس المال — Capital", balance: -500000, erpType: "equity" },
    { code: "4000", name: "إيرادات المبيعات — Sales", balance: -391000, erpType: "income" },
  ];
  const sapRows: TrialBalanceRow[] = odooRows.map((r) => ({
    code: { "1010": "100010", "1020": "110020", "1100": "121000", "1200": "140000", "1250": "150000", "1300": "160000", "1500": "170000", "2100": "310000", "2200": "330000", "2500": "350000", "3000": "900000", "4000": "410000" }[r.code] ?? r.code,
    name: r.name,
    balance: r.balance,
  }));
  return {
    ok: true,
    rows: provider === "odoo" ? odooRows : sapRows,
    source: "sandbox_demo",
    as_of: dateTo,
  };
}

/* ============================ Dispatch ============================ */

export async function fetchTrialBalance(c: ErpCreds, dateTo: string): Promise<TrialBalanceResult> {
  if (c.provider === "odoo_sandbox") return sandboxTrialBalance("odoo", dateTo);
  if (c.provider === "sap_sandbox") return sandboxTrialBalance("sap", dateTo);
  if (c.provider === "odoo") return fetchOdooTrialBalance(c, dateTo);
  if (c.provider === "sap") return fetchSapTrialBalance(c, dateTo);
  return { ok: false, rows: [], source: "live", as_of: dateTo, error: "unknown_provider" };
}
