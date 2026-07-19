/**
 * ErpZakatSync — سحب ميزان المراجعة من اتصال ERP، مراجعة التصنيف الزكوي
 * لكل حساب، حساب الوعاء والزكاة، ثم حفظ سجل زكاة قابل للترحيل كقيد.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  pullErpTrialBalance,
  saveErpZakatMapping,
  calculateZakatFromErp,
} from "@/lib/erp/sync.functions";
import {
  ZAKAT_CATEGORIES,
  computeZakatFromTrialBalance,
  type ClassifiedRow,
  type ZakatCategory,
} from "@/lib/erp/zakatMapping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DownloadCloud, Calculator, Save, FlaskConical } from "lucide-react";
import { fmt } from "@/lib/zakat";
import { runShariaComplianceReview } from "@/lib/shariaAudit";
import { ShariaComplianceReport } from "@/components/zakat/ShariaComplianceReport";

interface Props {
  connectionId: string;
  onRecordCreated?: () => void;
}

const CATEGORY_KEYS = Object.keys(ZAKAT_CATEGORIES) as ZakatCategory[];

export function ErpZakatSync({ connectionId, onRecordCreated }: Props) {
  const pull = useServerFn(pullErpTrialBalance);
  const saveMapping = useServerFn(saveErpZakatMapping);
  const calculate = useServerFn(calculateZakatFromErp);

  const [busy, setBusy] = useState<string | null>(null);
  const [rows, setRows] = useState<ClassifiedRow[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [nisab, setNisab] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [calendar, setCalendar] = useState<"hijri" | "gregorian">("hijri");

  const overrides = useMemo(() => {
    const o: Record<string, string> = {};
    for (const r of rows) if (r.source === "override") o[r.code] = r.category;
    return o;
  }, [rows]);

  // معاينة الحساب محلياً — نفس محرك الخادم (isomorphic)
  const preview = useMemo(
    () =>
      rows.length
        ? computeZakatFromTrialBalance(rows, {
            nisab: Number(nisab) || 0,
            calendar,
          })
        : null,
    [rows, nisab, calendar],
  );

  // المراجعة الشرعية الشاملة (شرعية · امتثال · حوكمة) على البيانات المسحوبة
  const review = useMemo(
    () =>
      preview
        ? runShariaComplianceReview({
            rows,
            computation: preview,
            hawlComplete: null,
            calendar,
          })
        : null,
    [rows, preview, calendar],
  );

  const runPull = async () => {
    setBusy("pull");
    try {
      const r = await pull({ data: { connection_id: connectionId, date_to: dateTo } });
      if (!r.ok) {
        toast.error(`فشل السحب: ${"error" in r ? r.error : "unknown"}`);
        return;
      }
      setRows(r.rows);
      setSource(r.source);
      toast.success(
        `تم سحب ${r.rows.length} حساباً (${r.source === "sandbox_demo" ? "بيانات تجريبية" : "بيانات حية"})`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل السحب");
    } finally {
      setBusy(null);
    }
  };

  const setCategory = (code: string, category: ZakatCategory) => {
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, category, source: "override" as const } : r)),
    );
  };

  const runSaveMapping = async () => {
    setBusy("map");
    try {
      const r = await saveMapping({ data: { connection_id: connectionId, overrides } });
      toast.success(`تم حفظ ${r.saved} تخصيصاً — سيُطبق تلقائياً في كل سحب قادم`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ التخصيص");
    } finally {
      setBusy(null);
    }
  };

  const runCalculate = async () => {
    setBusy("calc");
    try {
      const r = await calculate({
        data: {
          connection_id: connectionId,
          date_to: dateTo,
          nisab: Number(nisab) || 0,
          calendar,
          currency,
          overrides,
          save_record: true,
        },
      });
      if (!r.ok) {
        toast.error(`فشل الحساب: ${"error" in r ? r.error : "unknown"}`);
        return;
      }
      toast.success(
        `زكاة مستحقة: ${fmt(r.computation.zakatDue)} ${currency} — حُفظ سجل زكاة جاهز للترحيل`,
      );
      onRecordCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحساب");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pt-2 border-t space-y-3">
      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <DownloadCloud className="h-3.5 w-3.5" />
        حساب الزكاة من ميزان المراجعة (سحب مباشر من الـERP)
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <Label className="text-[11px]">حتى تاريخ</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[11px]">النصاب ({currency})</Label>
          <Input
            type="number"
            min="0"
            value={nisab}
            onChange={(e) => setNisab(e.target.value)}
            placeholder="0 = بدون فحص"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[11px]">العملة</Label>
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="h-8 text-xs"
            maxLength={8}
          />
        </div>
        <div>
          <Label className="text-[11px]">أساس الحول</Label>
          <Select value={calendar} onValueChange={(v: "hijri" | "gregorian") => setCalendar(v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hijri">هجري — 2.5%</SelectItem>
              <SelectItem value="gregorian">ميلادي — 2.577%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={runPull} disabled={busy === "pull"}>
          <DownloadCloud className="h-3.5 w-3.5 mr-1" />
          {busy === "pull" ? "جارٍ السحب..." : "سحب ميزان المراجعة"}
        </Button>
        {rows.length > 0 && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={runSaveMapping}
              disabled={busy === "map"}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              حفظ التخصيصات ({Object.keys(overrides).length})
            </Button>
            <Button size="sm" onClick={runCalculate} disabled={busy === "calc"}>
              <Calculator className="h-3.5 w-3.5 mr-1" />
              {busy === "calc" ? "جارٍ الحساب..." : "احسب واحفظ سجل الزكاة"}
            </Button>
          </>
        )}
        {source === "sandbox_demo" && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <FlaskConical className="h-3 w-3" /> بيانات تجريبية (Sandbox)
          </Badge>
        )}
      </div>

      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded border p-2">
            <div className="text-muted-foreground">أصول زكوية</div>
            <div className="font-bold tabular-nums">{fmt(preview.zakatableAssets)}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-muted-foreground">خصوم مخصومة</div>
            <div className="font-bold tabular-nums">{fmt(preview.deductibleLiabilities)}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-muted-foreground">الوعاء الزكوي</div>
            <div className="font-bold tabular-nums">{fmt(preview.zakatBase)}</div>
          </div>
          <div className="rounded border p-2 border-primary/50 bg-primary/5">
            <div className="text-muted-foreground">
              الزكاة المستحقة ({(preview.rate * 100).toFixed(3)}%)
            </div>
            <div className="font-bold tabular-nums text-primary">
              {preview.eligible ? fmt(preview.zakatDue) : "دون النصاب"}{" "}
              {preview.eligible ? currency : ""}
            </div>
          </div>
        </div>
      )}

      {review && <ShariaComplianceReport review={review} />}

      {rows.length > 0 && (
        <div className="max-h-72 overflow-y-auto rounded border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-right">
                <th className="p-2 font-semibold">الحساب</th>
                <th className="p-2 font-semibold tabular-nums">الرصيد</th>
                <th className="p-2 font-semibold">التصنيف الزكوي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-t">
                  <td className="p-2">
                    <span className="font-mono text-muted-foreground">{r.code}</span> {r.name}
                  </td>
                  <td className={`p-2 tabular-nums ${r.balance < 0 ? "text-destructive" : ""}`}>
                    {fmt(r.balance)}
                  </td>
                  <td className="p-1.5">
                    <Select
                      value={r.category}
                      onValueChange={(v: ZakatCategory) => setCategory(r.code, v)}
                    >
                      <SelectTrigger className="h-7 text-[11px] min-w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_KEYS.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {ZAKAT_CATEGORIES[c].labelAr}
                            {r.source === "override" && r.category === c ? " ✎" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
