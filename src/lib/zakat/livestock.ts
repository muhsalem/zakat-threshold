/**
 * زكاة الأنعام السائمة (Livestock Zakat — Grazing Herds)
 * وفق جداول الفقه الكلاسيكي المعتمدة (البخاري ٦-١٤٧٤، أبو داود ١٥٦٨-١٥٧٢،
 * ومعيار AAOIFI 35 § 5/4 — زكاة الأنعام).
 *
 * الشروط الأساسية:
 * 1. النصاب: إبل ≥ 5، بقر ≥ 30، غنم ≥ 40.
 * 2. السَّوم: أن ترعى الحول أو أكثره في الكلأ المباح (لا معلوفة تجارياً).
 * 3. الحول: مرور سنة قمرية على بلوغها النصاب.
 *
 * لا تُطبَّق هذه الجداول على قطعان الإنتاج التجاري المعلوفة (تُزكّى عروض تجارة —
 * انظر src/lib/zakatExtended.ts:calcAnimalProductionZakat).
 */

export type LivestockKind = "camels" | "cattle" | "sheep";

export interface LivestockDueUnit {
  count: number;
  description: string; // مثال: "بنت مخاض"، "تبيع أو تبيعة"، "شاة"
  age?: string; // العمر المطلوب اختصاراً
}

export interface LivestockResult {
  kind: LivestockKind;
  headcount: number;
  belowNisab: boolean;
  due: LivestockDueUnit[]; // قد يكون فارغاً إذا لم يبلغ النصاب
  note: string;
  reference: string; // مرجع فقهي
}

// ============ الإبل ============
// جدول بنص حديث أنس بن مالك في صحيح البخاري (١٤٥٤).
function camelsDue(n: number): LivestockDueUnit[] {
  if (n < 5) return [];
  if (n <= 9) return [{ count: 1, description: "شاة", age: "جذعة أو ثنية" }];
  if (n <= 14) return [{ count: 2, description: "شاة" }];
  if (n <= 19) return [{ count: 3, description: "شاة" }];
  if (n <= 24) return [{ count: 4, description: "شاة" }];
  if (n <= 35) return [{ count: 1, description: "بنت مخاض", age: "أتمّت سنة" }];
  if (n <= 45) return [{ count: 1, description: "بنت لبون", age: "أتمّت سنتين" }];
  if (n <= 60) return [{ count: 1, description: "حِقّة", age: "أتمّت 3 سنوات" }];
  if (n <= 75) return [{ count: 1, description: "جَذَعة", age: "أتمّت 4 سنوات" }];
  if (n <= 90) return [{ count: 2, description: "بنت لبون" }];
  if (n <= 120) return [{ count: 2, description: "حِقّة" }];
  // ما زاد على 120: في كل 40 بنت لبون، وفي كل 50 حِقّة (رأي الجمهور).
  const forties = Math.floor(n / 40);
  const fifties = Math.floor(n / 50);
  // نختار التركيبة التي تستوعب العدد كاملاً بأكبر عدد من الحِقاق (رأي الأكثر).
  const bestFifties = Math.floor(n / 50);
  const remainder = n - bestFifties * 50;
  const bintLabun = Math.floor(remainder / 40);
  return [
    { count: bestFifties, description: "حِقّة" },
    { count: bintLabun, description: "بنت لبون" },
  ].filter((u) => u.count > 0);
}

// ============ البقر ============
// حديث معاذ بن جبل في السنن (أبو داود ١٥٧٦، الترمذي ٦٢٣).
function cattleDue(n: number): LivestockDueUnit[] {
  if (n < 30) return [];
  const tabee = Math.floor(n / 30); // تبيع/تبيعة لكل 30
  const musinnah = Math.floor(n / 40); // مسنّة لكل 40
  // القاعدة: في كل 30 تبيع، وفي كل 40 مسنّة. تُطبّق التركيبة المستوعِبة للعدد كاملاً.
  // نستخدم أكبر عدد من "المسنّات" ثم نكمّل بالتبيع.
  const bestMusinnah = Math.floor(n / 40);
  const rem = n - bestMusinnah * 40;
  const tabeeCount = Math.floor(rem / 30);
  const combo = [
    { count: bestMusinnah, description: "مسنّة", age: "أتمّت سنتين" },
    { count: tabeeCount, description: "تبيع أو تبيعة", age: "أتمّت سنة" },
  ].filter((u) => u.count > 0);
  return combo.length ? combo : [{ count: tabee, description: "تبيع أو تبيعة" }];
}

// ============ الغنم (ضأن ومعز) ============
// حديث أنس (البخاري ١٤٥٤).
function sheepDue(n: number): LivestockDueUnit[] {
  if (n < 40) return [];
  if (n <= 120) return [{ count: 1, description: "شاة" }];
  if (n <= 200) return [{ count: 2, description: "شاة" }];
  if (n <= 399) return [{ count: 3, description: "شاة" }];
  // ما زاد: في كل 100 شاة.
  const count = Math.floor(n / 100);
  return [{ count, description: "شاة" }];
}

export function calcLivestockZakat(
  kind: LivestockKind,
  headcount: number,
  isGrazing = true,
): LivestockResult {
  const n = Math.max(0, Math.floor(headcount));
  const nisab = kind === "camels" ? 5 : kind === "cattle" ? 30 : 40;

  if (!isGrazing) {
    return {
      kind,
      headcount: n,
      belowNisab: false,
      due: [],
      note: "قطعان الإنتاج التجاري المعلوفة تُزكّى زكاة عروض تجارة (2.5% من القيمة السوقية).",
      reference: "AAOIFI 35 § 5/4/3",
    };
  }

  if (n < nisab) {
    return {
      kind,
      headcount: n,
      belowNisab: true,
      due: [],
      note: `لم يبلغ النصاب (${nisab} رأس).`,
      reference: "البخاري ١٤٥٤ — كتاب الزكاة",
    };
  }

  const due =
    kind === "camels" ? camelsDue(n) : kind === "cattle" ? cattleDue(n) : sheepDue(n);

  return {
    kind,
    headcount: n,
    belowNisab: false,
    due,
    note: "زكاة الأنعام السائمة عن الحول القمري كاملاً.",
    reference:
      kind === "cattle"
        ? "أبو داود ١٥٧٦ — حديث معاذ بن جبل"
        : "البخاري ١٤٥٤ — كتاب الزكاة",
  };
}
