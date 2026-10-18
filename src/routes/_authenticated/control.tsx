import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Facebook, Upload, Users } from "lucide-react";

import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import {
  getFacebookStatus,
  importHistoricalData,
  inviteUser,
  listUsersWithRoles,
  saveFacebookSettings,
  setUserRole,
  testFacebookPost,
} from "@/lib/admin-console.functions";

export const Route = createFileRoute("/_authenticated/control")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم الإدارية · نِصاب" },
      {
        name: "description",
        content:
          "إعدادات المشرف: ربط فيسبوك، استيراد البيانات التاريخية، وإدارة المستخدمين والأدوار.",
      },
      { property: "og:title", content: "لوحة التحكم الإدارية · نِصاب" },
      {
        property: "og:description",
        content: "إدارة النشر اليومي والاستيراد والأدوار في منصة نِصاب.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ControlPage,
});

const ROLE_LABEL: Record<string, string> = {
  admin: "مشرف",
  jeweler: "صائغ",
  ambassador: "سفير",
  volunteer: "متطوع",
};
const card = "rounded-2xl border border-border bg-card p-5 shadow-sm";

function ControlPage() {
  const { isAdmin, loading } = useAuth();
  if (loading)
    return (
      <Page eyebrow="الإدارة" title="لوحة التحكم" sub="جارٍ التحميل…">
        {null}
      </Page>
    );
  if (!isAdmin)
    return (
      <Page eyebrow="الإدارة" title="لوحة التحكم" sub="هذه الصفحة للمشرفين فقط.">
        {null}
      </Page>
    );
  return (
    <Page
      eyebrow="الإدارة"
      title="لوحة التحكم"
      sub="النشر اليومي على فيسبوك، استيراد البيانات القديمة، والمستخدمون والأدوار."
    >
      <Tabs defaultValue="facebook" dir="rtl">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="facebook">
            <Facebook className="size-4 ms-1" />
            فيسبوك
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="size-4 ms-1" />
            استيراد
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="size-4 ms-1" />
            المستخدمون
          </TabsTrigger>
        </TabsList>
        <TabsContent value="facebook">
          <FacebookPanel />
        </TabsContent>
        <TabsContent value="import">
          <ImportPanel />
        </TabsContent>
        <TabsContent value="users">
          <UsersPanel />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

function FacebookPanel() {
  const getStatus = useServerFn(getFacebookStatus);
  const save = useServerFn(saveFacebookSettings);
  const test = useServerFn(testFacebookPost);
  const [st, setSt] = useState<Awaited<ReturnType<typeof getFacebookStatus>> | null>(null);
  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const s = await getStatus();
    setSt(s);
    setPageId(s.pageId);
    setEnabled(s.enabled);
  }, [getStatus]);
  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    setMsg("");
    try {
      await save({ data: { pageId, token: token || undefined, enabled } });
      setToken("");
      setMsg("تم الحفظ.");
      await load();
    } catch (e) {
      setMsg(`خطأ: ${(e as Error).message}`);
    }
  };
  const onTest = async () => {
    setMsg("جارٍ النشر…");
    const r = await test();
    setMsg(r.posted ? "تم النشر على الصفحة." : `لم يُنشر: ${r.reason}`);
    await load();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={card}>
        <h3 className="font-semibold mb-3">إعدادات الصفحة</h3>
        <label className="text-sm text-muted-foreground">معرّف الصفحة (Page ID)</label>
        <Input
          dir="ltr"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          placeholder="123456789012345"
          className="mb-3"
        />
        <label className="text-sm text-muted-foreground">
          رمز وصول الصفحة {st?.hasToken && "(محفوظ — اتركه فارغًا للإبقاء عليه)"}
        </label>
        <Input
          dir="ltr"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="EAAB…"
          className="mb-3"
          autoComplete="off"
        />
        <div className="flex items-center gap-2 mb-4">
          <Switch checked={enabled} onCheckedChange={setEnabled} id="fb-on" />
          <label htmlFor="fb-on">النشر اليومي مفعّل</label>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave}>حفظ</Button>
          <Button variant="outline" onClick={onTest} disabled={!st?.hasToken}>
            نشر تجريبي الآن
          </Button>
        </div>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </div>
      <div className={card}>
        <h3 className="font-semibold mb-3">حالة النشر اليومي</h3>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">الحالة</dt>
          <dd>{st?.enabled ? "مفعّل" : "موقوف"}</dd>
          <dt className="text-muted-foreground">الرمز</dt>
          <dd>{st?.hasToken ? "محفوظ" : "غير محفوظ"}</dd>
          <dt className="text-muted-foreground">آخر تشغيل</dt>
          <dd dir="ltr" className="text-end">
            {st?.lastRun ? new Date(st.lastRun).toLocaleString("ar") : "—"}
          </dd>
          <dt className="text-muted-foreground">النتيجة</dt>
          <dd>{st?.lastRun ? (st.lastPosted ? "نُشر بنجاح" : st.lastReason || "فشل") : "—"}</dd>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          يُنشر الملخص يوميًا الساعة 06:00 UTC بعد تحديث الأسعار. الرمز يُحفظ على الخادم ولا يُعرض
          مرة أخرى.
        </p>
      </div>
    </div>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const head = (lines[0] ?? "").split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((l) => {
    const cells = l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}

function ImportPanel() {
  const run = useServerFn(importHistoricalData);
  const [target, setTarget] = useState<"nisab_history" | "jeweler_feed">("nisab_history");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [report, setReport] = useState<Awaited<ReturnType<typeof importHistoricalData>> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onFile = async (f: File | undefined) => {
    setReport(null);
    setErr("");
    if (!f) return;
    const text = await f.text();
    try {
      const parsed = f.name.endsWith(".json") ? JSON.parse(text) : parseCsv(text);
      if (!Array.isArray(parsed)) throw new Error("الملف يجب أن يكون قائمة صفوف");
      setRows(parsed);
    } catch (e) {
      setErr((e as Error).message);
      setRows([]);
    }
  };
  const go = async (commit: boolean) => {
    setBusy(true);
    setErr("");
    try {
      setReport(await run({ data: { target, rows, commit } }));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className={card}>
      <h3 className="font-semibold mb-1">استيراد من نسخة المشروع القديم</h3>
      <p className="text-sm text-muted-foreground mb-4">
        ملف CSV أو JSON بالأعمدة: country (رمز الدولة مثل EG)، currency، day (YYYY-MM-DD)،
        gold_gram، silver_gram، واختياريًا gold_nisab، silver_nisab، buyback_gram، source. يُفحص كل
        صف (الدولة، التاريخ، الأرقام، التكرار) قبل الحفظ.
      </p>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={target}
          onChange={(e) => setTarget(e.target.value as typeof target)}
        >
          <option value="nisab_history">سجل الأنصبة التاريخي</option>
          <option value="jeweler_feed">أسعار الصاغة</option>
        </select>
        <Input
          type="file"
          accept=".csv,.json"
          className="max-w-xs"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <span className="text-sm text-muted-foreground">{rows.length} صف</span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={!rows.length || busy} onClick={() => go(false)}>
          فحص الملف
        </Button>
        <Button
          disabled={!report || !report.toInsert || busy || report.inserted > 0}
          onClick={() => go(true)}
        >
          حفظ {report?.toInsert ?? 0} صف
        </Button>
      </div>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {report && (
        <div className="mt-4 text-sm space-y-1">
          <p>
            الإجمالي {report.total} · صالح {report.valid} · موجود مسبقًا {report.duplicates} · جاهز
            للحفظ {report.toInsert} · مرفوض {report.errorCount}
          </p>
          {report.inserted > 0 && (
            <p className="font-semibold text-primary">تم حفظ {report.inserted} صف.</p>
          )}
          {report.errors.length > 0 && (
            <ul className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
              {report.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UsersPanel() {
  const list = useServerFn(listUsersWithRoles);
  const invite = useServerFn(inviteUser);
  const setRole = useServerFn(setUserRole);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof listUsersWithRoles>>>([]);
  const [email, setEmail] = useState("");
  const [role, setRoleSel] = useState<"admin" | "jeweler" | "ambassador" | "volunteer">("admin");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => setUsers(await list()), [list]);
  useEffect(() => {
    void load();
  }, [load]);

  const onInvite = async () => {
    setMsg("");
    try {
      const r = await invite({
        data: { email, role, redirectTo: `${window.location.origin}/auth` },
      });
      setMsg(r.ok ? "أُرسلت الدعوة." : `تعذّر: ${r.reason}`);
      if (r.ok) {
        setEmail("");
        await load();
      }
    } catch (e) {
      setMsg(`خطأ: ${(e as Error).message}`);
    }
  };
  const toggle = async (userId: string, r: string, grant: boolean) => {
    const reason = window.prompt(grant ? "سبب منح الصلاحية" : "سبب سحب الصلاحية");
    if (!reason || reason.trim().length < 3) return;
    const res = await setRole({ data: { userId, role: r as typeof role, grant, reason } });
    if (!res.ok) setMsg(res.reason ?? "تعذّر");
    else await load();
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="font-semibold mb-3">دعوة مستخدم جديد</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            dir="ltr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="max-w-xs"
          />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRoleSel(e.target.value as typeof role)}
          >
            {Object.entries(ROLE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Button onClick={onInvite} disabled={!email}>
            إرسال الدعوة
          </Button>
        </div>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <h3 className="font-semibold mb-3">المستخدمون والأدوار ({users.length})</h3>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-start p-2">البريد</th>
              <th className="text-start p-2">الحالة</th>
              <th className="text-start p-2">الأدوار</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: (typeof users)[number]) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-2" dir="ltr">
                  {u.email}
                </td>
                <td className="p-2">{u.invited ? "مدعو" : u.confirmed ? "مؤكد" : "غير مؤكد"}</td>
                <td className="p-2 flex flex-wrap gap-1">
                  {Object.keys(ROLE_LABEL).map((r) => {
                    const has = u.roles.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => toggle(u.id, r, !has)}
                        className={`rounded-full border px-2 py-0.5 text-xs ${has ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
