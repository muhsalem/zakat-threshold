import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  User,
  Building2,
  Users as UsersIcon,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const KEY = "zakat_onboarding_v1";

type Kind = "individual" | "company" | "group";
type Country = "SA" | "EG" | "AE" | "TR" | "MY" | "US" | "GLOBAL";

const KINDS: {
  id: Kind;
  label: string;
  desc: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "individual", label: "فرد", desc: "حاسبة نقود وذهب وأسهم وعقار", to: "/", icon: User },
  {
    id: "company",
    label: "شركة/مؤسسة",
    desc: "زكاة عروض التجارة والميزانية",
    to: "/organizations",
    icon: Building2,
  },
  {
    id: "group",
    label: "مجموعة/شراكة",
    desc: "توزيع الزكاة على الشركاء",
    to: "/group-zakat",
    icon: UsersIcon,
  },
];

const COUNTRIES: { id: Country; label: string }[] = [
  { id: "SA", label: "السعودية" },
  { id: "EG", label: "مصر" },
  { id: "AE", label: "الإمارات" },
  { id: "TR", label: "تركيا" },
  { id: "MY", label: "ماليزيا" },
  { id: "US", label: "الولايات المتحدة" },
  { id: "GLOBAL", label: "دولي / آخر" },
];

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<Kind | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const done = window.localStorage.getItem(KEY);
      if (!done) setOpen(true);
    } catch {}
  }, []);

  function finish() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ kind, country, at: Date.now() }));
    } catch {}
    setOpen(false);
    const target = KINDS.find((k) => k.id === kind)?.to ?? "/";
    navigate({ to: target });
  }

  const canNext = (step === 0 && !!kind) || (step === 1 && !!country);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            أهلاً بك في نِصاب — لنبدأ بخطوتين
          </DialogTitle>
          <DialogDescription>
            نُخصّص التجربة حسب نوع المستخدم والدولة. يمكنك تغيير كل شيء لاحقاً من الإعدادات.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1.5 w-16 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">من أنت؟</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {KINDS.map((k) => {
                const Icon = k.icon;
                const active = kind === k.id;
                return (
                  <Card
                    key={k.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setKind(k.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setKind(k.id)}
                    className={`cursor-pointer p-4 transition-all hover:border-primary hover:shadow-md ${active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-6 w-6 text-primary" />
                      {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="mt-2 font-semibold">{k.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{k.desc}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              اختر دولتك (لعملة النصاب والمرجع التنظيمي)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COUNTRIES.map((c) => (
                <Button
                  key={c.id}
                  variant={country === c.id ? "default" : "outline"}
                  onClick={() => setCountry(c.id)}
                  className="justify-start"
                >
                  {country === c.id && <CheckCircle2 className="ms-2 h-4 w-4" />}
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              try {
                window.localStorage.setItem(KEY, "skipped");
              } catch {}
              setOpen(false);
            }}
          >
            تخطّي
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowRight className="ms-1 h-4 w-4" /> السابق
              </Button>
            )}
            {step < 1 ? (
              <Button disabled={!canNext} onClick={() => setStep(step + 1)}>
                التالي <ArrowLeft className="me-1 h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={!canNext} onClick={finish}>
                ابدأ الحساب <ArrowLeft className="me-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
