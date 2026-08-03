import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, Plus, Star } from "lucide-react";
import { DEFAULT_CONFIG, type TemplateConfig, type TemplateKind } from "@/lib/pdf/types";
import {
  listPdfTemplates,
  savePdfTemplate,
  deletePdfTemplate,
  makeDefaultConfig,
} from "@/lib/pdf/reports.functions";
import { generateReportBlob } from "@/lib/pdf/engine";

export const Route = createFileRoute("/_authenticated/pdf-templates")({
  head: () => ({
    meta: [
      { title: "قوالب تقارير PDF · نِصاب" },
      { name: "description", content: "إدارة وتخصيص قوالب تقارير الزكاة (شعار، ألوان، أقسام، ختم، ترويسة)." },
      { property: "og:title", content: "قوالب تقارير PDF · نِصاب" },
      { property: "og:description", content: "قوالب PDF قابلة للتخصيص لتقارير الزكاة." },
    ],
  }),
  component: PdfTemplatesPage,
});

const SAMPLE_PAYLOAD = {
  report_uid: "RPT-2026-000001",
  verify_token: "00000000-0000-0000-0000-000000000000",
  kind: "declaration" as TemplateKind,
  title: "تقرير الزكاة السنوي",
  issued_at: new Date().toISOString(),
  issuer_name: "نِصاب — منصة الزكاة",
  owner: { name: "محمد أحمد", profession: "مهندس", country: "SA" },
  meta: { currency: "SAR", hijri_year: "1447هـ", gregorian_date: "2026-01-15" },
  inputs: [
    { label: "النقد والحسابات", value: "150,000 SAR" },
    { label: "الذهب (85g)", value: "22,500 SAR" },
  ],
  assets: [
    { label: "إجمالي الأصول الزكوية", value: "172,500 SAR" },
    { label: "الديون الحالّة", value: "12,500 SAR" },
  ],
  calc_steps: [
    { label: "الوعاء الزكوي", value: "160,000 SAR" },
    { label: "النصاب المرجعي", value: "22,500 SAR" },
    { label: "نسبة الزكاة", value: "2.5%" },
  ],
  deductions: [
    { label: "قروض شخصية حالّة", value: "10,000 SAR", included: true },
    { label: "مهر مؤجل", value: "50,000 SAR", included: false },
  ],
  results: [
    { label: "زكاة النقد والذهب", value: "4,000 SAR", emphasize: true },
    { label: "الإجمالي المستحق", value: "4,000 SAR", emphasize: true },
  ],
  sharia_refs: [
    { ref: "AAOIFI معيار 35", note: "خصم الديون الحالّة" },
    { ref: "مجمع الفقه الإسلامي", note: "نصاب الذهب 85 جرامًا" },
  ],
  content_hash: "sample1234567890abcdef".repeat(3),
  version: 1,
};

function PdfTemplatesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPdfTemplates);
  const saveFn = useServerFn(savePdfTemplate);
  const delFn = useServerFn(deletePdfTemplate);

  const { data: templates } = useQuery({
    queryKey: ["pdf-templates"],
    queryFn: () => listFn(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("قالب جديد");
  const [kind, setKind] = useState<TemplateKind>("declaration");
  const [isDefault, setIsDefault] = useState(false);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (!templates || !selectedId) return;
    const t = templates.find((x) => x.id === selectedId);
    if (!t) return;
    setName(t.name);
    setKind(t.kind as TemplateKind);
    setIsDefault(!!t.is_default);
    setConfig(makeDefaultConfig(t.config as Partial<TemplateConfig>));
  }, [selectedId, templates]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: { id: selectedId ?? undefined, name, kind, is_default: isDefault, config },
      }),
    onSuccess: (row) => {
      toast.success("تم الحفظ");
      if (row && "id" in row) setSelectedId((row as { id: string }).id);
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("تم الحذف");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
    },
  });

  // Live preview
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const blob = await generateReportBlob(SAMPLE_PAYLOAD, config);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = url;
        if (iframeRef.current) iframeRef.current.src = url;
      } catch (e) {
        console.error("preview failed", e);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [config]);

  const patch = <K extends keyof TemplateConfig>(k: K, v: Partial<TemplateConfig[K]>) => {
    setConfig((prev) => ({ ...prev, [k]: { ...(prev[k] as object), ...(v as object) } as TemplateConfig[K] }));
  };

  const patchSection = (k: keyof TemplateConfig["sections"], v: boolean) => {
    setConfig((prev) => ({ ...prev, sections: { ...prev.sections, [k]: v } }));
  };

  const newTemplate = () => {
    setSelectedId(null);
    setName("قالب جديد");
    setKind("declaration");
    setIsDefault(false);
    setConfig(DEFAULT_CONFIG);
  };

  return (
    <div dir="rtl" className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">قوالب تقارير PDF</h1>
          <p className="text-muted-foreground text-sm">
            خصّص شكل ومحتوى تقاريرك واحفظ عدة قوالب لكل نوع.
          </p>
        </div>
        <Link to="/reports-history">
          <Button variant="outline">سجل التقارير</Button>
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Templates list */}
        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">قوالبي</CardTitle>
            <Button size="sm" onClick={newTemplate}>
              <Plus className="h-4 w-4 ms-1" />
              جديد
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {(templates ?? []).map((t) => (
              <div
                key={t.id}
                className={`p-2 rounded border cursor-pointer flex items-center justify-between ${
                  selectedId === t.id ? "bg-primary/10 border-primary" : ""
                }`}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1">
                    {t.is_default && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                    {t.name}
                  </div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {t.kind}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("حذف القالب؟")) del.mutate(t.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {(!templates || templates.length === 0) && (
              <p className="text-xs text-muted-foreground">لا توجد قوالب — أنشئ الأول.</p>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="col-span-5">
          <CardHeader>
            <CardTitle className="text-base">تخصيص القالب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اسم القالب</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>نوع التقرير</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as TemplateKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="declaration">إقرار زكوي</SelectItem>
                    <SelectItem value="compliance">امتثال</SelectItem>
                    <SelectItem value="certified">معتمد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} id="is-def" />
              <Label htmlFor="is-def">القالب الافتراضي لهذا النوع</Label>
            </div>

            <Tabs defaultValue="brand" dir="rtl">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="brand">الهوية</TabsTrigger>
                <TabsTrigger value="sections">الأقسام</TabsTrigger>
                <TabsTrigger value="hf">الترويسة/التذييل</TabsTrigger>
                <TabsTrigger value="stamp">الختم</TabsTrigger>
                <TabsTrigger value="text">نصوص</TabsTrigger>
              </TabsList>

              <TabsContent value="brand" className="space-y-3 pt-3">
                <div>
                  <Label>اسم الجهة</Label>
                  <Input
                    value={config.brand.org_name}
                    onChange={(e) => patch("brand", { org_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>رابط الشعار (URL)</Label>
                  <Input
                    value={config.brand.logo_url ?? ""}
                    onChange={(e) => patch("brand", { logo_url: e.target.value || null })}
                    placeholder="https://…/logo.png"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>اللون الأساسي</Label>
                    <Input
                      type="color"
                      value={config.brand.primary_color}
                      onChange={(e) => patch("brand", { primary_color: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>لون التمييز</Label>
                    <Input
                      type="color"
                      value={config.brand.accent_color}
                      onChange={(e) => patch("brand", { accent_color: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>حجم العناوين ({config.brand.heading_size}pt)</Label>
                  <Slider
                    min={14}
                    max={24}
                    step={1}
                    value={[config.brand.heading_size]}
                    onValueChange={(v) => patch("brand", { heading_size: v[0] })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sections" className="space-y-2 pt-3">
                {(
                  [
                    ["owner_info", "بيانات صاحب الإقرار"],
                    ["inputs", "المدخلات الأساسية"],
                    ["assets", "تفاصيل الأصول"],
                    ["calc_steps", "خطوات الحساب"],
                    ["deductions", "الخصومات"],
                    ["results", "النتائج النهائية"],
                    ["notes", "الملاحظات"],
                    ["sharia_refs", "المراجع الشرعية"],
                    ["legal_notice", "التنويهات القانونية"],
                    ["verify_qr", "QR للتحقق من التقرير"],
                  ] as Array<[keyof TemplateConfig["sections"], string]>
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between border rounded p-2">
                    <Label htmlFor={`sec-${key}`}>{label}</Label>
                    <Switch
                      id={`sec-${key}`}
                      checked={config.sections[key]}
                      onCheckedChange={(v) => patchSection(key, v)}
                    />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="hf" className="space-y-3 pt-3">
                <div className="border rounded p-3 space-y-2">
                  <div className="font-medium text-sm">الترويسة</div>
                  <div className="flex items-center justify-between">
                    <Label>إظهار الشعار</Label>
                    <Switch
                      checked={config.header.show_logo}
                      onCheckedChange={(v) => patch("header", { show_logo: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>إظهار اسم الجهة</Label>
                    <Switch
                      checked={config.header.show_org}
                      onCheckedChange={(v) => patch("header", { show_org: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>إظهار رقم التقرير</Label>
                    <Switch
                      checked={config.header.show_report_no}
                      onCheckedChange={(v) => patch("header", { show_report_no: v })}
                    />
                  </div>
                  <Input
                    placeholder="نص إضافي في الترويسة"
                    value={config.header.custom_text}
                    onChange={(e) => patch("header", { custom_text: e.target.value })}
                  />
                </div>
                <div className="border rounded p-3 space-y-2">
                  <div className="font-medium text-sm">التذييل</div>
                  <div className="flex items-center justify-between">
                    <Label>ترقيم الصفحات (X من Y)</Label>
                    <Switch
                      checked={config.footer.show_page_numbers}
                      onCheckedChange={(v) => patch("footer", { show_page_numbers: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>اسم المُصدر والتاريخ</Label>
                    <Switch
                      checked={config.footer.show_issuer}
                      onCheckedChange={(v) => patch("footer", { show_issuer: v })}
                    />
                  </div>
                  <Input
                    placeholder="نص إضافي في التذييل"
                    value={config.footer.custom_text}
                    onChange={(e) => patch("footer", { custom_text: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="stamp" className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <Label>تفعيل الختم</Label>
                  <Switch
                    checked={config.stamp.enabled}
                    onCheckedChange={(v) => patch("stamp", { enabled: v })}
                  />
                </div>
                <div>
                  <Label>رابط صورة الختم (PNG شفافة)</Label>
                  <Input
                    value={config.stamp.image_url ?? ""}
                    onChange={(e) => patch("stamp", { image_url: e.target.value || null })}
                    placeholder="https://…/stamp.png"
                  />
                </div>
                <div>
                  <Label>الموضع</Label>
                  <Select
                    value={config.stamp.position}
                    onValueChange={(v) =>
                      patch("stamp", { position: v as TemplateConfig["stamp"]["position"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tl">أعلى يسار</SelectItem>
                      <SelectItem value="tr">أعلى يمين</SelectItem>
                      <SelectItem value="bl">أسفل يسار</SelectItem>
                      <SelectItem value="br">أسفل يمين</SelectItem>
                      <SelectItem value="center">في المنتصف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الشفافية ({Math.round(config.stamp.opacity * 100)}%)</Label>
                  <Slider
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={[config.stamp.opacity]}
                    onValueChange={(v) => patch("stamp", { opacity: v[0] })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>اسم المُعتمِد</Label>
                    <Input
                      value={config.stamp.signer_name}
                      onChange={(e) => patch("stamp", { signer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>رقم الترخيص</Label>
                    <Input
                      value={config.stamp.signer_license}
                      onChange={(e) => patch("stamp", { signer_license: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-3 pt-3">
                <div>
                  <Label>ملاحظات وتوصيات</Label>
                  <Textarea
                    rows={3}
                    value={config.notes_text}
                    onChange={(e) => setConfig((p) => ({ ...p, notes_text: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>التنويه القانوني</Label>
                  <Textarea
                    rows={3}
                    value={config.legal_notice_text}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, legal_notice_text: e.target.value }))
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="h-4 w-4 ms-1" />
                {selectedId ? "تحديث القالب" : "حفظ القالب"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live preview */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-base">معاينة مباشرة</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              ref={iframeRef}
              className="w-full h-[70vh] border rounded"
              title="PDF Preview"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
