import { COUNTRIES } from "./countries";

export type SourceType =
  "gold_souq" | "dar_alifta" | "central_bank" | "jeweler_receipt" | "local_merchant" | "other";

export interface PriceVerification {
  id: string;
  countryCode: string;
  countryName: string;
  currency: string;
  city?: string | undefined;
  goldGram24k: number;
  goldGram21k?: number | undefined;
  silverGramPure: number;
  goldNisab: number;
  silverNisab: number;
  sourceType: SourceType;
  sourceLabel: string;
  contributorName: string;
  contributorRole: string;
  confirmations: number;
  disputes: number;
  status: "verified" | "trending" | "under_review";
  date: string;
  timestamp: string;
  notes?: string | undefined;
  userConfirmed?: boolean;
}

export const SOURCE_TYPE_LABELS: Record<SourceType, { ar: string; en: string }> = {
  gold_souq: { ar: "سوق الصاغة وتجار الذهب المعتمدين", en: "Local Gold Souq & Licensed Jewelers" },
  dar_alifta: {
    ar: "دار الإفتاء / الهيئة الشرعية الرسمية",
    en: "Official Fatwa Board / Sharia Council",
  },
  central_bank: { ar: "البشرة الرسمية للبنك المركزي", en: "Central Bank Official Bulletin" },
  jeweler_receipt: { ar: "فاتورة شراء حديثة وموثقة", en: "Recent Verified Jeweler Invoice" },
  local_merchant: { ar: "تاجر معادن ثمينة محلي", en: "Local Bullion & Precious Metals Trader" },
  other: { ar: "مصادر ميدانية أخرى", en: "Other Field Sources" },
};

/**
 * Earlier builds shipped invented "field verifications" (named contributors, confirmation
 * counts, a verified status). They were never real, so they are no longer shown, and any
 * copy already stored in a browser is removed on read.
 */
const LEGACY_SEED_IDS = new Set<string>([
  "ver-sa-01",
  "ver-eg-01",
  "ver-ae-01",
  "ver-kw-01",
  "ver-jo-01",
  "ver-ma-01",
  "ver-dz-01",
  "ver-qa-01",
  "ver-om-01",
  "ver-tr-01",
]);

const LS_VERIFICATIONS = "nisab_community_verifications_v2";
const LS_USER_CONFIRMED = "nisab_user_confirmed_ids_v2";

/** Entries exist only in this browser: no shared database is connected. */
export function getCommunityVerifications(): PriceVerification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_VERIFICATIONS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const userConfirmed = getUserConfirmedIds();
    const list = (parsed as PriceVerification[]).filter((item) => !LEGACY_SEED_IDS.has(item.id));
    if (list.length !== parsed.length) localStorage.setItem(LS_VERIFICATIONS, JSON.stringify(list));
    return list.map((item) => ({ ...item, userConfirmed: userConfirmed.has(item.id) }));
  } catch {
    return [];
  }
}

export function getUserConfirmedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_USER_CONFIRMED);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveUserConfirmedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_USER_CONFIRMED, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error("Failed to save confirmed IDs", e);
  }
}

function saveVerifications(items: PriceVerification[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_VERIFICATIONS, JSON.stringify(items));
    window.dispatchEvent(new Event("nisab-community-updated"));
  } catch (e) {
    console.error("Failed to save verifications", e);
  }
}

/** Toggle or add visitor confirmation for a given verification item */
export function toggleConfirmVerification(id: string): { confirmed: boolean; total: number } {
  const current = getCommunityVerifications();
  const confirmedIds = getUserConfirmedIds();
  const isAlready = confirmedIds.has(id);

  let newTotal = 0;
  const nextList = current.map((item) => {
    if (item.id === id) {
      const nextCount = isAlready ? Math.max(0, item.confirmations - 1) : item.confirmations + 1;
      newTotal = nextCount;
      return {
        ...item,
        confirmations: nextCount,
        status: nextCount >= 10 ? ("verified" as const) : ("trending" as const),
      };
    }
    return item;
  });

  if (isAlready) {
    confirmedIds.delete(id);
  } else {
    confirmedIds.add(id);
  }

  saveUserConfirmedIds(confirmedIds);
  saveVerifications(nextList);

  return { confirmed: !isAlready, total: newTotal };
}

/** Flag an inaccurate price submission */
export function flagVerification(id: string, reason?: string): boolean {
  const current = getCommunityVerifications();
  const nextList = current.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        disputes: item.disputes + 1,
        status: item.disputes + 1 >= 5 ? ("under_review" as const) : item.status,
      };
    }
    return item;
  });
  saveVerifications(nextList);
  return true;
}

export interface NewVerificationInput {
  countryCode: string;
  city?: string | undefined;
  goldGram24k: number;
  goldGram21k?: number | undefined;
  silverGramPure: number;
  sourceType: SourceType;
  sourceLabel: string;
  contributorName: string;
  contributorRole?: string | undefined;
  notes?: string | undefined;
}

