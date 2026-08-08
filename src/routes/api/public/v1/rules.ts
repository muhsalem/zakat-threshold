import { createFileRoute } from "@tanstack/react-router";
import { rateLimit } from "@/lib/rate-limit.server";
import { detail, listV1ErrorCodes, v1ErrorResponse } from "@/lib/api/v1-errors";
import {
  ZAKAT_RULES,
  evaluateRuleActivation,
  validateCatalog,
  RULES_CATALOG_VERSION,
  getSource,
} from "@/lib/zakat/rules-catalog";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300",
};

export const Route = createFileRoute("/api/public/v1/rules")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const rl = await rateLimit(request, { key: "rules-v1", limit: 60, windowMs: 60_000 });
        if (!rl.ok) {
          return v1ErrorResponse("ZKT-1040", CORS, {
            details: [
              detail("ZKT-1040", {
                message: `تجاوزت 60 طلباً في الدقيقة — أعد المحاولة بعد ${rl.retryAfter} ثانية.`,
              }),
            ],
            extraHeaders: { "Retry-After": String(rl.retryAfter) },
          });
        }

        const url = new URL(request.url);
        const assetType = url.searchParams.get("assetType");
        const now = new Date();

        const rules = ZAKAT_RULES.filter((r) => !assetType || r.assetType === assetType).map((r) => {
          const activation = evaluateRuleActivation(r, now);
          const src = getSource(r.sourceId);
          return {
            ruleId: r.ruleId,
            name: r.name,
            assetType: r.assetType,
            zakatStatus: r.zakatStatus,
            madhab: r.madhab,
            methodology: r.methodology,
            reference: r.reference,
            requiresHumanReview: r.requiresHumanReview,
            approval: r.approval,
            effectiveDate: r.effectiveDate,
            version: r.version,
            active: activation.active,
            blockedReasons: activation.active ? undefined : activation.reasons,
            source: src
              ? { id: src.id, kind: src.kind, citation: src.citation, verification: src.verification }
              : null,
          };
        });

        return new Response(
          JSON.stringify({
            apiVersion: "v1",
            status: "success",
            catalogVersion: RULES_CATALOG_VERSION,
            catalogIssues: validateCatalog(),
            counts: {
              total: rules.length,
              active: rules.filter((r) => r.active).length,
              blocked: rules.filter((r) => !r.active).length,
            },
            rules,
            /** كتالوج أكواد الأخطاء الموحّدة لواجهة v1 */
            errorCodes: listV1ErrorCodes(),
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: CORS },
        );
      },
    },
  },
});
