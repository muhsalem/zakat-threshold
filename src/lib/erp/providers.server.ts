/**
 * ERP Provider Adapters — Odoo (JSON-RPC) & SAP S/4HANA Cloud (OData)
 * Server-only helpers. Never import from client bundles.
 */
import type { NormalizedJournalEntry } from "./journal";

export type Provider = "odoo" | "sap" | "odoo_sandbox" | "sap_sandbox";

export interface ErpCreds {
  provider: Provider;
  base_url: string;
  db_name?: string | null;
  username?: string | null;
  api_key: string;
}

export interface TestResult {
  ok: boolean;
  provider: Provider;
  latency_ms: number;
  version?: string;
  message: string;
}

export interface PushResult {
  ok: boolean;
  external_id?: string;
  status: number;
  raw: unknown;
  error?: string;
}

const TIMEOUT_MS = 15_000;

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

/* ============================== ODOO ============================== */

async function odooAuthenticate(c: ErpCreds): Promise<number> {
  const r = await jfetch(`${c.base_url.replace(/\/$/, "")}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "authenticate",
        args: [c.db_name ?? "", c.username ?? "", c.api_key, {}],
      },
    }),
  });
  const uid = (r.body as { result?: number } | null)?.result;
  if (!uid || typeof uid !== "number") throw new Error("odoo_auth_failed");
  return uid;
}

async function odooTest(c: ErpCreds): Promise<TestResult> {
  const t0 = Date.now();
  try {
    // 1) version (unauthenticated)
    const v = await jfetch(`${c.base_url.replace(/\/$/, "")}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { service: "common", method: "version", args: [] },
      }),
    });
    const server = (v.body as { result?: { server_version?: string } } | null)?.result
      ?.server_version;
    // 2) authenticate to prove creds
    const uid = await odooAuthenticate(c);
    return {
      ok: true,
      provider: c.provider,
      latency_ms: Date.now() - t0,
      version: server,
      message: `Odoo ${server ?? ""} — uid ${uid}`,
    };
  } catch (e) {
    return {
      ok: false,
      provider: c.provider,
      latency_ms: Date.now() - t0,
      message: e instanceof Error ? e.message : "unknown_error",
    };
  }
}

async function odooPushJournal(c: ErpCreds, j: NormalizedJournalEntry): Promise<PushResult> {
  try {
    const uid = await odooAuthenticate(c);
    const url = `${c.base_url.replace(/\/$/, "")}/jsonrpc`;

    // Create account.move with line_ids inline (using account codes).
    const line_ids = j.lines.map((ln) => [
      0,
      0,
      {
        name: ln.description ?? j.memo,
        debit: ln.debit,
        credit: ln.credit,
        // In real Odoo, account_id must be integer. We store code in ref for the demo/sandbox.
        ref: ln.account_code,
      },
    ]);

    const payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          c.db_name ?? "",
          uid,
          c.api_key,
          "account.move",
          "create",
          [
            {
              ref: j.reference,
              date: j.date,
              journal_id: 1, // default sales/misc journal; user maps later
              move_type: "entry",
              narration: j.memo,
              line_ids,
            },
          ],
        ],
      },
    };
    const r = await jfetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = r.body as { result?: number | number[]; error?: unknown } | null;
    const raw = body?.result;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (!id) {
      return {
        ok: false,
        status: r.status,
        raw: body,
        error:
          (body?.error as { data?: { message?: string } })?.data?.message ?? "odoo_create_failed",
      };
    }
    return { ok: true, external_id: String(id), status: r.status, raw: body };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      raw: null,
      error: e instanceof Error ? e.message : "odoo_push_failed",
    };
  }
}

/* ============================== SAP =============================== */

function sapAuthHeader(c: ErpCreds): Record<string, string> {
  if (c.provider === "sap_sandbox") return { APIKey: c.api_key };
  const basic = Buffer.from(`${c.username ?? ""}:${c.api_key}`).toString("base64");
  return { Authorization: `Basic ${basic}` };
}