/** Submit a new community verification from a visitor */
export function submitCommunityVerification(input: NewVerificationInput): PriceVerification {
  const country = COUNTRIES.find((c) => c.code === input.countryCode.toUpperCase()) || {
    code: input.countryCode,
    currency: "USD",
    ar: input.countryCode,
    en: input.countryCode,
  };

  const goldNisab = input.goldGram24k * 85;
  const silverNisab = input.silverGramPure * 595;
  const now = new Date();

  const newRecord: PriceVerification = {
    id: `ver-${input.countryCode.toLowerCase()}-${Date.now().toString(36)}`,
    countryCode: country.code,
    countryName: country.ar,
    currency: country.currency,
    city: input.city || undefined,
    goldGram24k: input.goldGram24k,
    goldGram21k: input.goldGram21k || +(input.goldGram24k * 0.875).toFixed(2),
    silverGramPure: input.silverGramPure,
    goldNisab,
    silverNisab,
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel || SOURCE_TYPE_LABELS[input.sourceType]?.ar || "سوق محلي",
    contributorName: input.contributorName.trim() || "زائر موثوق",
    contributorRole: input.contributorRole?.trim() || "زائر مساهم في التوثيق",
    confirmations: 1, // Author confirms it initially
    disputes: 0,
    status: "trending",
    date: now.toISOString().slice(0, 10),
    timestamp: now.toISOString(),
    notes: input.notes?.trim() || undefined,
  };

  const current = getCommunityVerifications();
  const nextList = [newRecord, ...current];
  saveVerifications(nextList);

  // Automatically mark user as confirmed for their own record
  const confirmedIds = getUserConfirmedIds();
  confirmedIds.add(newRecord.id);
  saveUserConfirmedIds(confirmedIds);

  return newRecord;
}

export interface CountryVerificationSummary {
  hasVerifications: boolean;
  totalConfirmations: number;
  verifiedCount: number;
  latestRecord?: PriceVerification | undefined;
  avgGold24k: number;
  avgSilverPure: number;
  communityGoldNisab: number;
  communitySilverNisab: number;
  lowerNisab: number;
  consensusScore: number; // percentage (e.g., 99%)
  statusBadge: "verified" | "trending" | "pending";
}

export function getCountryVerificationSummary(
  countryCode: string,
  spotGoldGram?: number,
  spotSilverGram?: number,
): CountryVerificationSummary {
  const all = getCommunityVerifications();
  const countryRecords = all.filter(
    (r) => r.countryCode.toUpperCase() === countryCode.toUpperCase(),
  );

  if (countryRecords.length === 0) {
    const goldG = spotGoldGram || 0;
    const silverG = spotSilverGram || 0;
    return {
      hasVerifications: false,
      totalConfirmations: 0,
      verifiedCount: 0,
      avgGold24k: goldG,
      avgSilverPure: silverG,
      communityGoldNisab: goldG * 85,
      communitySilverNisab: silverG * 595,
      lowerNisab: Math.min(goldG * 85, silverG * 595),
      consensusScore: 0,
      statusBadge: "pending",
    };
  }

  const latestRecord = countryRecords[0];
  const totalConfirmations = countryRecords.reduce((sum, r) => sum + r.confirmations, 0);
  const totalDisputes = countryRecords.reduce((sum, r) => sum + r.disputes, 0);

  const avgGold24k =
    countryRecords.reduce((sum, r) => sum + r.goldGram24k, 0) / countryRecords.length;
  const avgSilverPure =
    countryRecords.reduce((sum, r) => sum + r.silverGramPure, 0) / countryRecords.length;

  const communityGoldNisab = avgGold24k * 85;
  const communitySilverNisab = avgSilverPure * 595;
  const lowerNisab = Math.min(communityGoldNisab, communitySilverNisab);

  // Consensus score based on ratio of confirmations to disputes
  const totalVotes = totalConfirmations + totalDisputes;
  const consensusScore = totalVotes > 0 ? Math.round((totalConfirmations / totalVotes) * 100) : 95;

  let statusBadge: "verified" | "trending" | "pending" = "pending";
  if (totalConfirmations >= 20 && consensusScore >= 90) {
    statusBadge = "verified";
  } else if (totalConfirmations > 0) {
    statusBadge = "trending";
  }

  return {
    hasVerifications: true,
    totalConfirmations,
    verifiedCount: countryRecords.length,
    latestRecord,
    avgGold24k,
    avgSilverPure,
    communityGoldNisab,
    communitySilverNisab,
    lowerNisab,
    consensusScore,
    statusBadge,
  };
}

export function getOverallCommunityStats() {
  const all = getCommunityVerifications();
  const uniqueCountries = new Set(all.map((r) => r.countryCode));
  const totalConfirmations = all.reduce((sum, r) => sum + r.confirmations, 0);
  const totalDisputes = all.reduce((sum, r) => sum + r.disputes, 0);
  const totalVotes = totalConfirmations + totalDisputes;
  const overallConsensus = totalVotes > 0 ? Math.round((totalConfirmations / totalVotes) * 100) : 0;

  return {
    totalRecords: all.length,
    countriesCount: uniqueCountries.size,
    totalConfirmations,
    overallConsensus,
  };
}
