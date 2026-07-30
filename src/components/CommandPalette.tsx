import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Calculator,
  Building2,
  Wheat,
  Landmark,
  History,
  LineChart,
  ShieldCheck,
  Bot,
  FileCheck,
  Boxes,
  ScrollText,
  Sparkles,
  Coins,
  Home,
  Trophy,
  Users,
  Server,
  Activity,
  Globe,
  Scale,
  Lock,
  BookOpen,
} from "lucide-react";

type Cmd = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  keywords?: string;
};

const COMMANDS: Cmd[] = [
  {
    label: "الرئيسية / حاسبة الأفراد",
    to: "/",
    icon: Home,
    group: "الحاسبات",
    keywords: "home individual افراد",
  },
  {
    label: "زكاة الشركات والمؤسسات",
    to: "/organizations",
    icon: Building2,
    group: "الحاسبات",
    keywords: "companies orgs شركات",
  },
  { label: "زكاة الزروع والثمار", to: "/crops", icon: Wheat, group: "الحاسبات" },
  { label: "زكاة المجموعات / الشراكات", to: "/group-zakat", icon: Users, group: "الحاسبات" },
  {
    label: "حاسبة الحول متعدد السنوات",
    to: "/demo",
    icon: Calculator,
    group: "الحاسبات",
    keywords: "hawl demo",
  },
  {
    label: "المستشار الشرعي الذكي",
    to: "/advisor",
    icon: Bot,
    group: "أدوات",
    keywords: "ai advisor",
  },
  { label: "سجل الأسعار التاريخي", to: "/prices-history", icon: History, group: "أدوات" },
  { label: "تدقيق النصاب", to: "/nisab-audit", icon: ScrollText, group: "أدوات" },
  { label: "لوحة التحليلات", to: "/analytics", icon: LineChart, group: "أدوات" },
  { label: "التاريخ / سجلاتي", to: "/history", icon: History, group: "حسابي" },
  { label: "تسجيل الدخول / حساب", to: "/auth", icon: Lock, group: "حسابي" },
  { label: "الأثر الاجتماعي", to: "/impact", icon: Sparkles, group: "معلومات" },

  { label: "مصفوفة الامتثال", to: "/compliance", icon: FileCheck, group: "معلومات" },
  { label: "الحوكمة والاستدامة (ESG)", to: "/esg", icon: Scale, group: "معلومات" },
  { label: "الأمان والخصوصية", to: "/security", icon: ShieldCheck, group: "معلومات" },
  { label: "المعرض والإنجازات", to: "/showcase", icon: Trophy, group: "معلومات" },
  { label: "التقييم الشامل", to: "/evaluation", icon: BookOpen, group: "معلومات" },
  { label: "التكامل المؤسسي (ERP)", to: "/enterprise", icon: Boxes, group: "المطوّرون" },
  { label: "توصيات البرمجيات", to: "/software-recommendations", icon: Server, group: "المطوّرون" },
  { label: "دليل المطوّرين والـ API", to: "/developers", icon: Globe, group: "المطوّرون" },
  { label: "حالة النظام", to: "/status", icon: Activity, group: "المطوّرون" },

  { label: "الشروط والاستخدام", to: "/legal/terms", icon: ScrollText, group: "قانوني" },
  { label: "سياسة الخصوصية", to: "/legal/privacy", icon: Lock, group: "قانوني" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = Array.from(new Set(COMMANDS.map((c) => c.group)));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح لوحة الأوامر (Ctrl+K)"
        className="print:hidden inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
      >
        <Coins className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden lg:inline">ابحث أو انتقل…</span>
        <kbd className="pointer-events-none ms-1 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>


      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="اكتب للبحث في الصفحات والأدوات…" dir="rtl" />
        <CommandList>
          <CommandEmpty>لا توجد نتائج مطابقة.</CommandEmpty>
          {groups.map((g, gi) => (
            <div key={g}>
              {gi > 0 && <CommandSeparator />}
              <CommandGroup heading={g}>
                {COMMANDS.filter((c) => c.group === g).map((c) => {
                  const Icon = c.icon;
                  return (
                    <CommandItem
                      key={c.to}
                      value={`${c.label} ${c.keywords ?? ""}`}
                      onSelect={() => {
                        setOpen(false);
                        navigate({ to: c.to });
                      }}
                    >
                      <Icon className="me-2 h-4 w-4" />
                      <span>{c.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ))}
          <CommandSeparator />
          <CommandGroup heading="اختصارات">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/" });
              }}
            >
              <Home className="me-2 h-4 w-4" /> ابدأ حساب زكاة جديدة
              <CommandShortcut>G H</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/advisor" });
              }}
            >
              <Bot className="me-2 h-4 w-4" /> اسأل المستشار الشرعي
              <CommandShortcut>G A</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