async function sapTest(c: ErpCreds): Promise<TestResult> {
  const t0 = Date.now();
  try {
    // Ping the API catalog / user info. On S/4HANA Cloud: /sap/bc/ui2/nav_targets is common;
    // portable smoke test: HEAD on /sap/opu/odata/sap/ (returns 200/401 quickly).
    const url = `${c.base_url.replace(/\/$/, "")}/sap/opu/odata/sap/API_JOURNALENTRY_SRV/$metadata`;
    const r = await jfetch(url, {
      method: "GET",
      headers: { Accept: "application/xml", ...sapAuthHeader(c) },
    });
    return {
      ok: r.ok,
      provider: c.provider,
      latency_ms: Date.now() - t0,
      message: r.ok ? "SAP OData metadata reachable" : `HTTP ${r.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      provider: c.provider,
      latency_ms: Date.now() - t0,
      message: e instanceof Error ? e.message : "unknown_error",
    };
  }
}

async function sapPushJournal(c: ErpCreds, j: NormalizedJournalEntry): Promise<PushResult> {
  try {
    const url = `${c.base_url.replace(/\/$/, "")}/sap/opu/odata/sap/API_JOURNALENTRY_SRV/A_JournalEntry`;
    // Fetch CSRF token first (SAP requirement for POST)
    const tk = await jfetch(url.replace(/\/A_JournalEntry$/, "/"), {
      method: "GET",
      headers: { "x-csrf-token": "fetch", Accept: "application/json", ...sapAuthHeader(c) },
    });
    const csrf =
      ((tk.body as unknown) instanceof Object && (tk.body as { __token?: string })?.__token) ||
      "fetch";

    const [dr, cr] = j.lines;
    const payload = {
      CompanyCode: "1010",
      DocumentReferenceID: j.reference.slice(0, 16),
      AccountingDocumentType: "SA",
      DocumentDate: j.date,
      PostingDate: j.date,
      TransactionCurrency: j.currency,
      DocumentHeaderText: j.memo.slice(0, 25),
      to_Item: {
        results: [
          {
            GLAccount: dr?.account_code,
            DebitCreditCode: "S",
            AmountInTransactionCurrency: dr?.debit ?? 0,
          },
          {
            GLAccount: cr?.account_code,
            DebitCreditCode: "H",
            AmountInTransactionCurrency: cr?.credit ?? 0,
          },
        ],
      },
    };
    const r = await jfetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-csrf-token": String(csrf),
        ...sapAuthHeader(c),
      },
      body: JSON.stringify(payload),
    });
    const body = r.body as { d?: { AccountingDocument?: string } } | null;
    const id = body?.d?.AccountingDocument;
    if (!r.ok || !id) {
      return { ok: false, status: r.status, raw: body, error: `sap_http_${r.status}` };
    }
    return { ok: true, external_id: id, status: r.status, raw: body };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      raw: null,
      error: e instanceof Error ? e.message : "sap_push_failed",
    };
  }
}

/* ============================ Dispatch ============================ */

export async function testConnection(c: ErpCreds): Promise<TestResult> {
  if (c.provider === "odoo" || c.provider === "odoo_sandbox") return odooTest(c);
  if (c.provider === "sap" || c.provider === "sap_sandbox") return sapTest(c);
  return { ok: false, provider: c.provider, latency_ms: 0, message: "unknown_provider" };
}

export async function pushJournal(c: ErpCreds, j: NormalizedJournalEntry): Promise<PushResult> {
  if (c.provider === "odoo" || c.provider === "odoo_sandbox") return odooPushJournal(c, j);
  if (c.provider === "sap" || c.provider === "sap_sandbox") return sapPushJournal(c, j);
  return { ok: false, status: 0, raw: null, error: "unknown_provider" };
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  odoo: "Odoo Production",
  odoo_sandbox: "Odoo Sandbox (Trial)",
  sap: "SAP S/4HANA Cloud",
  sap_sandbox: "SAP Sandbox (Demo)",
};
