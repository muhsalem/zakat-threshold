import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2,
  Search,
  Database,
  Cloud,
  Landmark,
  Workflow,
  Shield,
  Server,
  Sparkles,
  ArrowUpRight,
  FileCode2,
  Handshake,
  Mail,
  Zap,
  CheckCircle2,
  Clock,
  Rocket,
  CircleDashed,
  Layers,
  Globe2,
  Download,
  ExternalLink,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SUPPORTED_ERP_FORMATS, type ErpFormat } from "@/lib/erp/journal";

export const Route = createFileRoute("/enterprise")({
  head: () => ({
    meta: [
      { title: "Enterprise Integrations — التكامل المؤسسي | نصاب" },
      {
        name: "description",
        content:
          "Enterprise-grade integrations with SAP, Oracle, Microsoft Dynamics 365, Odoo, QuickBooks, Xero, and Islamic banking APIs via REST, Webhooks, and Open Banking.",
      },
      { property: "og:title", content: "Enterprise Integrations — نصاب" },
      {
        property: "og:description",
        content: "ERP, Accounting, Banking & Automation connectors for banks, corporations, and Islamic financial institutions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnterprisePage,
});

// ────────────────────────────────────────────────────────────────
// Data model
// ────────────────────────────────────────────────────────────────
type Status = "available" | "beta" | "development" | "planned";
type Category = "erp" | "accounting" | "banking" | "automation";
type Tech = "ERP" | "SaaS" | "Banking" | "API" | "REST" | "iPaaS" | "Webhook" | "OAuth";

interface Connector {
  id: string;
  name: string;
  name_ar: string;
  category: Category;
  status: Status;
  short: string;
  short_ar: string;
  logo: string;
  tech: Tech[];
  timeline: string;
}

const CONNECTORS: Connector[] = [
  // ERP
  { id: "sap", name: "SAP S/4HANA", name_ar: "ساب", category: "erp", status: "available", short: "Enterprise ERP Integration", short_ar: "تكامل ERP للمؤسسات", logo: "🔵", tech: ["ERP", "REST", "OAuth"], timeline: "Live" },
  { id: "dynamics", name: "Microsoft Dynamics 365", name_ar: "دايناميكس 365", category: "erp", status: "development", short: "Cloud ERP & Finance", short_ar: "ERP سحابي ومالية", logo: "🟦", tech: ["ERP", "REST", "OAuth"], timeline: "Q3 2027" },
  { id: "oracle", name: "Oracle Fusion", name_ar: "أوراكل فيوجن", category: "erp", status: "development", short: "Enterprise Cloud ERP", short_ar: "ERP سحابي مؤسسي", logo: "🔴", tech: ["ERP", "REST"], timeline: "Q4 2027" },
  { id: "odoo", name: "Odoo", name_ar: "أودو", category: "erp", status: "available", short: "Open-source ERP Suite", short_ar: "منظومة ERP مفتوحة", logo: "🟣", tech: ["ERP", "API", "REST"], timeline: "Live" },
  { id: "netsuite", name: "NetSuite", name_ar: "نت سويت", category: "erp", status: "planned", short: "Cloud Business Suite", short_ar: "منظومة أعمال سحابية", logo: "🟠", tech: ["ERP", "SaaS"], timeline: "Q1 2028" },

  // Accounting
  { id: "quickbooks", name: "QuickBooks Online", name_ar: "كويك بوكس", category: "accounting", status: "beta", short: "SMB Accounting Platform", short_ar: "محاسبة الشركات الصغيرة", logo: "🟢", tech: ["SaaS", "REST", "OAuth"], timeline: "Beta" },
  { id: "xero", name: "Xero", name_ar: "زيرو", category: "accounting", status: "beta", short: "Cloud Accounting Software", short_ar: "محاسبة سحابية", logo: "🔷", tech: ["SaaS", "REST", "OAuth"], timeline: "Beta" },
  { id: "zoho", name: "Zoho Books", name_ar: "زوهو بوكس", category: "accounting", status: "beta", short: "Online Accounting Suite", short_ar: "محاسبة إلكترونية", logo: "🟠", tech: ["SaaS", "REST"], timeline: "Beta" },

  // Banking
  { id: "sama", name: "SAMA Open Banking", name_ar: "ساما المفتوح", category: "banking", status: "development", short: "Saudi Open Banking Framework", short_ar: "المصرفية المفتوحة السعودية", logo: "🟢", tech: ["Banking", "REST", "OAuth"], timeline: "Q2 2027" },
  { id: "cbuae", name: "CBUAE Open Finance", name_ar: "المصرف المركزي الإماراتي", category: "banking", status: "development", short: "UAE Open Finance API", short_ar: "التمويل المفتوح الإماراتي", logo: "🟡", tech: ["Banking", "REST", "OAuth"], timeline: "Q3 2027" },
  { id: "bahrain-ob", name: "Bahrain Open Banking", name_ar: "المصرفية المفتوحة البحرينية", category: "banking", status: "planned", short: "CBB Open Banking Standard", short_ar: "معيار CBB المفتوح", logo: "🔴", tech: ["Banking", "REST"], timeline: "Q1 2028" },
  { id: "uk-ob", name: "Open Banking UK", name_ar: "المصرفية المفتوحة البريطانية", category: "banking", status: "planned", short: "UK OBIE Standard", short_ar: "معيار OBIE البريطاني", logo: "🇬🇧", tech: ["Banking", "REST", "OAuth"], timeline: "2028" },

  // Automation
  { id: "zapier", name: "Zapier", name_ar: "زابير", category: "automation", status: "available", short: "No-code Automation", short_ar: "أتمتة بدون كود", logo: "⚡", tech: ["iPaaS", "REST"], timeline: "Live" },
  { id: "make", name: "Make", name_ar: "ميك", category: "automation", status: "available", short: "Visual Workflow Builder", short_ar: "منشئ سير عمل بصري", logo: "🟣", tech: ["iPaaS", "REST"], timeline: "Live" },
  { id: "n8n", name: "n8n", name_ar: "n8n", category: "automation", status: "available", short: "Self-hosted Automation", short_ar: "أتمتة مستضافة ذاتياً", logo: "🟥", tech: ["iPaaS", "REST"], timeline: "Live" },
  { id: "webhooks", name: "Webhooks", name_ar: "ويب هوكس", category: "automation", status: "available", short: "Custom Event Triggers", short_ar: "محفزات أحداث مخصصة", logo: "🔗", tech: ["Webhook", "API"], timeline: "Live" },
];

// ────────────────────────────────────────────────────────────────
// UI Helpers
// ────────────────────────────────────────────────────────────────
const STATUS_META: Record<Status, { label: string; label_ar: string; dot: string; badge: string; icon: typeof CheckCircle2 }> = {
  available: {
    label: "Available",
    label_ar: "متاح",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    icon: CheckCircle2,
  },
  beta: {
    label: "Beta",
    label_ar: "تجريبي",
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
    icon: Sparkles,
  },
  development: {
    label: "In Development",
    label_ar: "قيد التطوير",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    icon: Clock,
  },
  planned: {
    label: "Planned",
    label_ar: "مخطط",
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
    icon: CircleDashed,
  },
};

const CATEGORY_META: Record<Category, { label: string; label_ar: string; icon: typeof Database; accent: string }> = {
  erp: { label: "ERP Systems", label_ar: "أنظمة ERP", icon: Server, accent: "text-[#0F766E]" },
  accounting: { label: "Accounting", label_ar: "المحاسبة", icon: Database, accent: "text-[#1E3A5F]" },
  banking: { label: "Banking", label_ar: "المصرفية", icon: Landmark, accent: "text-[#C8A951]" },
  automation: { label: "Automation", label_ar: "الأتمتة", icon: Workflow, accent: "text-[#0F766E]" },
};

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        m.badge,
      )}
    >
      <Icon className="h-3 w-3" />
      {m.label_ar}
    </span>
  );
}

