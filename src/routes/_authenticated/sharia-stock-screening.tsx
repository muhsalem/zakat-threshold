import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Upload,
  Loader2,
  Scale,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileDown,
  Printer,
  Archive,
  Trash2,
  Info,
} from "lucide-react";
import {
  computeStockAudit,
  compareExtracts,
  METHODOLOGIES,
  fmtNum,
  num,
  type MethodologyKey,
  type StockAuditExtract,
  type ComputedStockAudit,
  type VerificationResult,
} from "@/lib/shariaStockScreening";
import {
  listShariaStockScreenings,
  getShariaStockScreening,
  saveShariaStockScreening,
  updateShariaStockScreeningAnswers,
  deleteShariaStockScreening,
  type ScreeningPayload,
  type ScreeningListItem,
  type ContractAnswer,
} from "@/lib/shariaStockScreeningStore.functions";

export const Route = createFileRoute("/_authenticated/sharia-stock-screening")({
  head: () => ({
    meta: [
      { title: "الفرز الشرعي لأسهم الشركات — نِصاب" },
      {
        name: "description",
        content:
          "فرز شرعي لأسهم الشركات المتداوَلة وفق منهجيات أيوفي وداو جونز الإسلامي وS&P، باستخراج مزدوج للتحقق وحساب حتمي للنسب.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShariaStockScreeningPage,
});

const toneColor = {
  pass: "text-success",
  warn: "text-warning",
  fail: "text-destructive",
} as const;
const toneBg = {
  pass: "border-success/40 bg-success/5",
  warn: "border-warning/40 bg-warning/5",
  fail: "border-destructive/40 bg-destructive/5",
} as const;
const statusLabel = { pass: "ضمن الحد", warning: "قرب الحد", fail: "تجاوز الحد" } as const;
const statusColor = {
  pass: "text-success",
  warning: "text-warning",
  fail: "text-destructive",
} as const;
const sevLabel = { high: "جوهرية", medium: "متوسطة", low: "ثانوية" } as const;
const sevColor = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-success",
} as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  try {
    const h = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "غير متاح";
  }
}

function ShariaStockScreeningPage() {
  const callScreen = async (pdfBase64: string, dualPass: boolean) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("يجب تسجيل الدخول");
    const res = await fetch("/api/sharia-stock-screening", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pdfBase64, dualPass }),
    });
    const body = (await res.json()) as {
      extract?: StockAuditExtract;
      extract2?: StockAuditExtract | null;
      error?: string;
    };
    if (!res.ok || !body.extract) throw new Error(body.error || `فشل الاستخراج (${res.status})`);
    return { extract: body.extract, extract2: body.extract2 ?? null };
  };

  const listFn = useServerFn(listShariaStockScreenings);
  const getFn = useServerFn(getShariaStockScreening);
  const saveFn = useServerFn(saveShariaStockScreening);
  const updateAnswersFn = useServerFn(updateShariaStockScreeningAnswers);
  const deleteFn = useServerFn(deleteShariaStockScreening);

  const [methodologyKey, setMethodologyKey] = useState<MethodologyKey>("aaoifi");
  const [marketCap, setMarketCap] = useState("");
  const [avgMarketCap, setAvgMarketCap] = useState("");
  const [dualPass, setDualPass] = useState(true);
  const [stage, setStage] = useState<"idle" | "analyzing" | "review" | "done" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [current, setCurrent] = useState<{ id: string | null; payload: ScreeningPayload } | null>(
    null,
  );
  const [draft, setDraft] = useState<{
    original: StockAuditExtract;
    edited: StockAuditExtract;
    verification: VerificationResult;
    meta: { fileName: string; hash: string };
  } | null>(null);
  const [archive, setArchive] = useState<ScreeningListItem[]>([]);
  const [archiveOffset, setArchiveOffset] = useState(0);
  const [archiveHasMore, setArchiveHasMore] = useState(false);
  const [archiveLoadingMore, setArchiveLoadingMore] = useState(false);
  const [answersSaved, setAnswersSaved] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadArchive = async () => {
    try {
      const { rows, hasMore } = await listFn({ data: { offset: 0 } });
      setArchive(rows);
      setArchiveOffset(rows.length);
      setArchiveHasMore(hasMore);
    } catch {
      /* لا أرشيف بعد أو غير مسجّل دخول */
    }
  };
  useEffect(() => {
    void loadArchive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMoreArchive = async () => {
    setArchiveLoadingMore(true);
    try {
      const { rows, hasMore } = await listFn({ data: { offset: archiveOffset } });
      setArchive((a) => [...a, ...rows]);
      setArchiveOffset((o) => o + rows.length);
      setArchiveHasMore(hasMore);
    } catch (e) {
      toast.error("تعذّر تحميل المزيد", { description: (e as Error).message });
    } finally {
      setArchiveLoadingMore(false);
    }
  };

  const audit: ComputedStockAudit | null = useMemo(() => {
    if (!current) return null;
    return current.payload.audit;
  }, [current]);

  const onFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("يُقبل حالياً ملف PDF فقط");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("الملف أكبر من الحد المسموح (15 ميجابايت)");
      return;
    }
    setStage("analyzing");
    setAnswersSaved(true);
    setProgress(
      dualPass
        ? "جارٍ الاستخراج المزدوج (تمريران مستقلان للتحقق)... قد يستغرق دقيقة"
        : "جارٍ استخراج الأرقام...",
    );
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      const base64 = await fileToBase64(file);
      const { extract, extract2 } = await callScreen(base64, dualPass);
      const verification = compareExtracts(extract, extract2);
      setDraft({
        original: extract,
        edited: JSON.parse(JSON.stringify(extract)) as StockAuditExtract,
        verification,
        meta: { fileName: file.name, hash },
      });
      setStage("review");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "حدث خطأ غير متوقع أثناء التحليل");
      setStage("error");
    }
  };

  const confirmDraft = async () => {
    if (!draft) return;
    const wasEdited = JSON.stringify(draft.original) !== JSON.stringify(draft.edited);
    const auditResult = computeStockAudit(draft.edited, {
      marketCap,
      avgMarketCap,
      methodologyKey,
      verification: draft.verification,
    });
    const meta = {
      id: "SA-" + Date.now().toString(36).toUpperCase(),
      time: new Date().toLocaleString("ar-EG", { dateStyle: "full", timeStyle: "short" }),
      fileName: draft.meta.fileName,
      hash: draft.meta.hash,
      edited: wasEdited,
    };
    const payload: ScreeningPayload = { meta, audit: auditResult, answers: {} };
    setCurrent({ id: null, payload });
    setStage("done");
    setDraft(null);
    try {
      const saved = await saveFn({ data: { methodology: methodologyKey, payload } });
      setCurrent({ id: saved.id, payload });
      void loadArchiveSilent();
    } catch (e) {
      toast.error("تعذّر حفظ التقرير في الأرشيف", { description: (e as Error).message });
    }
  };

  const setFigure = (key: keyof StockAuditExtract["figures"], v: string) => {
    setDraft((d) =>
      d ? { ...d, edited: { ...d.edited, figures: { ...d.edited.figures, [key]: num(v) } } } : d,
    );
  };
  const setDebtAmount = (i: number, v: string) => {
    setDraft((d) => {
      if (!d) return d;
      const arr = d.edited.conventionalDebt.slice();
      arr[i] = { ...arr[i], amount: num(v) };
      return { ...d, edited: { ...d.edited, conventionalDebt: arr } };
    });
  };
  const setDepositAmount = (i: number, v: string) => {
    setDraft((d) => {
      if (!d) return d;
      const arr = d.edited.interestBearingDeposits.slice();
      arr[i] = { ...arr[i], amount: num(v) };
      return { ...d, edited: { ...d.edited, interestBearingDeposits: arr } };
    });
  };

  const loadArchiveSilent = async () => {
    try {
      const { rows, hasMore } = await listFn({ data: { offset: 0 } });
      setArchive(rows);
      setArchiveOffset(rows.length);
      setArchiveHasMore(hasMore);
    } catch {
      /* تجاهل */
    }
  };

  const openArchived = async (id: string) => {
    try {
      const payload = await getFn({ data: { id } });
      setCurrent({ id, payload });
      setAnswersSaved(true);
      setStage("done");
    } catch (e) {
      toast.error("تعذّر فتح التقرير", { description: (e as Error).message });
    }
  };

  const removeArchived = async (id: string) => {
    if (!confirm("حذف هذا التقرير نهائياً؟")) return;
    try {
      await deleteFn({ data: { id } });
      setArchive((a) => a.filter((x) => x.id !== id));
      toast.success("تم الحذف");
    } catch (e) {
      toast.error("تعذّر الحذف", { description: (e as Error).message });
    }
  };

  const setAnswer = (i: number, a: ContractAnswer) => {
    if (!current) return;
    setAnswersSaved(false);
    setCurrent({
      ...current,
      payload: { ...current.payload, answers: { ...current.payload.answers, [i]: a } },
    });
  };
  const saveAnswers = async () => {
    if (!current?.id) return;
    try {
      await updateAnswersFn({ data: { id: current.id, payload: current.payload } });
      setAnswersSaved(true);
      toast.success("حُفظت إجابات فحص العقود");
    } catch (e) {
      toast.error("تعذّر الحفظ", { description: (e as Error).message });
    }
  };

  const exportJson = () => {
    if (!current) return;
    const blob = new Blob([JSON.stringify(current.payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.payload.meta.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ansArr = Object.values(current?.payload.answers ?? {});
  const anyViolation = ansArr.some((a) => a.status === "فُحص — توجد مخالفة");

  return (
    <main className="min-h-screen bg-background px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3">
          <Scale className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الفرز الشرعي لأسهم الشركات المتداوَلة</h1>
            <p className="text-sm text-muted-foreground">
              هل يجوز شراء/الاحتفاظ بسهم هذه الشركة أصلاً؟ — استخراج مزدوج للتحقق، حساب حتمي للنسب،
              وثلاث منهجيات فرز معتمدة (أيوفي / DJIM / S&P).
            </p>
          </div>
        </header>

        <Alert className="border-warning/40 bg-warning/5">
          <Info className="h-4 w-4 text-warning" />
          <AlertDescription className="text-xs leading-relaxed">
            أداة فرز آلية استرشادية مكمّلة لحاسبة الزكاة، لا بديل عنها ولا عن هيئة رقابة شرعية
            معتمدة. الأرقام تُستخرج بالذكاء الاصطناعي من ملف PDF ثم تُحسب النسب والأحكام برمجياً
            بشكل حتمي — راجع النتيجة قبل اعتمادها، خصوصاً عند وجود أرقام غير مؤكدة بين تمريرَي
            الاستخراج.
          </AlertDescription>
        </Alert>

        {stage === "idle" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">إعدادات الفرز</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>منهجية الفرز الشرعي</Label>
                  <Select
                    value={methodologyKey}
                    onValueChange={(v) => setMethodologyKey(v as MethodologyKey)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(METHODOLOGIES).map((m) => (
                        <SelectItem key={m.key} value={m.key}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {METHODOLOGIES[methodologyKey].denomLabel} — حد الديون{" "}
                    {METHODOLOGIES[methodologyKey].debtLimit}٪
                  </p>
                </div>
                <div>
                  <Label>التحقق بالاستخراج المزدوج</Label>
                  <Select
                    value={dualPass ? "1" : "0"}
                    onValueChange={(v) => setDualPass(v === "1")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">مفعّل — تمريران مستقلان (موصى به)</SelectItem>
                      <SelectItem value="0">معطّل — تمرير واحد أسرع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>القيمة السوقية الحالية (اختياري)</Label>
                  <Input
                    value={marketCap}
                    onChange={(e) => setMarketCap(e.target.value)}
                    placeholder="مثال: 12500000000"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label>متوسط القيمة السوقية ٣٦ شهراً (لمنهجيتَي DJIM وS&P)</Label>
                  <Input
                    value={avgMarketCap}
                    onChange={(e) => setAvgMarketCap(e.target.value)}
                    placeholder="مثال: 11800000000"
                    inputMode="numeric"
                  />
                </div>
              </CardContent>
            </Card>

            <div
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              tabIndex={0}
              role="button"
              className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/40 bg-card hover:bg-primary/5 transition-colors p-12 text-center"
            >
              <Upload className="h-10 w-10 text-primary mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-1">ارفع القوائم المالية للتدقيق (PDF)</h2>
              <p className="text-sm text-muted-foreground">
                يُفضّل رفع القوائم المجمعة للشركات القابضة — الفحص للقوائم المستقلة يخص الشركة الأم
                فقط
              </p>
              <Button className="mt-4" type="button">
                اختيار الملف
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
            </div>

            {archive.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Archive className="h-4 w-4" /> أرشيف التقارير ({archive.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {archive.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded border p-3 text-sm"
                    >
                      <button
                        onClick={() => openArchived(a.id)}
                        className="flex-1 text-right hover:underline"
                      >
                        <b>{a.company_name || a.file_name || "بلا اسم"}</b>
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          · {new Date(a.created_at).toLocaleDateString("ar-EG")} ·{" "}
                          {METHODOLOGIES[a.methodology as MethodologyKey]?.name}
                          {a.score !== null && ` · الدرجة ${a.score}`}
                        </span>
                      </button>
                      {a.verdict_tone && (
                        <Badge
                          variant="outline"
                          className={toneColor[a.verdict_tone as keyof typeof toneColor]}
                        >
                          {a.verdict_tone === "pass"
                            ? "مطابق"
                            : a.verdict_tone === "warn"
                              ? "مختلطة"
                              : "مخالف"}
                        </Badge>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => removeArchived(a.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {archiveHasMore && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={loadMoreArchive}
                      disabled={archiveLoadingMore}
                    >
                      {archiveLoadingMore ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "تحميل المزيد"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {stage === "analyzing" && (
          <div className="text-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{progress}</p>
          </div>
        )}

        {stage === "review" && draft && (
          <div className="space-y-6">
            <Alert className="border-primary/40 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs leading-relaxed">
                راجع الأرقام المستخرجة أدناه وصحّح أي خطأ قبل احتساب النسب — الحساب حتمي، فأي خطأ في
                الاستخراج (رقم مقروء خطأ من الذكاء الاصطناعي) ينتقل مباشرة إلى الحكم الشرعي. هذه
                الخطوة إلزامية لأن التصحيح غير ممكن بعد اعتماد التقرير.
              </AlertDescription>
            </Alert>

            {draft.verification.unconfirmed.length > 0 && (
              <Alert className="border-destructive/40 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs">
                  <b>
                    أرقام غير مؤكدة ({draft.verification.unconfirmed.length}) — اختلف الاستخراجان،
                    راجعها في الملف الأصلي قبل الاعتماد:
                  </b>
                  <ul className="list-disc pr-5 mt-1 space-y-0.5">
                    {draft.verification.unconfirmed.map((u, i) => (
                      <li key={i}>
                        {u.label}: {fmtNum(u.v1)} ・ {fmtNum(u.v2)} (فارق {fmtNum(u.diffPct)}٪)
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {draft.edited.company?.name || "الشركة"} — الأرقام الرئيسية
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-3">
                {(
                  [
                    ["totalAssets", "إجمالي الأصول"],
                    ["totalLiabilities", "إجمالي الالتزامات"],
                    ["totalEquity", "حقوق الملكية"],
                    ["totalRevenue", "إجمالي الإيرادات"],
                    ["interestIncome", "الفوائد الدائنة"],
                    ["capitalizedInterest", "الفوائد المرسملة"],
                    ["weightedShares", "المتوسط المرجح للأسهم"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={String(draft.edited.figures[key] ?? 0)}
                      onChange={(e) => setFigure(key, e.target.value)}
                      inputMode="decimal"
                      className={
                        num(draft.edited.figures[key]) !== num(draft.original.figures[key])
                          ? "border-primary"
                          : undefined
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {draft.edited.conventionalDebt.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">مفردات الديون الربوية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {draft.edited.conventionalDebt.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{d.name}</span>
                      <Input
                        value={String(d.amount)}
                        onChange={(e) => setDebtAmount(i, e.target.value)}
                        inputMode="decimal"
                        className={`w-40 ${
                          num(d.amount) !== num(draft.original.conventionalDebt[i]?.amount)
                            ? "border-primary"
                            : ""
                        }`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {draft.edited.interestBearingDeposits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">مفردات الودائع بفائدة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {draft.edited.interestBearingDeposits.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{d.name}</span>
                      <Input
                        value={String(d.amount)}
                        onChange={(e) => setDepositAmount(i, e.target.value)}
                        inputMode="decimal"
                        className={`w-40 ${
                          num(d.amount) !== num(draft.original.interestBearingDeposits[i]?.amount)
                            ? "border-primary"
                            : ""
                        }`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDraft(null);
                  setStage("idle");
                }}
              >
                إلغاء وإعادة الرفع
              </Button>
              <Button onClick={confirmDraft}>اعتماد الأرقام واحتساب النسب</Button>
            </div>
          </div>
        )}

        {stage === "error" && (
          <Card className="border-destructive/40 bg-destructive/5 max-w-md mx-auto">
            <CardContent className="pt-6 text-center space-y-3">
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm">{errMsg}</p>
              <Button onClick={() => setStage("idle")}>إعادة المحاولة</Button>
            </CardContent>
          </Card>
        )}

        {stage === "done" && audit && current && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" /> طباعة / PDF
              </Button>
              <Button variant="outline" onClick={exportJson} className="gap-1.5">
                <FileDown className="h-4 w-4" /> تصدير JSON
              </Button>
              <Button onClick={() => setStage("idle")}>ملف جديد</Button>
            </div>

            <Alert className="border-warning/40 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-xs">
                نطاق التدقيق: فرز شرعي كمي ونوعي لما تُظهره القوائم، مُكمَّل باستبيان فحص العقود
                أدناه. المنهجية المطبقة: <b>{audit.methodology.name}</b> (المقام:{" "}
                {audit.methodology.denomLabel}).
              </AlertDescription>
            </Alert>

            {audit.verification &&
              !audit.verification.singlePass &&
              audit.verification.unconfirmed.length === 0 && (
                <Alert className="border-success/40 bg-success/5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <AlertDescription className="text-xs">
                    نجح التحقق بالاستخراج المزدوج — تطابقت جميع الأرقام الجوهرية (فارق أقل من ١٪).
                  </AlertDescription>
                </Alert>
              )}
            {audit.verification && audit.verification.unconfirmed.length > 0 && (
              <Alert className="border-destructive/40 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs">
                  <b>
                    أرقام غير مؤكدة ({audit.verification.unconfirmed.length}) — اختلف الاستخراجان.
                  </b>{" "}
                  تحقق منها يدوياً قبل اعتماد التقرير:
                  <ul className="list-disc pr-5 mt-1 space-y-0.5">
                    {audit.verification.unconfirmed.map((u, i) => (
                      <li key={i}>
                        {u.label}: {fmtNum(u.v1)} ・ {fmtNum(u.v2)} (فارق {fmtNum(u.diffPct)}٪)
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {!audit.balanceOk && (
              <Alert className="border-destructive/40 bg-destructive/5">
                <XCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs">
                  فشل فحص توازن الميزانية — الأصول ≠ الالتزامات + حقوق الملكية بفارق{" "}
                  {fmtNum(audit.balanceDiffPct)}٪. النتائج أدناه غير معتمدة، أعد المحاولة بملف أوضح.
                </AlertDescription>
              </Alert>
            )}
            {audit.ex.statementType === "مستقلة" && (
              <Alert className="border-warning/40 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs">
                  قوائم مستقلة لا مجمعة — النتائج تخص الشركة الأم فقط وقد تختلف جوهرياً على مستوى
                  المجموعة.
                </AlertDescription>
              </Alert>
            )}
            {anyViolation && (
              <Alert className="border-destructive/40 bg-destructive/5">
                <XCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs">
                  ثبتت مخالفة عقدية واحدة على الأقل في استبيان فحص العقود — يُعلَّق الحكم الكمي
                  أدناه.
                </AlertDescription>
              </Alert>
            )}

            <Card className={`border ${toneBg[audit.verdictTone]}`}>
              <CardContent className="pt-6 flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <div
                    className={`text-5xl font-black tabular-nums ${toneColor[audit.verdictTone]}`}
                  >
                    {audit.score}
                  </div>
                  <div className="text-[11px] text-muted-foreground">درجة الفرز من 100</div>
                </div>
                <div className="flex-1 min-w-[240px]">
                  <div className="text-xs text-muted-foreground">{audit.ex.company?.activity}</div>
                  <h2 className="text-xl font-bold">{audit.ex.company?.name}</h2>
                  <div className="text-xs text-muted-foreground mb-2">
                    {audit.ex.company?.period}
                    {audit.ex.company?.auditor
                      ? ` · مراقب الحسابات: ${audit.ex.company.auditor}`
                      : ""}{" "}
                    · <b>قوائم {audit.ex.statementType}</b>
                  </div>
                  <Badge
                    className={anyViolation ? "bg-destructive" : undefined}
                    variant={
                      anyViolation
                        ? "default"
                        : audit.verdictTone === "pass"
                          ? "default"
                          : audit.verdictTone === "warn"
                            ? "secondary"
                            : "destructive"
                    }
                  >
                    {anyViolation ? "معلَّق — ثبتت مخالفات في فحص العقود" : audit.verdict}
                  </Badge>
                  <p className="text-sm mt-2 leading-relaxed">{audit.verdictDetail}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">أولاً: النسب الشرعية (محسوبة برمجياً)</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {audit.ratios.map((r, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="font-semibold text-sm">{r.name}</span>
                      <Badge variant="outline" className={statusColor[r.status]}>
                        {statusLabel[r.status]}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span
                        className={`text-2xl font-extrabold tabular-nums ${statusColor[r.status]}`}
                      >
                        {fmtNum(r.judged)}٪
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        الحد {fmtNum(r.limit)}٪
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">المقام: {r.denomUsed}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {r.numLabel}: {fmtNum(r.numer)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  ثانياً: مقارنة الحكم عبر المنهجيات الثلاث
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنهجية</TableHead>
                        <TableHead>الديون الربوية</TableHead>
                        <TableHead>الودائع بفائدة</TableHead>
                        <TableHead>الإيرادات غير المتوافقة</TableHead>
                        <TableHead>النتيجة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audit.comparison.map((c, i) => (
                        <TableRow
                          key={i}
                          className={
                            c.methodology.key === audit.methodology.key ? "bg-primary/5" : undefined
                          }
                        >
                          <TableCell className="font-semibold">
                            {c.methodology.name}
                            {c.methodology.key === audit.methodology.key && (
                              <Badge className="mr-2 text-[10px]">المعتمدة</Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className={
                              c.debt > c.methodology.debtLimit
                                ? "text-destructive font-bold"
                                : "text-success font-bold"
                            }
                          >
                            {fmtNum(c.debt)}٪{" "}
                            <span className="text-muted-foreground font-normal">
                              / {c.methodology.debtLimit}٪
                            </span>
                          </TableCell>
                          <TableCell
                            className={
                              c.dep > c.methodology.depLimit
                                ? "text-destructive font-bold"
                                : "text-success font-bold"
                            }
                          >
                            {fmtNum(c.dep)}٪{" "}
                            <span className="text-muted-foreground font-normal">
                              / {c.methodology.depLimit}٪
                            </span>
                          </TableCell>
                          <TableCell
                            className={
                              c.inc > c.methodology.incLimit
                                ? "text-destructive font-bold"
                                : "text-success font-bold"
                            }
                          >
                            {fmtNum(c.inc)}٪{" "}
                            <span className="text-muted-foreground font-normal">
                              / {c.methodology.incLimit}٪
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.passAll ? "default" : "destructive"}>
                              {c.passAll ? "مجتازة" : "غير مجتازة"}
                            </Badge>
                            {c.needsMarket && (
                              <div className="text-[10px] text-warning mt-1">
                                تتطلب متوسط القيمة السوقية — احتُسبت ببديل
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {(audit.ex.conventionalDebt.length > 0 ||
              audit.ex.interestBearingDeposits.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    ثالثاً: مفردات الديون الربوية والودائع بفائدة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>البند</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>الدليل</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audit.ex.conventionalDebt.map((d, i) => (
                          <TableRow key={`d${i}`}>
                            <TableCell className="font-medium">{d.name}</TableCell>
                            <TableCell className="text-destructive font-bold">
                              {fmtNum(d.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {d.evidence}
                            </TableCell>
                          </TableRow>
                        ))}
                        {audit.ex.interestBearingDeposits.map((d, i) => (
                          <TableRow key={`p${i}`}>
                            <TableCell className="font-medium">
                              {d.name}{" "}
                              <Badge variant="outline" className="text-[10px] mr-1">
                                وديعة بفائدة
                              </Badge>
                            </TableCell>
                            <TableCell className="text-warning font-bold">
                              {fmtNum(d.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {d.evidence}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {audit.ex.instruments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    رابعاً: تصنيف أدوات التمويل والاستثمار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الأداة</TableHead>
                          <TableHead>الرصيد</TableHead>
                          <TableHead>التصنيف</TableHead>
                          <TableHead>الأساس الفقهي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audit.ex.instruments.map((it, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{it.name}</TableCell>
                            <TableCell>{fmtNum(it.amount)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  it.classification === "غير متوافقة"
                                    ? "text-destructive"
                                    : it.classification === "تحتاج فحصاً"
                                      ? "text-warning"
                                      : "text-success"
                                }
                              >
                                {it.classification}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {it.basis}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-warning/40 bg-warning/5">
              <CardHeader>
                <CardTitle className="text-base">خامساً: التطهير الواجب</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  ["الفوائد الدائنة", fmtNum(audit.purification.interestIncome)],
                  ["الفوائد المرسملة", fmtNum(audit.purification.capitalizedInterest)],
                  ["إجمالي واجب التطهير", fmtNum(audit.purification.total)],
                  ["نسبته من الإيرادات", `${fmtNum(audit.purification.pctOfRevenue)}٪`],
                  [
                    "نصيب السهم",
                    audit.purification.perShare !== null
                      ? fmtNum(audit.purification.perShare)
                      : "—",
                  ],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-[11px] text-muted-foreground">{l}</div>
                    <div className="text-lg font-bold text-primary">{v}</div>
                  </div>
                ))}
                <p className="col-span-full text-xs text-muted-foreground">
                  نصيب السهم = إجمالي واجب التطهير ÷ المتوسط المرجح لعدد الأسهم (
                  {fmtNum(audit.purification.shares)}) — يُخرجه المستثمر في وجوه الخير العامة دون
                  احتساب أجرٍ له.
                </p>
              </CardContent>
            </Card>

            {audit.ex.governance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    سادساً: الحوكمة الشرعية (وفق GSIFI — أيوفي)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-3">
                  {audit.ex.governance.map((g, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-sm">{g.item}</span>
                        <span
                          className={`text-xs font-bold ${g.status === "yes" ? "text-success" : g.status === "partial" ? "text-warning" : "text-destructive"}`}
                        >
                          {g.status === "yes"
                            ? "متوفر"
                            : g.status === "partial"
                              ? "جزئي"
                              : "غير متوفر"}
                        </span>
                      </div>
                      {g.note && (
                        <div className="text-[11px] text-muted-foreground mt-1">{g.note}</div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {audit.ex.contractReview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    سابعاً: استبيان فحص العقود — ما لا تُظهره القوائم
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    أجب بعد فحص العقود فعلياً — الإجابات تُدمج في الحكم النهائي وتُحفظ مع التقرير.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {audit.ex.contractReview.map((c, i) => {
                    const a = current.payload.answers[i] || { status: "لم يُفحص بعد", note: "" };
                    return (
                      <div key={i} className="rounded-lg border p-4 space-y-2">
                        <b className="text-sm">{c.item}</b>
                        <p className="text-xs text-muted-foreground">{c.why}</p>
                        <div className="flex flex-wrap gap-2">
                          <Select
                            value={a.status}
                            onValueChange={(v) => setAnswer(i, { ...a, status: v })}
                          >
                            <SelectTrigger className="w-auto min-w-[190px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="لم يُفحص بعد">لم يُفحص بعد</SelectItem>
                              <SelectItem value="فُحص — سليم شرعاً">فُحص — سليم شرعاً</SelectItem>
                              <SelectItem value="فُحص — توجد مخالفة">فُحص — توجد مخالفة</SelectItem>
                            </SelectContent>
                          </Select>
                          <Textarea
                            value={a.note}
                            onChange={(e) => setAnswer(i, { ...a, note: e.target.value })}
                            placeholder="ملاحظات المدقق (مرجع العقد، البند، النتيجة...)"
                            className="flex-1 min-h-[38px] text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Button onClick={saveAnswers} disabled={!current.id}>
                    {answersSaved ? "✓ حُفظت إجابات الفحص" : "اعتماد إجابات الفحص وحفظها"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {audit.ex.violations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">ثامناً: المخالفات والملاحظات الجوهرية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {audit.ex.violations.map((v, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border-r-4 border p-3 ${sevColor[v.severity]}`}
                    >
                      <div className="flex justify-between gap-2">
                        <b className="text-sm text-foreground">{v.title}</b>
                        <Badge variant="outline" className={sevColor[v.severity]}>
                          مخالفة {sevLabel[v.severity]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{v.detail}</p>
                      {v.reference && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          المرجع: {v.reference}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {audit.ex.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">تاسعاً: التوصيات وخطة التصحيح</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {audit.ex.recommendations
                    .slice()
                    .sort((a, b) => (a.priority || 9) - (b.priority || 9))
                    .map((x, i) => (
                      <div key={i} className="flex gap-3 rounded-lg border p-3">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {x.priority || i + 1}
                        </div>
                        <div>
                          <b className="text-sm">{x.title}</b>
                          <p className="text-xs text-muted-foreground mt-1">{x.detail}</p>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            <footer className="text-[11px] text-muted-foreground border-t pt-3 space-y-1">
              <div>
                رقم التقرير: <b>{current.payload.meta.id}</b> · التاريخ:{" "}
                <b>{current.payload.meta.time}</b> · الملف: <b>{current.payload.meta.fileName}</b>
                {current.payload.meta.edited && (
                  <Badge variant="outline" className="mr-2 text-warning text-[10px]">
                    عُدِّلت أرقام مستخرَجة يدوياً قبل الاحتساب
                  </Badge>
                )}
              </div>
              <div className="font-mono" dir="ltr">
                SHA-256: {current.payload.meta.hash.slice(0, 24)}…
              </div>
              <p>
                تقرير فرز شرعي آلي استرشادي — الأرقام مستخرجة بالذكاء الاصطناعي والنسب محسوبة
                برمجياً. لا يُغني عن رأي هيئة رقابة شرعية معتمدة.
              </p>
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}
