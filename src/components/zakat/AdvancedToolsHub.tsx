import type { ReactElement } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import SalaryZakatCalculator from "./SalaryZakatCalculator";
import StockClassificationAdvanced from "./StockClassificationAdvanced";
import AdvanceMultiYearZakat from "./AdvanceMultiYearZakat";
import RibaPurificationCalc from "./RibaPurificationCalc";
import InflationAdjusterCard from "./InflationAdjusterCard";
import ZakatStatsDashboard from "./ZakatStatsDashboard";
import SensitivityProjection from "./SensitivityProjection";

type Mode = "individual" | "company" | "all";

interface Props {
  currencyName?: string;
  nisabValue?: number;
  annualZakat?: number;
  mode?: Mode;
  title?: string;
}

// Tools relevant per audience (محاسبياً وفقهياً)
const TOOLS: Record<Mode, string[]> = {
  individual: ["salary", "advance", "sensitivity", "purify", "inflation", "stats"],
  company:    ["stocks", "sensitivity", "advance", "purify", "inflation", "stats"],
  all:        ["salary", "stocks", "advance", "sensitivity", "purify", "inflation", "stats"],
};

const LABELS: Record<string, string> = {
  salary: "زكاة الراتب",
  stocks: "أسهم/REIT/ETF",
  advance: "تعجيل الزكاة",
  sensitivity: "الحساسية والتوقعات",
  purify: "تطهير الفوائد",
  inflation: "التضخم",
  stats: "إحصاءات السنوات",
};

export default function AdvancedToolsHub({
  currencyName = "ج.م",
  nisabValue = 0,
  annualZakat = 0,
  mode = "all",
  title,
}: Props) {
  const tools = TOOLS[mode];
  const headerTitle = title ?? (mode === "individual"
    ? "أدوات الأفراد المتقدمة (مالية وفقهية)"
    : mode === "company"
      ? "أدوات الشركات المتقدمة (محاسبية وفقهية)"
      : "أدوات متقدمة (مالية ومحاسبية وفقهية)");

  const panels: Record<string, ReactElement> = {
    salary: <SalaryZakatCalculator currencyName={currencyName} nisabValue={nisabValue} />,
    stocks: <StockClassificationAdvanced currencyName={currencyName} />,
    advance: <AdvanceMultiYearZakat annualZakat={annualZakat} currencyName={currencyName} />,
    sensitivity: <SensitivityProjection annualZakat={annualZakat} currencyName={currencyName} />,
    purify: <RibaPurificationCalc currencyName={currencyName} />,
    inflation: <InflationAdjusterCard currencyName={currencyName} />,
    stats: <ZakatStatsDashboard />,
  };

  return (
    <Card className="mt-6 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {headerTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={tools[0]}>
          <TabsList className="flex flex-wrap h-auto justify-start gap-1">
            {tools.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">{LABELS[t]}</TabsTrigger>
            ))}
          </TabsList>
          {tools.map((t) => (
            <TabsContent key={t} value={t}>{panels[t]}</TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
