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
import { Plus, Trash2, Landmark } from "lucide-react";
import {
  runDebtEngine,
  DEBT_TYPE_LABELS,
  DEBT_TREATMENT_LABELS,
  DEBT_METHODOLOGY_LABELS,
  type DebtInput,
  type DebtType,
  type DebtMethodology,
} from "@/lib/zakat/debt-engine";

const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

const INITIAL: DebtInput[] = [
  { id: "d1", label: "موردون", type: "trade_payable", amount: 90000 },
  { id: "d2", label: "قرض طويل الأجل", type: "long_term_loan", amount: 500000, dueWithinHawl: 100000 },
  { id: "d3", label: "عملاء مرجوّ تحصيلهم", type: "trade_receivable", amount: 120000, collectible: true },
];

export function DebtEnginePanel() {
  const [methodology, setMethodology] = useState<DebtMethodology>("due-within-hawl");
  const [debts, setDebts] = useState<DebtInput[]>(INITIAL);

  const result = useMemo(() => runDebtEngine(debts, methodology), [debts, methodology]);

  const update = (id: string, patch: Partial<DebtInput>) =>
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  return (
    <Card className="border-primary/20 shadow-soft" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-primary" />
          محرك الديون — أثر موثّق على الوعاء
          <div className="ms-auto w-full sm:w-72">
            <Select
              value={methodology}
              onValueChange={(v) => setMethodology(v as DebtMethodology)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DEBT_METHODOLOGY_LABELS) as DebtMethodology[]).map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {DEBT_METHODOLOGY_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="space-y-2">
          {debts.map((d) => (
            <div key={d.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-12">
              <Input
                className="h-8 text-xs sm:col-span-3"
                value={d.label}
                aria-label="بيان الدين"
                onChange={(e) => update(d.id, { label: e.target.value })}
              />
              <div className="sm:col-span-3">
                <Select value={d.type} onValueChange={(v) => update(d.id, { type: v as DebtType })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DEBT_TYPE_LABELS) as DebtType[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {DEBT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                className="h-8 text-xs sm:col-span-2"
                type="number"
                inputMode="decimal"
                aria-label="المبلغ"
                value={d.amount}
                onChange={(e) => update(d.id, { amount: Number(e.target.value) || 0 })}
              />
              <Input
                className="h-8 text-xs sm:col-span-2"
                type="number"
                inputMode="decimal"
                aria-label="المستحق خلال الحول"
                placeholder="المستحق خلال الحول"
                value={d.dueWithinHawl ?? ""}
                onChange={(e) =>
                  update(d.id, {
                    dueWithinHawl: e.target.value === "" ? undefined : Number(e.target.value) || 0,
                  })
                }
              />
              <div className="flex items-center gap-2 sm:col-span-2">
                <Badge variant="outline" className="text-[10px]">
                  {DEBT_TREATMENT_LABELS[
                    result.lines.find((l) => l.id === d.id)?.treatment ?? "no_effect"
                  ]}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="حذف الدين"
                  onClick={() => setDebts((prev) => prev.filter((x) => x.id !== d.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            setDebts((prev) => [
              ...prev,
              { id: `d${Date.now()}`, label: "دين جديد", type: "trade_payable", amount: 0 },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" /> إضافة دين
        </Button>

        <ul className="space-y-1 rounded-md border p-2 text-[11px] text-muted-foreground">
          {result.lines.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2">
              <span>
                {l.label} — {l.rationale}{" "}
                <Badge variant="outline" className="text-[10px]">
                  {l.ruleId}
                </Badge>
              </span>
              <b className={l.baseEffect < 0 ? "text-destructive" : "text-primary"}>
                {fmt(l.baseEffect)}
              </b>
            </li>
          ))}
        </ul>

        <div className="grid gap-2 sm:grid-cols-4">
          <Stat label="يُخصم" value={result.totalDeductible} />
          <Stat label="يُضاف" value={result.totalAddable} />
          <Stat label="مؤجَّل حتى القبض" value={result.totalDeferred} />
          <Stat label="صافي الأثر" value={result.netBaseEffect} highlight />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="text-muted-foreground">{label}</div>
      <b className="tabular-nums">{fmt(value)}</b>
    </div>
  );
}

export default DebtEnginePanel;
