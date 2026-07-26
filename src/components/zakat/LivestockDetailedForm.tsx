import { useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Beef, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { calcLivestockZakat, type LivestockKind } from "@/lib/zakat/livestock";

const KIND_LABELS: Record<LivestockKind, string> = {
  camels: "الإبل",
  cattle: "البقر / الجاموس",
  sheep: "الغنم / الماعز",
};

const livestockSchema = z.object({
  kind: z.enum(["camels", "cattle", "sheep"]),
  headcount: z
    .number({ invalid_type_error: "أدخل رقماً صحيحاً" })
    .int("يجب أن يكون العدد صحيحاً بدون كسور")
    .nonnegative("لا يمكن أن يكون العدد سالباً")
    .max(1_000_000, "العدد كبير جداً — تحقق من الإدخال"),
  grazingDaysPerYear: z
    .number({ invalid_type_error: "أدخل عدد أيام الرعي" })
    .int()
    .min(0, "لا يمكن أن يكون سالباً")
    .max(354, "الحول القمري 354 يوماً فقط"),
  feedCostRatio: z
    .number({ invalid_type_error: "أدخل نسبة" })
    .min(0, "النسبة بين 0 و100")
    .max(100, "النسبة بين 0 و100"),
  hasWaterAccess: z.boolean(),
  isForTrade: z.boolean(),
});

type FormState = z.infer<typeof livestockSchema>;

const DEFAULT_STATE: FormState = {
  kind: "sheep",
  headcount: 0,
  grazingDaysPerYear: 300,
  feedCostRatio: 10,
  hasWaterAccess: true,
  isForTrade: false,
};

export default function LivestockDetailedForm() {
  const [state, setState] = useState<FormState>(DEFAULT_STATE);
  const [submitted, setSubmitted] = useState(false);

  const parsed = useMemo(() => livestockSchema.safeParse(state), [state]);
  const errors: Partial<Record<keyof FormState, string>> = useMemo(() => {
    if (parsed.success) return {};
    const out: Partial<Record<keyof FormState, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof FormState;
      if (!out[key]) out[key] = issue.message;
    }
    return out;
  }, [parsed]);

  const isGrazing =
    state.grazingDaysPerYear >= 178 && state.feedCostRatio < 50 && !state.isForTrade;

  const result = useMemo(() => {
    if (!parsed.success) return null;
    return calcLivestockZakat(state.kind, state.headcount, isGrazing);
  }, [parsed.success, state.kind, state.headcount, isGrazing]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const showErr = (k: keyof FormState) => (submitted ? errors[k] : undefined);

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Beef className="h-5 w-5 text-primary" />
          إدخال تفصيلي لبيانات الأنعام السائمة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm leading-relaxed">
            تجب زكاة الأنعام إذا كانت <b>سائمة</b> (ترعى أكثر الحول في الكلأ المباح)، وبلغت النصاب،
            وحال عليها الحول. المعلوفة أو المُعدّة للتجارة لها أحكام مختلفة.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kind">نوع الحيوان</Label>
            <Select
              value={state.kind}
              onValueChange={(v) => update("kind", v as LivestockKind)}
            >
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABELS) as LivestockKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headcount">العدد (رأس)</Label>
            <Input
              id="headcount"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={state.headcount || ""}
              onChange={(e) => update("headcount", Number(e.target.value) || 0)}
              aria-invalid={!!showErr("headcount")}
              aria-describedby="headcount-err"
            />
            {showErr("headcount") && (
              <p id="headcount-err" className="text-xs text-destructive">
                {showErr("headcount")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="grazing">عدد أيام الرعي في الكلأ المباح خلال الحول (من 354)</Label>
            <Input
              id="grazing"
              type="number"
              min={0}
              max={354}
              step={1}
              value={state.grazingDaysPerYear}
              onChange={(e) =>
                update("grazingDaysPerYear", Number(e.target.value) || 0)
              }
              aria-invalid={!!showErr("grazingDaysPerYear")}
              aria-describedby="grazing-err"
            />
            {showErr("grazingDaysPerYear") && (
              <p id="grazing-err" className="text-xs text-destructive">
                {showErr("grazingDaysPerYear")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              السَّوم = رعيها أكثر الحول (≥ 178 يوماً) في المرعى المباح.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feed">نسبة تكلفة العلف من إجمالي المؤونة (%)</Label>
            <Input
              id="feed"
              type="number"
              min={0}
              max={100}
              step={1}
              value={state.feedCostRatio}
              onChange={(e) => update("feedCostRatio", Number(e.target.value) || 0)}
              aria-invalid={!!showErr("feedCostRatio")}
              aria-describedby="feed-err"
            />
            {showErr("feedCostRatio") && (
              <p id="feed-err" className="text-xs text-destructive">
                {showErr("feedCostRatio")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              إذا كان العلف يشكّل ≥ 50% من مؤونتها فهي معلوفة لا سائمة.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3 md:col-span-1">
            <div>
              <Label htmlFor="water" className="text-sm font-medium">
                هل تُسقى من ماء مباح (أنهار/آبار عامة)؟
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                إن كانت تُسقى بمصاريف تجارية كبيرة قد يؤثر على وصف السوم.
              </p>
            </div>
            <Switch
              id="water"
              checked={state.hasWaterAccess}
              onCheckedChange={(v) => update("hasWaterAccess", v)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3 md:col-span-1">
            <div>
              <Label htmlFor="trade" className="text-sm font-medium">
                هل هي مُعدّة للتجارة (بيع وشراء)؟
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                عندئذ تُزكّى زكاة عروض تجارة (2.5% من القيمة السوقية).
              </p>
            </div>
            <Switch
              id="trade"
              checked={state.isForTrade}
              onCheckedChange={(v) => update("isForTrade", v)}
            />
          </div>
        </div>

        {!state.hasWaterAccess && (
          <Alert variant="default" className="border-amber-500/40">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              الأنعام التي تُشترى لها مياه بمصاريف مستمرة قد تخرج عن وصف السوم عند بعض الفقهاء —
              راجع مفتيك.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={() => setSubmitted(true)} disabled={!parsed.success}>
            احسب الزكاة
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setState(DEFAULT_STATE);
              setSubmitted(false);
            }}
          >
            إعادة تعيين
          </Button>
        </div>

        {submitted && !parsed.success && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              يوجد {parsed.error.issues.length} خطأ في الإدخال — راجع الحقول أعلاه.
            </AlertDescription>
          </Alert>
        )}

        {submitted && result && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              نتيجة الحساب — {KIND_LABELS[result.kind]} ({result.headcount} رأس)
            </div>

            {result.belowNisab && (
              <p className="text-sm text-muted-foreground">{result.note}</p>
            )}

            {!result.belowNisab && result.due.length === 0 && (
              <p className="text-sm">{result.note}</p>
            )}

            {result.due.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">المقدار الواجب إخراجه:</div>
                <ul className="space-y-1">
                  {result.due.map((u, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">{u.count}</Badge>
                      <span>{u.description}</span>
                      {u.age && (
                        <span className="text-xs text-muted-foreground">— {u.age}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  {result.note} — المرجع: {result.reference}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t">
              وصف الوعاء:{" "}
              {isGrazing ? (
                <span className="text-emerald-600 font-medium">سائمة (تجب زكاة الأنعام)</span>
              ) : state.isForTrade ? (
                <span className="text-blue-600 font-medium">عروض تجارة (2.5%)</span>
              ) : (
                <span className="text-amber-600 font-medium">معلوفة (لا زكاة أنعام)</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
