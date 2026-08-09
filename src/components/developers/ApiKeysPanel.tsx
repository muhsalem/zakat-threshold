import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyRound, Copy, Trash2, Power } from "lucide-react";
import { listApiKeys, createApiKey, setApiKeyActive, deleteApiKey } from "@/lib/apiKeys.functions";
import { useAuth } from "@/hooks/useAuth";

const SCOPES = [
  { id: "zakat:calc", label: "حساب الزكاة (zakat:calc)" },
  { id: "zakat:verify", label: "التحقق من البصمة (zakat:verify)" },
  { id: "rules:read", label: "قراءة الكتالوج (rules:read)" },
] as const;

export function ApiKeysPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchKeys = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const toggle = useServerFn(setApiKeyActive);
  const remove = useServerFn(deleteApiKey);

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["zakat:calc", "zakat:verify"]);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const keysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => fetchKeys(),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: { name: name.trim(), scopes: scopes as never, rateLimitPerMin: 60 },
      }),
    onSuccess: (res) => {
      setFreshKey(res.key);
      setName("");
      void qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("تم إنشاء المفتاح — انسخه الآن، لن يُعرض مرة أخرى.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutateAndRefresh = useMutation({
    mutationFn: async (args: { kind: "toggle" | "delete"; id: string; active?: boolean }) =>
      args.kind === "toggle"
        ? toggle({ data: { id: args.id, active: !!args.active } })
        : remove({ data: { id: args.id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("تم تحديث المفاتيح.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <Alert>
        <KeyRound className="h-4 w-4" />
        <AlertTitle>مطلوب تسجيل الدخول</AlertTitle>
        <AlertDescription>
          سجّل الدخول لإنشاء مفاتيح وصول لواجهة v1 — الحساب والتحقق لا يعملان بدون مفتاح صالح.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> مفاتيح الوصول (API Keys)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {freshKey && (
          <Alert>
            <AlertTitle>مفتاحك الجديد — يُعرض مرة واحدة فقط</AlertTitle>
            <AlertDescription className="space-y-2">
              <code dir="ltr" className="block break-all bg-muted rounded p-2 text-xs">
                {freshKey}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(freshKey);
                  toast.success("تم النسخ");
                }}
              >
                <Copy className="h-4 w-4 ms-1" /> نسخ
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="key-name">اسم المفتاح</Label>
            <Input
              id="key-name"
              value={name}
              placeholder="مثال: تكامل ERP الإنتاجي"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            disabled={!name.trim() || scopes.length === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            إنشاء مفتاح
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          {SCOPES.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={scopes.includes(s.id)}
                onCheckedChange={(v) =>
                  setScopes((prev) => (v ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                }
              />
              {s.label}
            </label>
          ))}
        </div>

        <div className="space-y-2">
          {keysQuery.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
          {keysQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد مفاتيح بعد.</p>
          )}
          {keysQuery.data?.map((k) => (
            <div
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{k.name}</span>
                  <Badge variant={k.active ? "default" : "secondary"}>
                    {k.active ? "مفعّل" : "موقوف"}
                  </Badge>
                </div>
                <p dir="ltr" className="text-xs text-muted-foreground">
                  {k.key_prefix}••••••••••••••••
                </p>
                <p className="text-xs text-muted-foreground">
                  الصلاحيات: {(k.scopes ?? []).join("، ")} — الطلبات: {k.request_count} — الحد:{" "}
                  {k.rate_limit_per_min}/دقيقة
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mutateAndRefresh.mutate({ kind: "toggle", id: k.id, active: !k.active })
                  }
                >
                  <Power className="h-4 w-4 ms-1" />
                  {k.active ? "إيقاف" : "تفعيل"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => mutateAndRefresh.mutate({ kind: "delete", id: k.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