function TechBadge({ label }: { label: Tech }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs backdrop-blur">
      {(Object.keys(STATUS_META) as Status[]).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
          <span className="text-muted-foreground">{STATUS_META[s].label_ar}</span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Cards
// ────────────────────────────────────────────────────────────────
function ConnectorCard({ c }: { c: Connector }) {
  const cat = CATEGORY_META[c.category];
  const CatIcon = cat.icon;
  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[20px] border-border/60 bg-card/80 backdrop-blur",
        "shadow-sm transition-all duration-[250ms] ease-out",
        "hover:-translate-y-1 hover:border-[#0F766E]/40 hover:shadow-xl hover:shadow-[#0F766E]/5",
      )}
    >
      {/* accent line */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0F766E] via-[#1E3A5F] to-[#C8A951] opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100" />
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        {/* top */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-br from-background to-muted/40 text-2xl shadow-sm"
            aria-hidden
          >
            {c.logo}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold leading-tight text-foreground">
                  {c.name}
                </h3>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.name_ar}</p>
              </div>
              <CatIcon className={cn("h-4 w-4 shrink-0 opacity-60", cat.accent)} />
            </div>
          </div>
        </div>

        <p className="line-clamp-2 min-h-[36px] text-[13px] leading-relaxed text-muted-foreground">
          {c.short_ar} · <span className="text-foreground/70">{c.short}</span>
        </p>

        {/* middle */}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={c.status} />
          {c.tech.map((t) => (
            <TechBadge key={t} label={t} />
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{c.timeline}</span>
        </div>

        {/* bottom */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 text-xs transition-colors hover:border-[#0F766E]/60 hover:text-[#0F766E]"
            asChild
          >
            <a href={`/developers#${c.id}`}>
              Learn More
              <ArrowUpRight className="ms-1 h-3 w-3" />
            </a>
          </Button>
          <Button
            size="sm"
            className="h-8 flex-1 bg-[#0F766E] text-xs text-white hover:bg-[#0d6560]"
            asChild
          >
            <a href={`mailto:enterprise@nisab.app?subject=Early%20Access%20-%20${encodeURIComponent(c.name)}`}>
              <Rocket className="me-1 h-3 w-3" />
              Early Access
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  value,
  label,
  label_ar,
  icon: Icon,
  accent,
}: {
  value: string;
  label: string;
  label_ar: string;
  icon: typeof Cloud;
  accent: string;
}) {
  return (
    <Card className="group rounded-[20px] border-border/60 bg-card/80 shadow-sm backdrop-blur transition-all duration-[250ms] hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-inner",
            accent,
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none tracking-tight text-foreground">{value}</div>
          <div className="mt-1 text-[11px] font-medium text-muted-foreground">{label_ar}</div>
          <div className="text-[10px] text-muted-foreground/70">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────
function EnterprisePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [availOnly, setAvailOnly] = useState(false);
  const [comingOnly, setComingOnly] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONNECTORS.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (availOnly && c.status !== "available") return false;
      if (comingOnly && c.status === "available") return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.name_ar.includes(q) ||
        c.short.toLowerCase().includes(q) ||
        c.short_ar.includes(q)
      );
    });
  }, [query, category, availOnly, comingOnly]);

  const grouped = useMemo(() => {
    const g: Record<Category, Connector[]> = { erp: [], accounting: [], banking: [], automation: [] };
    filtered.forEach((c) => g[c.category].push(c));
    return g;
  }, [filtered]);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-[#FAFAFA] to-white dark:from-background dark:to-background"
    >
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(600px 300px at 20% 0%, rgba(15,118,110,0.10), transparent 60%), radial-gradient(500px 260px at 90% 10%, rgba(30,58,95,0.10), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="container relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
                <Sparkles className="h-3 w-3 text-[#C8A951]" />
                Enterprise-grade platform · جاهز للبنوك والمؤسسات
              </div>
              <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#1E3A5F] shadow-lg shadow-[#0F766E]/20"
                  aria-hidden
                >
                  <Building2 className="h-6 w-6 text-white" />
                </span>
                <span>Enterprise Integrations</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-[#0F766E] dark:text-emerald-400">التكامل المؤسسي</span>
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                جاهزون للتكامل مع أشهر أنظمة ERP والمحاسبة والبنوك ومنصات الأعمال عبر REST API و
                Webhooks و Open Banking — مصمم للبنوك، الشركات، الجهات الحكومية، والمؤسسات المالية الإسلامية.
              </p>
            </div>
            <div className="shrink-0">
              <StatusLegend />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              value="12+"
              label="Enterprise Connectors"
              label_ar="موصّل مؤسسي"
              icon={Layers}
              accent="from-[#0F766E] to-[#0d6560]"
            />
            <StatCard
              value="100+"
              label="REST APIs"
              label_ar="واجهة برمجية"
              icon={FileCode2}
              accent="from-[#1E3A5F] to-[#152a45]"
            />
            <StatCard
              value="99.9%"
              label="Reliability SLA"
              label_ar="موثوقية الخدمة"
              icon={Zap}
              accent="from-[#C8A951] to-[#a88a3f]"
            />
            <StatCard
              value="ISO Ready"
              label="Enterprise Security"
              label_ar="أمان مؤسسي"
              icon={Shield}
              accent="from-[#0F766E] to-[#1E3A5F]"
            />
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-[20px] border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في الموصّلات… Search connectors"
                className="h-10 pe-9 text-sm"
                aria-label="Search connectors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "erp", "accounting", "banking", "automation"] as const).map((k) => {
                const active = category === k;
                const label =
                  k === "all"
                    ? "الكل"
                    : k === "erp"
                    ? "ERP"
                    : k === "accounting"
                    ? "محاسبة"
                    : k === "banking"
                    ? "بنوك"
                    : "أتمتة";
                return (
                  <button
                    key={k}
                    onClick={() => setCategory(k)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      active
                        ? "border-[#0F766E] bg-[#0F766E] text-white shadow-sm"
                        : "border-border/60 bg-background text-muted-foreground hover:border-[#0F766E]/40 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              <div className="mx-1 h-6 w-px bg-border" />
              <button
                onClick={() => {
                  setAvailOnly((v) => !v);
                  if (!availOnly) setComingOnly(false);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  availOnly
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/60 bg-background text-muted-foreground hover:border-emerald-500/40",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                المتاح فقط
              </button>
              <button
                onClick={() => {
                  setComingOnly((v) => !v);
                  if (!comingOnly) setAvailOnly(false);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  comingOnly
                    ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-border/60 bg-background text-muted-foreground hover:border-amber-500/40",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                قريباً
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Grouped Connectors */}
      <section className="container mx-auto max-w-7xl space-y-10 px-4 pb-12">
        {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
          const items = grouped[cat];
          if (items.length === 0) return null;
          const meta = CATEGORY_META[cat];
          const CatIcon = meta.icon;
          return (
            <div key={cat} className="space-y-4">
              <div className="flex items-end justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm",
                      cat === "erp" && "from-[#0F766E]/10 to-[#0F766E]/5",
                      cat === "accounting" && "from-[#1E3A5F]/10 to-[#1E3A5F]/5",
                      cat === "banking" && "from-[#C8A951]/10 to-[#C8A951]/5",
                      cat === "automation" && "from-[#0F766E]/10 to-[#1E3A5F]/5",
                    )}
                  >
                    <CatIcon className={cn("h-4 w-4", meta.accent)} />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{meta.label_ar}</h2>
                    <p className="text-[11px] text-muted-foreground">{meta.label}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {items.length} موصّل
                </Badge>
              </div>
              <div
                className={cn(
                  "grid grid-cols-1 gap-4 transition-opacity duration-500 md:grid-cols-2 lg:grid-cols-3",
                  mounted ? "opacity-100" : "opacity-0",
                )}
              >
                {items.map((c) => (
                  <ConnectorCard key={c.id} c={c} />
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-[20px] border border-dashed border-border/70 bg-card/40 p-12 text-center">
            <Globe2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">لا توجد نتائج مطابقة لبحثك.</p>
          </div>
        )}
      </section>

      {/* ERP Format Preview */}
      <section className="container mx-auto max-w-7xl px-4 pb-12">
        <ErpFormatPreview />
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border/60 bg-gradient-to-br from-[#1E3A5F] via-[#0F766E] to-[#1E3A5F] text-white">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
                <Shield className="h-3 w-3 text-[#C8A951]" />
                Enterprise Security · OAuth 2.0 · Open Banking
              </div>
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                جاهزون لتكاملك المؤسسي القادم
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80">
                All integrations are powered by secure REST APIs, Webhooks, OAuth 2.0, Open Banking standards,
                and Enterprise-grade security. Native ERP integrations are available through our Early Access Program.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
              <Button asChild size="lg" className="bg-white text-[#0F766E] hover:bg-white/90">
                <a href="/developers">
                  <FileCode2 className="me-2 h-4 w-4" />
                  View API Documentation
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href="mailto:partners@nisab.app?subject=Integration%20Partnership">
                  <Handshake className="me-2 h-4 w-4" />
                  Become Integration Partner
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-[#C8A951]/60 bg-[#C8A951]/10 text-white hover:bg-[#C8A951]/20 hover:text-white"
              >
                <a href="mailto:enterprise@nisab.app?subject=Enterprise%20Inquiry">
                  <Mail className="me-2 h-4 w-4" />
                  Contact Enterprise Team
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────
// ERP Format Preview (kept — refined shell)
// ────────────────────────────────────────────────────────────────
const SAMPLE_PAYLOAD = {
  entity_name: "Acme Halal Trading",
  reference: `ZKT-${new Date().getFullYear()}-DEMO`,
  currency: "SAR",
  zakat_due: 12500.75,
  base_amount: 500030,
  rate: 0.025,
  period_start: new Date(Date.now() - 354 * 86400_000).toISOString().slice(0, 10),
  period_end: new Date().toISOString().slice(0, 10),
  jurisdiction: "SA",
  fatwa_authority: "ZATCA",
};

function ErpFormatPreview() {
  const [format, setFormat] = useState<ErpFormat>("quickbooks");
  const [body, setBody] = useState<string>("جارٍ التحميل…");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/public/erp/journal?format=${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(SAMPLE_PAYLOAD),
    })
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setBody(t);
      })
      .catch((e) => {
        if (!cancelled) setBody(`// error: ${e.message}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [format]);

  return (
    <Card className="rounded-[20px] border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E]/10 to-[#1E3A5F]/10">
            <Download className="h-4 w-4 text-[#0F766E]" />
          </span>
          <div>
            <h3 className="text-base font-semibold">معاينة تصدير قيد الزكاة</h3>
            <p className="text-[11px] text-muted-foreground">
              Live preview from <span className="font-mono">/api/public/erp/journal</span> · AAOIFI FAS 9
            </p>
          </div>
        </div>

        <Tabs value={format} onValueChange={(v) => setFormat(v as ErpFormat)}>
          <TabsList className="flex h-auto flex-wrap">
            {SUPPORTED_ERP_FORMATS.map((f) => (
              <TabsTrigger key={f} value={f} className="text-xs">
                {f}
              </TabsTrigger>
            ))}
          </TabsList>
          {SUPPORTED_ERP_FORMATS.map((f) => (
            <TabsContent key={f} value={f}>
              <pre
                dir="ltr"
                className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed"
              >
                {loading ? "…" : body}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={`/api/public/erp/journal?format=${format}`} target="_blank" rel="noreferrer">
              <ExternalLink className="me-1 h-3.5 w-3.5" /> عيّنة GET
            </a>
          </Button>
          <Button asChild size="sm" className="bg-[#0F766E] hover:bg-[#0d6560]">
            <a href="/api/public/openapi" target="_blank" rel="noreferrer">
              OpenAPI 3.1
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
