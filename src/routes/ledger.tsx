import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Upload,
  Printer,
  Calculator,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";

import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  getLocalLedger,
  upsertLedgerRecord,
  deleteLedgerRecord,
  calculateLedgerStats,
  type ZakatYearRecord,
  type ZakatStatus,
  saveLocalLedger,
} from "@/lib/ledger";
import { useNisab } from "@/components/site/Prices";
import { calculateYearNisab } from "@/lib/historical-nisab";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "سجل الزكاة متعدد الأعوام · نِصاب" },
      {
        name: "description",
        content:
          "توثيق ومتابعة زكواتك للسنوات السابقة والحالية، مع تتبع سداد المصارف والأثر التراكمي وتبرئة الذمة.",
      },
      { property: "og:title", content: "سجل الزكاة متعدد الأعوام · نِصاب" },
      {
        property: "og:description",
        content: "قاعدة بيانات شخصية لتوثيق ومتابعة أداء فريضة الزكاة عبر الأعوام.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LedgerPage,
});

export function LedgerPage() {
  const { currency, t } = useI18n();
  const { values, money } = useNisab();
  const [records, setRecords] = useState<ZakatYearRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<"all" | ZakatStatus>("all");

  // Form State for new/edit record
  const [yearNumber, setYearNumber] = useState<number>(1447);
  const [yearType, setYearType] = useState<"hijri" | "gregorian">("hijri");
  const [netWealth, setNetWealth] = useState<string>("100000");
  const [nisabStandard, setNisabStandard] = useState<"silver" | "gold">("silver");
  const [nisabThreshold, setNisabThreshold] = useState<string>("3000");
  const [zakatRate, setZakatRate] = useState<number>(0.025);
  const [zakatPaid, setZakatPaid] = useState<string>("2500");
  const [status, setStatus] = useState<ZakatStatus>("fully_paid");
  const [recipientChannels, setRecipientChannels] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    setRecords(getLocalLedger());
  }, []);

  const stats = calculateLedgerStats(records);

  const filteredRecords = records.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (yearType === "hijri" && yearNumber < 2) {
      alert(
        "يبدأ تدقيق وتوثيق فريضة الزكاة من السنة الثانية للهجرة (2 هـ)؛ لأن فرض الزكاة ربع العشر وتحديد الأنصبة كان في السنة الثانية من الهجرة النبوية بالمدينة المنورة.",
      );
      return;
    }

    const parsedWealth = parseFloat(netWealth) || 0;
    const parsedNisab =
      parseFloat(nisabThreshold) ||
      (values ? (nisabStandard === "silver" ? values.silver : values.gold) : 3000);
    const calculatedDue = parsedWealth >= parsedNisab ? parsedWealth * zakatRate : 0;
    const parsedPaid = parseFloat(zakatPaid) || 0;

    let computedStatus: ZakatStatus = status;
    if (parsedPaid >= calculatedDue && calculatedDue > 0) {
      computedStatus = "fully_paid";
    } else if (parsedPaid > 0 && parsedPaid < calculatedDue) {
      computedStatus = "partially_paid";
    } else if (calculatedDue === 0) {
      computedStatus = "exempt";
    }

    const yearLabel = yearType === "hijri" ? `${yearNumber} هـ` : `${yearNumber} م`;

    const newRecord: ZakatYearRecord = {
      id: `zakat-${yearType}-${yearNumber}-${Date.now()}`,
      yearLabel,
      yearType,
      yearNumber,
      country: "SA",
      currency,
      nisabStandard,
      nisabThreshold: parsedNisab,
      netWealth: parsedWealth,
      zakatRate,
      zakatDue: calculatedDue,
      zakatPaid: parsedPaid,
      status: computedStatus,
      paidDate: new Date().toISOString().split("T")[0],
      recipientChannels,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = upsertLedgerRecord(newRecord);
    setRecords(updated);
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا السجل الزكوي؟")) {
      const updated = deleteLedgerRecord(id);
      setRecords(updated);
    }
  };

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `nisab-zakat-ledger-${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          saveLocalLedger(json);
          setRecords(json);
          alert("تم استيراد سجل الزكوات بنجاح!");
        }
      } catch {
        alert("ملف غير صالح.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Page
      eyebrow="سجل الزكاة الوقفي"
      title="سجل الزكاة متعدد الأعوام"
      sub="توثيق زكواتك للسنوات الحالية والسابقة، مع تتبع سداد المصارف وتبرئة الذمة بدقة وخصوصية تامة."
    >
      {/* Header action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4 me-1.5" />
            {showAddForm ? "إلغاء الإدخال" : "توثيق سنة زكوية جديدة"}
          </Button>

          <Button asChild variant="outline">
            <Link to="/calculator">
              <Calculator className="size-4 me-1.5" />
              حاسبة النصاب الحالية
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleExportJson} variant="outline" size="sm">
            <Download className="size-3.5 me-1" />
            تصدير نسخة احتياطية
          </Button>

          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            <Upload className="size-3.5 me-1" />
            استيراد
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <Button onClick={() => window.print()} variant="ghost" size="sm">
            <Printer className="size-3.5 me-1" />
            طباعة الكشف
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface p-5 border border-border">
          <p className="eyebrow text-muted-foreground text-xs">إجمالي الزكاة المؤداة تاريخياً</p>
          <p className="num mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {money(stats.totalZakatPaid)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">تم إخراجها للمصارف الشرعية المقررة</p>
        </div>

        <div className="card-surface p-5 border border-border">
          <p className="eyebrow text-muted-foreground text-xs">الزكاة المستحقة المتبقية</p>
          <p className="num mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">
            {money(stats.remainingDue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.remainingDue === 0 ? "ذمتك بريئة بحمد الله" : "مبالغ قيد السداد هذا الحول"}
          </p>
        </div>

        <div className="card-surface p-5 border border-border">
          <p className="eyebrow text-muted-foreground text-xs">الأعوام الموثقة</p>
          <p className="num mt-2 text-2xl font-bold text-foreground">
            {stats.totalRecords}{" "}
            <span className="text-sm font-normal text-muted-foreground">سنوات</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.fullyPaidYearsCount} أعوام مدفوعة بالكامل
          </p>
        </div>

        <div className="card-surface p-5 border border-border">
          <p className="eyebrow text-muted-foreground text-xs">نسبة الإيفاء بالزكاة</p>
          <p className="num mt-2 text-2xl font-bold text-primary">
            {stats.totalZakatDue > 0
              ? `${((stats.totalZakatPaid / stats.totalZakatDue) * 100).toFixed(0)}%`
              : "100%"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            معدل إخراج الزكاة عبر السنوات المسجلة
          </p>
        </div>
      </section>

      {/* Add / Edit Record Form */}
      {showAddForm && (
        <form
          onSubmit={handleSaveRecord}
          className="card-surface mt-6 p-6 sm:p-8 border border-accent/40 bg-card"
        >
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Calendar className="size-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">توثيق سنة زكوية في السجل</h3>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-foreground">نوع التقويم</label>
              <select
                value={yearType}
                onChange={(e) => {
                  const val = e.target.value as "hijri" | "gregorian";
                  setYearType(val);
                  setZakatRate(val === "hijri" ? 0.025 : 0.02577);
                }}
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              >
                <option value="hijri">تقويم هجري (قمري - 2.5%)</option>
                <option value="gregorian">تقويم ميلادي (شمسي - 2.577%)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                رقم السنة {yearType === "hijri" && "(من 2 هـ فما بعد)"}
              </label>
              <input
                type="number"
                min={yearType === "hijri" ? 2 : 1900}
                value={yearNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setYearNumber(yearType === "hijri" ? Math.max(2, val) : val);
                }}
                placeholder={yearType === "hijri" ? "1446" : "2024"}
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              />
              {yearType === "hijri" && (
                <p className="mt-1 text-[0.68rem] text-muted-foreground">
                  يبدأ التدقيق من 2 هـ (تاريخ فرض الزكاة)
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                الوعاء الزكوي الصافي ({currency})
              </label>
              <input
                type="number"
                value={netWealth}
                onChange={(e) => setNetWealth(e.target.value)}
                placeholder="100000"
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">معيار النصاب المعتمد</label>
              <select
                value={nisabStandard}
                onChange={(e) => setNisabStandard(e.target.value as "silver" | "gold")}
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              >
                <option value="silver">نصاب الفضة (الأحظ للفقراء)</option>
                <option value="gold">نصاب الذهب (85 جم)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  قيمة النصاب في ذلك العام ({currency})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const rate = data?.rates?.[currency] ?? 1;
                    const info = calculateYearNisab(yearNumber, yearType === "hijri", rate);
                    const val = nisabStandard === "silver" ? info.silverNisab : info.goldNisab;
                    setNisabThreshold(Math.round(val).toString());
                  }}
                  className="text-[0.7rem] text-primary underline hover:opacity-80"
                >
                  جلب النصاب التاريخي تلقائياً
                </button>
              </div>
              <input
                type="number"
                value={nisabThreshold}
                onChange={(e) => setNisabThreshold(e.target.value)}
                placeholder="3000"
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                المبلغ المدفوع بالفعل ({currency})
              </label>
              <input
                type="number"
                value={zakatPaid}
                onChange={(e) => setZakatPaid(e.target.value)}
                placeholder="2500"
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground">
                الجهة / المصرف المدفوع إليه
              </label>
              <input
                type="text"
                value={recipientChannels}
                onChange={(e) => setRecipientChannels(e.target.value)}
                placeholder="مثال: منصة إحسان، بيت الزكاة، فقراء ومساكين الحي، أقارب مستحقون"
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">حالة السداد</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ZakatStatus)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              >
                <option value="fully_paid">تم الإخراج بالكامل</option>
                <option value="partially_paid">مدفوع جزئياً</option>
                <option value="due">مستحق في الذمة</option>
                <option value="exempt">معفى (لم يبلغ النصاب)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-medium text-foreground">
                ملاحظات شرعية أو توثيقية
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي تفاصيل خاصة بحول المال أو نية الإخراج"
                className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
              إلغاء
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground">
              حفظ وتوثيق في السجل
            </Button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            كافة السنوات ({records.length})
          </button>
          <button
            onClick={() => setFilter("fully_paid")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === "fully_paid"
                ? "bg-emerald-700 text-white"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            مدفوع بالكامل ({stats.fullyPaidYearsCount})
          </button>
          <button
            onClick={() => setFilter("partially_paid")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === "partially_paid"
                ? "bg-amber-700 text-white"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            مدفوع جزئياً
          </button>
          <button
            onClick={() => setFilter("due")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === "due"
                ? "bg-red-700 text-white"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            مستحق في الذمة
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          يتم الحفظ والمزامنة محلياً وعلى خادم المنصة بأعلى درجات الخصوصية
        </span>
      </div>

      {/* Records Table / Cards */}
      {filteredRecords.length === 0 ? (
        <div className="card-surface mt-6 p-12 text-center border border-border">
          <FileSpreadsheet className="mx-auto size-12 text-muted-foreground/50" />
          <h4 className="mt-4 text-base font-semibold text-foreground">
            لا توجد سجلات تطابق الفلتر
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            أضف سنواتك الزكوية الحالية والسابقة لتتبع التزامك بفريضة الزكاة وتبرئة ذمتك.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredRecords.map((r) => {
            const isFullyPaid = r.status === "fully_paid";
            const isDue = r.status === "due";
            const isPartial = r.status === "partially_paid";

            return (
              <article
                key={r.id}
                className="card-surface p-5 sm:p-6 border border-border transition-all hover:border-accent/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary font-[family-name:var(--font-display)] font-bold text-lg">
                      {r.yearNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-foreground">{r.yearLabel}</h4>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isFullyPaid
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isDue
                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                : isPartial
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {isFullyPaid && <CheckCircle2 className="size-3 me-1" />}
                          {isDue && <AlertCircle className="size-3 me-1" />}
                          {isPartial && <Clock className="size-3 me-1" />}
                          {isFullyPaid
                            ? "تم السداد بالكامل"
                            : isDue
                              ? "مستحق في الذمة"
                              : isPartial
                                ? "سداد جزئي"
                                : "معفى"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        التقويم {r.yearType === "hijri" ? "الهجري (2.5%)" : "الميلادي (2.577%)"} ·
                        معيار نصاب {r.nisabStandard === "silver" ? "الفضة" : "الذهب"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleDelete(r.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  <div>
                    <span className="text-xs text-muted-foreground">الوعاء الزكوي الصافي</span>
                    <p className="num mt-1 text-base font-semibold text-foreground">
                      {money(r.netWealth)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground">الزكاة الواجبة</span>
                    <p className="num mt-1 text-base font-semibold text-primary">
                      {money(r.zakatDue)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground">المبلغ المدفوع</span>
                    <p className="num mt-1 text-base font-semibold text-emerald-700 dark:text-emerald-400">
                      {money(r.zakatPaid)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground">المتبقي المطلوب إخراجه</span>
                    <p className="num mt-1 text-base font-semibold text-amber-700 dark:text-amber-400">
                      {money(Math.max(0, r.zakatDue - r.zakatPaid))}
                    </p>
                  </div>
                </div>

                {(r.recipientChannels || r.notes) && (
                  <div className="mt-4 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                    {r.recipientChannels && (
                      <p>
                        <strong className="text-foreground">المصارف والجهات:</strong>{" "}
                        {r.recipientChannels}
                      </p>
                    )}
                    {r.notes && (
                      <p className="mt-1">
                        <strong className="text-foreground">ملاحظات:</strong> {r.notes}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Page>
  );
}
