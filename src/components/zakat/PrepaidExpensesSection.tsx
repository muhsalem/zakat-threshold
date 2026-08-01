import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import {
  runPrepaidExpenses,
  PREPAID_PRESETS,
  type PrepaidExpenseInput,
  type PrepaidRecoverability,
  type PrepaidMethodology,
} from "@/lib/zakat/prepaid-expenses";

const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

const RECOVERABILITY_LABELS: Record<PrepaidRecoverability, string> = {
  refundable: "قابل للاسترداد نقداً",
  service_only: "منفعة/خدمة لا تُردّ",
  doubtful: "مشكوك في استرداده",
};

const METHODOLOGY_LABELS: Record<PrepaidMethodology, string> = {
  "aaoifi-35": "AAOIFI 35 — المسترد فقط يدخل الوعاء",
  "all-assets": "الاحتياط — كل رصيد غير مستهلك يدخل",
  none: "لا يدخل شيء (منفعة مستقبلية)",
};

const TREATMENT_BADGE: Record<string, { label: string; cls: string }> = {
  add_full: { label: "يُضاف للوعاء", cls: "bg-primary/10 text-primary border-primary/30" },
  defer_until_received: {
    label: "يؤجَّل حتى القبض",
    cls: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  no_effect: { label: "لا أثر", cls: "bg-muted text-muted-foreground" },
};

export function PrepaidExpensesSection({
  scope = "both",
  currencyName = "ر.س",
  onChange,
}: {
  scope?: "individual" | "company" | "both";
  currencyName?: string;
  onChange?: (netBaseEffect: number) => void;
}) {
  const presets = useMemo(
    () => PREPAID_PRESETS.filter((p) => p.scope === "both" || p.scope === scope || scope === "both"),
    [scope],
  );

  const [methodology, setMethodology] = useState<PrepaidMethodology>("aaoifi-35");
  const [items, setItems] = useState<PrepaidExpenseInput[]>([]);

  const result = useMemo(() => runPrepaidExpenses(items, methodology), [items, methodology]);

  const emit = (next: PrepaidExpenseInput[], m: PrepaidMethodology = methodology) => {
    setItems(next);
    onChange?.(runPrepaidExpenses(next, m).netBaseEffect);
  };

  const update = (id: string, patch: Partial<PrepaidExpenseInput>) =>
    emit(items.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const addPreset = (key: string) => {
    const p = presets.find((x) => x.key === key);
    if (!p) return;
    emit([
      ...items,
      {
        id: `${key}-${Date.now()}`,
        label: p.label,
        unusedBalance: 0,
        recoverability: p.recoverability,
      },
    ]);
  };

  return (
    <Card className="border-primary/20 shadow-soft" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-primary" />
          المصروفات المدفوعة مقدماً وأثرها الزكوي
          <div className="ms-auto w-full sm:w-80">
            <Select
              value={methodology}
              onValueChange={(v) => {
                setMethodology(v as PrepaidMethodology);
                onChange?.(runPrepaidExpenses(items, v as PrepaidMethodology).netBaseEffect);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METHODOLOGY_LABELS) as PrepaidMethodology[]).map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {METHODOLOGY_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
        <p className="text-[11px] leading-relaxed text-muted-foreground mt-1">
          القاعدة: المدفوع مقدماً <b>ليس مصروفاً زكوياً حتى يُستهلك</b>. الرصيد غير المستهلك عند
          الحول إن كان <b>قابلاً للاسترداد نقداً</b> فهو دَين مرجوّ يُضاف للوعاء، وإن كان منفعة
          لا تُردّ (إيجار/اشتراك/تأمين) فلا يدخل الوعاء، والمشكوك فيه يُؤجَّل حتى القبض.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button
              key={p.key}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[11px]"
              title={p.hint}
              onClick={() => addPreset(p.key)}
            >
              <Plus className="h-3 w-3" /> {p.label}
            </Button>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            أضف بنداً من القوالب أعلاه لبيان أثره على الوعاء الزكوي.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const line = result.lines.find((l) => l.id === item.id);
              const badge = TREATMENT_BADGE[line?.treatment ?? "no_effect"];
              return (
                <div key={item.id} className="rounded-lg border p-3 space-y-2 bg-card">
                  <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <Input
                      className="h-8 text-xs"
                      value={item.label}
                      onChange={(e) => update(item.id, { label: e.target.value })}
                      aria-label="اسم البند"
                    />
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      inputMode="decimal"
                      value={item.unusedBalance || ""}
                      placeholder={`الرصيد غير المستهلك (${currencyName})`}
                      onChange={(e) =>
                        update(item.id, { unusedBalance: Number(e.target.value) || 0 })
                      }
                      aria-label="الرصيد غير المستهلك"
                    />
                    <Select
                      value={item.recoverability}
                      onValueChange={(v) =>
                        update(item.id, { recoverability: v as PrepaidRecoverability })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(RECOVERABILITY_LABELS) as PrepaidRecoverability[]).map(
                          (r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {RECOVERABILITY_LABELS[r]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      aria-label="حذف البند"
                      onClick={() => emit(items.filter((x) => x.id !== item.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {line && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className={badge.cls}>
                        {badge.label}
                      </Badge>
                      <span className="font-mono">{line.ruleId}</span>
                      <span className="flex-1 min-w-[12rem] leading-relaxed">{line.rationale}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3 text-xs">
          <Summary label="يُضاف للوعاء" value={result.totalAddable} currency={currencyName} tone="primary" />
          <Summary label="مؤجَّل حتى القبض" value={result.totalDeferred} currency={currencyName} />
          <Summary label="خارج الوعاء" value={result.totalIgnored} currency={currencyName} />
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          المرجع: معيار AAOIFI رقم 35 (الزكاة) — الأصول الزكوية تشمل الحقوق المالية القابلة
          للاسترداد؛ وقرار مجمع الفقه الإسلامي في زكاة الديون المرجوّة والمشكوك فيها.
        </p>
      </CardContent>
    </Card>
  );
}

function Summary({
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
    <div
      className={`rounded-lg border p-3 ${tone === "primary" ? "border-primary/30 bg-primary/5" : "bg-muted/40"}`}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${tone === "primary" ? "text-primary" : ""}`}>
        {fmt(value)} {currency}
      </div>
    </div>
  );
}
