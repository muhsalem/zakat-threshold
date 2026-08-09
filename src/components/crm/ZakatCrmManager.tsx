import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Building2,
  User,
  Search,
  Plus,
  Filter,
  PhoneCall,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Send,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  MoreVertical,
} from "lucide-react";
import { fmt } from "@/lib/zakat";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export type ClientCategory = "all" | "individual" | "company" | "institution";
export type PipelineStage = "new" | "documents" | "audit" | "sharia" | "issued" | "renew_due";

export interface CrmClient {
  id: string;
  name: string;
  category: "individual" | "company" | "institution";
  phone: string;
  email: string;
  stage: PipelineStage;
  zakatableBase: number;
  zakatDue: number;
  hawlDate: string; // YYYY-MM-DD
  daysUntilHawl: number;
  assignedAccountant: string;
  lastContact: string;
  notes: string;
}

export function ZakatCrmManager() {
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  // قاعدة بيانات العُملاء (CRM Data Store) — لا يوجد بعد ربط فعلي بجدول
  // accountant_clients أو آلية إضافة عميل جديد؛ هذه واجهة معاينة (preview)
  // للتصميم المستهدَف. كانت تُملأ سابقاً ببيانات عملاء وهمية بالكامل
  // (أسماء/هواتف/بريد مُختلَقة) تظهر لكل محاسب — أُزيلت لأنها إيحاء غير
  // صادق ببيانات حقيقية داخل حساب مدفوع فعلياً.
  const [clients, setClients] = useState<CrmClient[]>([]);

  // إحصائيات الـ CRM
  const stats = useMemo(() => {
    const totalClients = clients.length;
    const individualsCount = clients.filter((c) => c.category === "individual").length;
    const corporateCount = clients.filter((c) => c.category !== "individual").length;
    const totalZakatManaged = clients.reduce((s, c) => s + c.zakatDue, 0);
    const renewDueCount = clients.filter(
      (c) => c.stage === "renew_due" || c.daysUntilHawl <= 7,
    ).length;

    return {
      totalClients,
      individualsCount,
      corporateCount,
      totalZakatManaged,
      renewDueCount,
    };
  }, [clients]);

  // تصفية العُملاء
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchCat = selectedCategory === "all" || c.category === selectedCategory;
      const matchStage = stageFilter === "all" || c.stage === stageFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.assignedAccountant.toLowerCase().includes(q);
      return matchCat && matchStage && matchQ;
    });
  }, [clients, selectedCategory, stageFilter, searchQuery]);

  // إرسال تذكير آلي بالواتساب / الإيميل
  const sendReminder = (client: CrmClient) => {
    toast.success(`تم إرسال تذكير الحول الآلي إلى ${client.name}`, {
      description: `تم إرسال التنبيه عبر الواتساب (${client.phone}) والبريد الإلكتروني (${client.email}).`,
    });
  };

  // تصدير بيانات CRM إلى Excel
  const exportCrmExcel = () => {
    const rows = filteredClients.map((c) => ({
      "اسم العميل": c.name,
      الفئة: c.category === "individual" ? "فرد" : c.category === "company" ? "شركة" : "مؤسسة",
      الهاتف: c.phone,
      "البريد الإلكتروني": c.email,
      "مرحلة التدقيق":
        c.stage === "new"
          ? "جديد"
          : c.stage === "documents"
            ? "جمع المستندات"
            : c.stage === "audit"
              ? "تدقيق محاسبي"
              : c.stage === "sharia"
                ? "مراجعة شرعية"
                : c.stage === "issued"
                  ? "شهادة مُصدرة"
                  : "تجديد الحول",
      "الوعاء الزكوي": fmt(c.zakatableBase) + " ر.س",
      "الزكاة الواجبة": fmt(c.zakatDue) + " ر.س",
      "تاريخ الحول": c.hawlDate,
      "الأيام المتبقية": c.daysUntilHawl + " يوم",
      "المحاسب المسؤول": c.assignedAccountant,
      "آخر تواصل": c.lastContact,
      ملاحظات: c.notes,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "CRM");
    XLSX.writeFile(wb, `قاعدة_عملاء_الزكاة_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("تم تصدير سجلات العُملاء (CRM) إلى ملف Excel بنجاح");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs text-warning-foreground">
        معاينة تصميم — هذه اللوحة لا تُخزِّن عملاءك بعد بشكل دائم ولا تتيح إضافة عميل جديد؛ الربط
        الفعلي بسجلات عملائك قادم قريباً.
      </div>
      {/* 1. الترويسة والعنوان الرئيسي */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-xs px-2.5 py-0.5 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 ms-1 inline" /> إدارة علاقات عملاء الزكاة (Zakat
                CRM)
              </Badge>
              <Badge variant="outline" className="text-indigo-100 border-indigo-300/30 text-xs">
                الأفراد والشركات والمؤسسات
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-indigo-400" />
              لوحة إدارة دورة حياة المزكين (Zakat Client Lifecycle CRM)
            </h1>
            <p className="text-sm text-indigo-100/90 max-w-2xl leading-relaxed">
              منظومة متكاملة لمتابعة عُملاء الزكاة، حوكمة المراحل، أتمتة تنبيهات تجديد الحول، وتصدير
              التقارير الإدارية والمحاسبية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={exportCrmExcel}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur gap-1.5 text-xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-success" /> تصدير CRM Excel
            </Button>
          </div>
        </div>
      </div>

      {/* 2. بطاقات الإحصائيات والمؤشرات (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                إجمالي العُملاء المسجلين
              </div>
              <div className="text-lg font-bold text-foreground">{stats.totalClients} عميل</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/10 text-success">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">الأفراد مقابل الشركات</div>
              <div className="text-sm font-bold text-foreground">
                {stats.individualsCount} أفراد | {stats.corporateCount} شركات
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning/10 text-warning-foreground">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                مواشِك استحقاق الحول (&lt; 7 أيام)
              </div>
              <div className="text-lg font-bold text-warning-foreground">
                {stats.renewDueCount} عملاء
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                إجمالي الزكاة المُدارة
              </div>
              <div className="text-lg font-bold text-foreground">
                {fmt(stats.totalZakatManaged)} ر.س
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. أدوات التصفية والبحث في الـ CRM */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <Tabs
              defaultValue="all"
              className="w-full md:w-auto"
              onValueChange={(v) => setSelectedCategory(v as ClientCategory)}
            >
              <TabsList className="grid grid-cols-4 w-full md:w-auto text-xs">
                <TabsTrigger value="all" className="px-3">
                  الكل
                </TabsTrigger>
                <TabsTrigger value="individual" className="px-3">
                  الأفراد
                </TabsTrigger>
                <TabsTrigger value="company" className="px-3">
                  الشركات
                </TabsTrigger>
                <TabsTrigger value="institution" className="px-3">
                  المؤسسات
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="ابحث باسم العميل أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pe-8 h-9 text-xs"
                />
              </div>

              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="h-9 text-xs w-[140px]">
                  <SelectValue placeholder="كل المراحل" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all" className="text-xs">
                    كل المراحل
                  </SelectItem>
                  <SelectItem value="new" className="text-xs">
                    جديد
                  </SelectItem>
                  <SelectItem value="documents" className="text-xs">
                    جمع المستندات
                  </SelectItem>
                  <SelectItem value="audit" className="text-xs">
                    تدقيق محاسبي
                  </SelectItem>
                  <SelectItem value="sharia" className="text-xs">
                    مراجعة شرعية
                  </SelectItem>
                  <SelectItem value="issued" className="text-xs">
                    شهادة مُصدرة
                  </SelectItem>
                  <SelectItem value="renew_due" className="text-xs">
                    تجديد الحول
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* جدول العُملاء */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">اسم العميل / المؤسسة</th>
                  <th className="p-3">الفئة</th>
                  <th className="p-3">المرحلة الحالية</th>
                  <th className="p-3">الوعاء والزكاة</th>
                  <th className="p-3">الحول والتنبيه</th>
                  <th className="p-3">المحاسب المسؤول</th>
                  <th className="p-3 text-center">إجراءات CRM</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      لا توجد سجلات عُملاء مطابقة للبحث.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-foreground">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{c.phone}</span> • <span>{c.email}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {c.category === "individual"
                            ? "فرد"
                            : c.category === "company"
                              ? "شركة"
                              : "مؤسسة"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] border-none ${
                            c.stage === "renew_due"
                              ? "bg-warning text-warning-foreground"
                              : c.stage === "issued"
                                ? "bg-success text-success-foreground"
                                : c.stage === "audit"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-600 text-white"
                          }`}
                        >
                          {c.stage === "new"
                            ? "جديد"
                            : c.stage === "documents"
                              ? "جمع المستندات"
                              : c.stage === "audit"
                                ? "تدقيق محاسبي"
                                : c.stage === "sharia"
                                  ? "مراجعة شرعية"
                                  : c.stage === "issued"
                                    ? "شهادة مُصدرة"
                                    : "تجديد الحول"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{fmt(c.zakatDue)} ر.س</div>
                        <div className="text-[10px] text-muted-foreground">
                          وعاء: {fmt(c.zakatableBase)} ر.س
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-foreground font-mono">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {c.hawlDate}
                        </div>
                        <div
                          className={`text-[10px] font-bold ${c.daysUntilHawl <= 7 ? "text-destructive" : "text-success"}`}
                        >
                          متبقي {c.daysUntilHawl} يوم
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{c.assignedAccountant}</td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1 border-indigo-500/40 text-indigo-700 dark:text-indigo-300"
                          onClick={() => sendReminder(c)}
                        >
                          <Send className="h-3 w-3" /> إرسال تذكير الحول
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
