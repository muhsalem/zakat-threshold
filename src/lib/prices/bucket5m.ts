const BUCKET_MS = 5 * 60_000;

/**
 * بداية شريحة الخمس دقائق التي تقع فيها اللحظة.
 *
 * أساس idempotency في metal_price_ticks: القيد UNIQUE على
 * (bucket_5m, metal, currency) يجعل تشغيلين في نفس الشريحة — إعادة محاولة
 * من الكرون، أو استدعاء يدوي — يُحدِّثان صفاً واحداً بدل أن يُكرِّرا الرصد.
 * بدونه تتضخّم السلسلة الزمنية بنقاط زائفة تُفسد أي متوسط أو رسم بياني.
 */
export function bucket5m(at: Date): string {
  return new Date(Math.floor(at.getTime() / BUCKET_MS) * BUCKET_MS).toISOString();
}
