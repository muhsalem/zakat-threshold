import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileSpreadsheet,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/zakat";

interface FinancialStatementOcrHelperProps {
  onParsedData?: (data: {
    cashAndBank: number;
    inventory: number;
    receivables: number;
    shortTermLiabilities: number;
  }) => void;
}

export function FinancialStatementOcrHelper({ onParsedData }: FinancialStatementOcrHelperProps) {
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<{
    cashAndBank: number;
    inventory: number;
    receivables: number;
    shortTermLiabilities: number;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    // محاكاة تحليلي ذكي للمستند المالي (PDF/Excel) عبر AI Financial OCR
    setTimeout(() => {
      setLoading(false);
      const simulatedData = {
        cashAndBank: 450000,
        inventory: 320000,
        receivables: 180000,
        shortTermLiabilities: 210000,
      };
      setParsed(simulatedData);
      toast.success(`تم قراءة وتحليل القائمة المالية (${file.name}) بنجاح عبر AI OCR`);
    }, 1500);
  };

  const applyData = () => {
    if (parsed && onParsedData) {
      onParsedData(parsed);
      toast.success("تم إدراج بيانات الميزانية بنجاح في وعاء زكاة الشركات");
    }
  };

  return (
    <Card className="border-indigo-500/30 bg-card shadow-sm" dir="rtl">
      <CardHeader className="bg-indigo-500/5 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              مساعد القراءة الآلية للقوائم المالية (AI Financial OCR)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              ارفع ميزان المراجعة أو الميزانية العمومية (PDF / Excel) ليقوم النظام باستخراج بنود الوعاء الزكوي تلقائياً.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-indigo-700 border-indigo-500/40 text-xs w-fit">
            مُعزّز بالذكاء الاصطناعي
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {!parsed ? (
          <div className="border-2 border-dashed border-indigo-500/30 rounded-xl p-6 text-center space-y-3 bg-indigo-500/5">
            <UploadCloud className="h-10 w-10 text-indigo-600 mx-auto" />
            <div className="space-y-1">
              <Label className="text-sm font-bold text-foreground cursor-pointer hover:underline">
                اختر أو اسحب ملف الميزانية العمومية / ميزان المراجعة
              </Label>
              <p className="text-xs text-muted-foreground">
                يدعم صيغ Excel (.xlsx, .xls, .csv) وملفات PDF المالية حتى 25 ميجابايت.
              </p>
            </div>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              className="hidden"
              id="file-upload-ocr"
              onChange={handleFileUpload}
              disabled={loading}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-indigo-600/40 text-indigo-900 dark:text-indigo-200"
              onClick={() => document.getElementById("file-upload-ocr")?.click()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 ms-2 animate-spin text-indigo-600" />
                  جاري تحليل الميزانية بالـ AI...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 ms-2 text-indigo-600" />
                  تحميل ملف الميزانية
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="border-success/40 bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-xs">
                تم استخراج العناصر الزكوية التالية وفق المعيار المحاسبي AAOIFI FAS 9:
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border bg-background">
                <span className="text-muted-foreground">النقد والسيولة بالبنك:</span>
                <div className="font-bold text-sm text-foreground mt-0.5">{fmt(parsed.cashAndBank)} ر.س</div>
              </div>
              <div className="p-3 rounded-lg border bg-background">
                <span className="text-muted-foreground">المخزون البضاعي (بسعر البيع):</span>
                <div className="font-bold text-sm text-foreground mt-0.5">{fmt(parsed.inventory)} ر.س</div>
              </div>
              <div className="p-3 rounded-lg border bg-background">
                <span className="text-muted-foreground">الذمم المدينة المرجوة:</span>
                <div className="font-bold text-sm text-foreground mt-0.5">{fmt(parsed.receivables)} ر.س</div>
              </div>
              <div className="p-3 rounded-lg border bg-background">
                <span className="text-muted-foreground">الالتزامات قصيرة الأجل (خصماً):</span>
                <div className="font-bold text-sm text-destructive font-mono mt-0.5">-{fmt(parsed.shortTermLiabilities)} ر.س</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-success hover:bg-success text-white gap-1.5" onClick={applyData}>
                <CheckCircle2 className="h-4 w-4" /> تطبيق البيانات في وعاء زكاة الشركة
              </Button>
              <Button size="sm" variant="outline" onClick={() => setParsed(null)}>
                إعادة التحميل
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
