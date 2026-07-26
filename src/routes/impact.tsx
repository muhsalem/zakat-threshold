import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * R7 — تحويل مؤشرات الأثر من نص وصفي إلى أرقام فعلية مُشتقّة من قاعدة البيانات:
 *  - عدد الحسابات المحفوظة
 *  - عدد المكلَّفين المستخدمين للمنصة
 *  - إجمالي الزكاة المُحتسبة (بأي عملة، مقرّبة)
 *  - متوسط قيمة الزكاة لكل حساب
 *  - عدد الشركات/المؤسسات النشطة
 *  - عدد التقارير المُعتمَدة (approvals)
 *  - مُضاعف SROI 4.2× تقديري استرشادي (غير مُستنَد لدراسة منشورة محدَّدة)
 */
const getImpactStats = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const [records, orgs, approvals, sums] = await Promise.all([
    supabase.from("zakat_records").select("*", { count: "exact", head: true }),
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase
      .from("zakat_approvals")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase.from("zakat_records").select("zakat_due, user_id"),
  ]);

  const rows = (sums.data ?? []) as Array<{ zakat_due: number | null; user_id: string | null }>;
  const total = rows.reduce((s, r) => s + (Number(r.zakat_due) || 0), 0);
  const users = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;
  const recordsCount = records.count ?? rows.length;
  const avg = recordsCount > 0 ? total / recordsCount : 0;

  const SROI_MULTIPLIER = 4.2;
  const socialValue = total * SROI_MULTIPLIER;

  return {
    records: recordsCount,
    users,
    organizations: orgs.count ?? 0,
    approvals: approvals.count ?? 0,
    zakat_total: Math.round(total),
    zakat_avg: Math.round(avg),
    social_value: Math.round(socialValue),
    sroi_ratio: SROI_MULTIPLIER,
    sdg_alignment: [1, 2, 8, 10],
    updated: new Date().toISOString(),
  };
});

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "الأثر الاجتماعي والتنموي — SROI بأرقام حيّة" },
      {
        name: "description",
        content:
          "مؤشرات الأثر الاجتماعي SROI ومحاذاة أهداف التنمية المستدامة SDGs لحاسبة الزكاة — بأرقام مُحسَّبة من قاعدة البيانات لحظياً.",
      },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["impact-stats"],
      queryFn: () => getImpactStats(),
    }),
  errorComponent: () => <div className="p-6">تعذّر تحميل المؤشرات.</div>,
  notFoundComponent: () => <div className="p-6">غير موجود.</div>,
  component: ImpactPage,
});

const fmtNum = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "ok";
}) {
  const cls =
    tone === "primary"
      ? "border-primary/40 bg-primary/5"
      : tone === "ok"
        ? "border-emerald-300 bg-emerald-50"
        : "";
  return (
    <Card className={cls}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ImpactPage() {
  const { data } = useQuery({
    queryKey: ["impact-stats"],
    queryFn: () => getImpactStats(),
  });

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h1 className="text-3xl font-bold">الأثر الاجتماعي SROI</h1>
        <Badge variant="secondary" className="me-auto">
          أرقام حيّة
        </Badge>
      </div>
      <p className="text-muted-foreground mb-8">
        قياس الأثر الاجتماعي والتنموي للزكاة المُحتسبة عبر المنصة، وفق منهجية Social Return on
        Investment، ومحاذاة أهداف التنمية المستدامة (SDGs). الأرقام أدناه مُشتقّة مباشرة من قاعدة
        بيانات المنصة.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="حسابات زكاة محفوظة" value={fmtNum(data?.records ?? 0)} />
        <Stat label="عدد المكلَّفين النشطين" value={fmtNum(data?.users ?? 0)} />
        <Stat label="شركات/مؤسسات مسجَّلة" value={fmtNum(data?.organizations ?? 0)} />
        <Stat label="تقارير معتمَدة شرعياً" value={fmtNum(data?.approvals ?? 0)} tone="ok" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <Stat
          label="إجمالي الزكاة المُحتسَبة"
          value={fmtNum(data?.zakat_total ?? 0)}
          hint="بمجموع العملات المُدخَلة (تقريبي)"
          tone="primary"
        />
        <Stat label="متوسط الزكاة لكل حساب" value={fmtNum(data?.zakat_avg ?? 0)} />
        <Stat
          label={`القيمة الاجتماعية (SROI ${data?.sroi_ratio ?? 4.2}×)`}
          value={fmtNum(data?.social_value ?? 0)}
          hint="إجمالي الزكاة × مُضاعِف الأثر"
          tone="primary"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">أهداف التنمية المُحاذية (SDGs)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(data?.sdg_alignment ?? []).map((n) => (
              <Badge key={n} variant="outline" className="text-sm py-1 px-3">
                SDG {n}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            القضاء على الفقر (1)، القضاء التام على الجوع (2)، العمل اللائق ونمو الاقتصاد (8)، الحدّ
            من أوجه عدم المساواة (10).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>منهجية القياس</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>المُدخلات:</strong> دقة الحساب وفق AAOIFI 35، تخصيص وفق المصارف الثمانية، مسار
              توثيق كامل.
            </li>
            <li>
              <strong>المخرجات:</strong> حسابات موثقة، تقارير قابلة للتحقق رقمياً (HMAC)، توزيع شفاف
              على المستحقّين.
            </li>
            <li>
              <strong>النتائج:</strong> رفع المستحقين، تمكين اقتصادي، تقليل الفجوات المجتمعية.
            </li>
            <li>
              <strong>الأثر (SROI 4.2×):</strong> مُضاعِف تقديري استرشادي (غير مُستنَد لدراسة محدَّدة
              منشورة بعد) لتوضيح فكرة القيمة الاجتماعية المضاعَفة للزكاة الموزَّعة بدقة — لكل وحدة
              نقدية زكاة نقدّر القيمة الاجتماعية الناتجة بنحو 4.2 وحدة، وفق منهجية SROI العامة لا
              دراسة حالة خاصة بالمنصة.
            </li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-6">
        آخر تحديث: {data ? new Date(data.updated).toLocaleString("ar") : "—"}
      </p>
    </main>
  );
}
