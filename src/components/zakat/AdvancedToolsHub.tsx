import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import SalaryZakatCalculator from "./SalaryZakatCalculator";
import StockClassificationAdvanced from "./StockClassificationAdvanced";
import AdvanceMultiYearZakat from "./AdvanceMultiYearZakat";
import RibaPurificationCalc from "./RibaPurificationCalc";
import InflationAdjusterCard from "./InflationAdjusterCard";
import ZakatStatsDashboard from "./ZakatStatsDashboard";

interface Props { currencyName?: string; nisabValue?: number; annualZakat?: number }

export default function AdvancedToolsHub({ currencyName = "ج.م", nisabValue = 0, annualZakat = 0 }: Props) {
  return (
    <Card className="mt-6 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          أدوات متقدمة (مالية ومحاسبية وفقهية)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="salary">
          <TabsList className="flex flex-wrap h-auto justify-start gap-1">
            <TabsTrigger value="salary" className="text-xs">زكاة الراتب</TabsTrigger>
            <TabsTrigger value="stocks" className="text-xs">أسهم/REIT/ETF</TabsTrigger>
            <TabsTrigger value="advance" className="text-xs">تعجيل الزكاة</TabsTrigger>
            <TabsTrigger value="purify" className="text-xs">تطهير الفوائد</TabsTrigger>
            <TabsTrigger value="inflation" className="text-xs">التضخم</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">إحصاءات السنوات</TabsTrigger>
          </TabsList>
          <TabsContent value="salary"><SalaryZakatCalculator currencyName={currencyName} nisabValue={nisabValue} /></TabsContent>
          <TabsContent value="stocks"><StockClassificationAdvanced currencyName={currencyName} /></TabsContent>
          <TabsContent value="advance"><AdvanceMultiYearZakat annualZakat={annualZakat} currencyName={currencyName} /></TabsContent>
          <TabsContent value="purify"><RibaPurificationCalc currencyName={currencyName} /></TabsContent>
          <TabsContent value="inflation"><InflationAdjusterCard currencyName={currencyName} /></TabsContent>
          <TabsContent value="stats"><ZakatStatsDashboard /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
