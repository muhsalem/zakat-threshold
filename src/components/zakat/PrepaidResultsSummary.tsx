import type { PrepaidExpensesResult } from "@/lib/zakat/prepaid-expenses";

const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

export function PrepaidResultsSummary({
  result,
  currencyName = "ر.س",
  zakatRate = 0.025,
  scope = "both",
}: {
  result: PrepaidExpensesResult;
  currencyName?: string;
  zakatRate?: number;
  scope?: "individual" | "company" | "both";
}) {
  const zakatEffect = result.netBaseEffect * zakatRate;
  const deferredZakat = result.totalDeferred * zakatRate;
  const errors = result.issues.filter((i) => i.level === "error").length;
  const who = scope === "company" ? "زكاة الشركة" : scope === "individual" ? "زكاة الفرد" : "الزكاة";

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">ملخص المصروفات المدفوعة مقدماً في النتائج</h4>
        <span className="text-[11px] text-muted-foreground">
          إجمالي الأرصدة المدخلة: {fmt(result.totalBalances)} {currencyName}
        </span>
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-4">
        <Cell label="مُضاف للوعاء" value={result.totalAddable} currency={currencyName} tone="primary" />
        <Cell label="مؤجَّل حتى القبض" value={result.totalDeferred} currency={currencyName} />
        <Cell label="مخصوم/خارج الوعاء" value={result.totalIgnored} currency={currencyName} />
        <Cell
          label={`أثره على ${who} (${(zakatRate * 100).toFixed(2)}%)`}
          value={zakatEffect}
          currency={currencyName}
          tone="primary"
        />
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        صافي أثر البند على الوعاء: <b>{fmt(result.netBaseEffect)}</b> {currencyName} — أي زيادة
        قدرها <b>{fmt(zakatEffect)}</b> {currencyName} في {who}. والمؤجَّل ({fmt(result.totalDeferred)}{" "}
        {currencyName}) يُزكّى عند القبض بما يعادل <b>{fmt(deferredZakat)}</b> {currencyName} لسنة
        واحدة.
        {errors > 0 && (
          <>
            {" "}
            <span className="text-destructive">
              يوجد {errors} تعارض في التصنيف يجب معالجته قبل اعتماد الإقرار.
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function Cell({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone?: "primary";
}) {
  return (
    <div className={`rounded-md border p-2 ${tone === "primary" ? "border-primary/30 bg-background" : "bg-background/60"}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${tone === "primary" ? "text-primary" : ""}`}>
        {fmt(value)} {currency}
      </div>
    </div>
  );
}

export default PrepaidResultsSummary;
