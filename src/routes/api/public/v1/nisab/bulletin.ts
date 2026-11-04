import { createFileRoute } from "@tanstack/react-router";

import { buildBulletinPayload, signBulletin, type SnapshotRow } from "@/lib/bulletin";
import { CORS, json, publicDb } from "@/lib/public-api.server";

/**
 * The signed bulletin of the latest immutable daily snapshot: the authoritative feed other
 * programs import. It is never served unsigned: without a signing key the answer is 503,
 * so a client can always tell "not available" from "available and genuine".
 */
export const Route = createFileRoute("/api/public/v1/nisab/bulletin")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const privateKey = process.env["NISAB_BULLETIN_SIGNING_KEY"];
        const keyId = process.env["NISAB_BULLETIN_KEY_ID"] ?? "nisab-1";
        if (!privateKey) return json({ error: "bulletin signing is not configured" }, 503);

        const { data, error } = await publicDb()
          .from("price_snapshots")
          .select(
            "day,taken_at,gold_usd_oz,silver_usd_oz,consensus_status,deviation_pct,fx_rates,fx_source,metals_source,sources",
          )
          .order("day", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return json({ error: "snapshot store unavailable" }, 503);
        if (!data) return json({ error: "no snapshot yet" }, 404);

        try {
          const payload = buildBulletinPayload(data as SnapshotRow, new Date());
          return json(await signBulletin(payload, privateKey, keyId));
        } catch {
          return json({ error: "bulletin signing failed" }, 503);
        }
      },
    },
  },
});
