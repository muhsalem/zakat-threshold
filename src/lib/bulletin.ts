import { GOLD_NISAB_G, SILVER_NISAB_G, TROY_OUNCE_G } from "./nisab";

/**
 * The signed daily bulletin: the one document other programs (the desktop app) import.
 * The body is serialised once and signed as that exact string, so no canonical-JSON
 * rules are needed on either side. ES256 = ECDSA P-256 + SHA-256, IEEE P1363 signature.
 */
export const BULLETIN_SCHEMA = "nisab-bulletin/1";

export type SnapshotRow = {
  day: string;
  taken_at: string;
  gold_usd_oz: number;
  silver_usd_oz: number;
  consensus_status: string;
  deviation_pct: number;
  fx_rates: unknown;
  fx_source: string;
  metals_source: string;
  sources: unknown;
};

export type BulletinPayload = {
  schema: typeof BULLETIN_SCHEMA;
  issuedAt: string;
  day: string;
  takenAt: string;
  goldUsdOz: number;
  silverUsdOz: number;
  /** Pure (24K) metal, USD per gram: oz price ÷ 31.1034768. */
  goldUsdPerGram: number;
  silverUsdPerGram: number;
  weights: { goldG: number; silverG: number };
  consensus: { status: string; deviationPct: number; metalsSource: string; sources: unknown };
  fx: { source: string; ratesPerUsd: unknown };
};

export function buildBulletinPayload(row: SnapshotRow, issuedAt: Date): BulletinPayload {
  return {
    schema: BULLETIN_SCHEMA,
    issuedAt: issuedAt.toISOString(),
    day: row.day,
    takenAt: new Date(row.taken_at).toISOString(),
    goldUsdOz: row.gold_usd_oz,
    silverUsdOz: row.silver_usd_oz,
    goldUsdPerGram: row.gold_usd_oz / TROY_OUNCE_G,
    silverUsdPerGram: row.silver_usd_oz / TROY_OUNCE_G,
    weights: { goldG: GOLD_NISAB_G, silverG: SILVER_NISAB_G },
    consensus: {
      status: row.consensus_status,
      deviationPct: row.deviation_pct,
      metalsSource: row.metals_source,
      sources: row.sources,
    },
    fx: { source: row.fx_source, ratesPerUsd: row.fx_rates },
  };
}

const toBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const fromBase64 = (text: string) => {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const ES256 = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN = { name: "ECDSA", hash: "SHA-256" } as const;

export type SignedBulletin = { keyId: string; alg: "ES256"; payload: string; signature: string };

/** `pkcs8Base64` is the private key; it lives only in a server secret. */
export async function signBulletin(
  payload: BulletinPayload,
  pkcs8Base64: string,
  keyId: string,
): Promise<SignedBulletin> {
  const key = await crypto.subtle.importKey("pkcs8", fromBase64(pkcs8Base64), ES256, false, [
    "sign",
  ]);
  const body = JSON.stringify(payload);
  const signature = await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(body));
  return { keyId, alg: "ES256", payload: body, signature: toBase64(signature) };
}

/** `spkiBase64` is the public key (the same one the desktop app embeds). */
export async function verifyBulletin(
  bulletin: SignedBulletin,
  spkiBase64: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey("spki", fromBase64(spkiBase64), ES256, false, [
    "verify",
  ]);
  return crypto.subtle.verify(
    SIGN,
    key,
    fromBase64(bulletin.signature),
    new TextEncoder().encode(bulletin.payload),
  );
}
