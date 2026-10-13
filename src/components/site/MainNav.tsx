import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Calculator,
  Scale,
  Globe,
  BookOpen,
  ChevronDown,
  Menu,
  X,
  History,
  HelpCircle,
  Code2,
  HeartHandshake,
  FileText,
  Activity,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface NavGroupItem {
  to: string;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  icon: typeof Calculator;
  badge?: string;
}

export function MainNav() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const location = useLocation();

  const [openDropdown, setOpenDropdown] = useState<"fiqh" | "system" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fiqhRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        fiqhRef.current &&
        !fiqhRef.current.contains(event.target as Node) &&
        systemRef.current &&
        !systemRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const fiqhItems: NavGroupItem[] = [
    {
      to: "/types",
      labelAr: "أنواع الزكاة وأحكامها",
      labelEn: "Types of Zakat",
      descAr: "عروض التجارة، النقود، الذهب، الحلي، الزروع، والأنعام",
      descEn: "Cash, gold, trade goods, livestock and crops",
      icon: Layers,
    },
    {
      to: "/history",
      labelAr: "الموسوعة والأدلة الشرعية",
      labelEn: "Jurisprudential Archive",
      descAr: "تأصيل الصاع والمثقال، قرارات المجامع الفقهية، ومصارف الزكاة",
      descEn: "Classical standards, fiqh councils and distribution",
      icon: BookOpen,
    },
    {
      to: "/chronology",
      labelAr: "التسلسل التاريخي للأنصبة",
      labelEn: "Historical Chronology",
      descAr: "سجل كافة سنوات الهجرة (من 2 هـ بدء فرض الزكاة إلى 1448 هـ)",
      descEn: "Tracking gold and silver thresholds from 2 AH (institution of Zakat) to 1448 AH",
      icon: History,
    },
    {
      to: "/faq",
      labelAr: "الأسئلة الشائعة والفتاوى",
      labelEn: "Frequently Asked Questions",
      descAr: "إجابات محررة على الديون، الأسهم، العقارات والمسائل المعاصرة",
      descEn: "Authoritative answers for modern zakat questions",
      icon: HelpCircle,
    },
  ];

  const systemItems: NavGroupItem[] = [
    {
      to: "/verify",
      labelAr: "توثيق الزوار ومصادقة الأسعار",
      labelEn: "Community Price Verification",
      descAr: "مشاركة ميدانية لتوثيق أسعار الذهب والفضة في أسواق الصاغة محلياً",
      descEn: "Crowdsourced local market bullion verification",
      icon: Users,
      badge: "تشاركي",
    },
    {
      to: "/ledger",
      labelAr: "سجل العمليات المباشر",
      labelEn: "Live Audit Ledger",
      descAr: "تدقيق لحظي لمصادر الأسعار ومعاملات التحويل بشفافية",
      descEn: "Real-time auditing of price feeds and calculations",
      icon: Activity,
      badge: "حي",
    },
    {
      to: "/developers",
      labelAr: "بوابة المطورين والـ API",
      labelEn: "Developers & API",
      descAr: "واجهات برمجية مفتوحة لربط أنظمة الرواتب ومتاجر التجارة",
      descEn: "Open REST API & SDKs for fintech and enterprise ERP",
      icon: Code2,
    },
    {
      to: "/waqf",
      labelAr: "الميثاق الوقفي والرؤية",
      labelEn: "The Waqf Charter",
      descAr: "منصة وقفية تقنية معرفية مستقلة غير ربحية لوجه الله تعالى",
      descEn: "Endowed non-profit Islamic fintech knowledge initiative",
      icon: HeartHandshake,
    },
  ];

  const isFiqhActive = fiqhItems.some((item) => location.pathname === item.to);
  const isSystemActive = systemItems.some((item) => location.pathname === item.to);

  return (
    <>
      {/* Desktop & Tablet Navigation */}
      <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
        {/* Direct Link: الرئيسية */}
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground text-muted-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
        >
          {isAr ? "الرئيسية" : "Home"}
        </Link>

        {/* Direct Link: حاسبة الزكاة */}
        <Link
          to="/calculator"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground text-muted-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
        >
          <Calculator className="size-4 text-primary" />
          <span>{isAr ? "حاسبة الزكاة" : "Calculator"}</span>
        </Link>

        {/* Direct Link: مقارنة الأنصبة */}
        <Link
          to="/compare"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground text-muted-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
        >
          <Scale className="size-4 text-amber-500" />
          <span>{isAr ? "مقارنة الأنصبة" : "Thresholds"}</span>
        </Link>

        {/* Direct Link: الدول والعملات */}
        <Link
          to="/countries"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground text-muted-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
        >
          <Globe className="size-4 text-emerald-600" />
          <span>{isAr ? "الدول والعملات" : "Currencies"}</span>
        </Link>

        {/* Direct Link: توثيق الزوار */}
        <Link
          to="/verify"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground text-muted-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
        >
          <Users className="size-4 text-emerald-600" />
          <span>{isAr ? "توثيق الزوار" : "Verify Prices"}</span>
          <span className="hidden xl:inline-block rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-bold">
            {isAr ? "تشاركي" : "Live"}
          </span>
        </Link>

        {/* Dropdown 1: الموسوعة والأحكام */}
        <div ref={fiqhRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "fiqh" ? null : "fiqh")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground ${
              isFiqhActive || openDropdown === "fiqh"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground"
            }`}
            aria-expanded={openDropdown === "fiqh"}
          >
            <BookOpen className="size-4 text-primary" />
            <span>{isAr ? "الموسوعة والأحكام" : "Encyclopedia"}</span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                openDropdown === "fiqh" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openDropdown === "fiqh" && (
            <div
              className={`absolute top-full z-50 mt-1.5 w-80 rounded-2xl border border-border bg-card p-2 shadow-xl animate-in fade-in-50 zoom-in-95 ${
                isAr ? "right-0" : "left-0"
              }`}
            >
              <div className="px-3 py-2 border-b border-border/60 mb-1">
                <p className="text-xs font-semibold text-foreground">
                  {isAr ? "الموسوعة الفقهية والتاريخية" : "Zakat Encyclopedia"}
                </p>
                <p className="text-[0.7rem] text-muted-foreground">
                  {isAr ? "أحكام الأنصبة والأدلة المعتمدة" : "Scholarly rulings and standards"}
                </p>
              </div>

              <div className="space-y-1">
                {fiqhItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpenDropdown(null)}
                      className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-secondary/80"
                    >
                      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-start">
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {isAr ? item.labelAr : item.labelEn}
                        </div>
                        <div className="text-[0.72rem] text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                          {isAr ? item.descAr : item.descEn}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown 2: المنظومة والتقنية */}
        <div ref={systemRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "system" ? null : "system")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground ${
              isSystemActive || openDropdown === "system"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground"
            }`}
            aria-expanded={openDropdown === "system"}
          >
            <Activity className="size-4 text-emerald-600" />
            <span>{isAr ? "المنظومة والتقنية" : "System & Tech"}</span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                openDropdown === "system" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openDropdown === "system" && (
            <div
              className={`absolute top-full z-50 mt-1.5 w-80 rounded-2xl border border-border bg-card p-2 shadow-xl animate-in fade-in-50 zoom-in-95 ${
                isAr ? "right-0" : "left-0"
              }`}
            >
              <div className="px-3 py-2 border-b border-border/60 mb-1">
                <p className="text-xs font-semibold text-foreground">
                  {isAr ? "المنظومة والتوثيق الرقمي" : "Platform & Infrastructure"}
                </p>
                <p className="text-[0.7rem] text-muted-foreground">
                  {isAr ? "سجلات التدقيق، الـ API، والوقف" : "Live feeds, API & Waqf charter"}
                </p>
              </div>

              <div className="space-y-1">
                {systemItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpenDropdown(null)}
                      className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-secondary/80"
                    >
                      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-start">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {isAr ? item.labelAr : item.labelEn}
                          </span>
                          {item.badge && (
                            <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 text-[0.62rem] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[0.72rem] text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                          {isAr ? item.descAr : item.descEn}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Trigger Button */}
      <div className="lg:hidden flex items-center">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-xl border border-border bg-card p-2 text-foreground transition-colors hover:bg-secondary focus:outline-none"
          aria-label={mobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Drawer / Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[65px] z-50 max-h-[calc(100vh-65px)] overflow-y-auto border-b border-border bg-background/98 p-4 shadow-2xl backdrop-blur-lg lg:hidden">
          <div className="space-y-4">
            {/* Direct Quick Links */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground hover:border-primary"
              >
                <Sparkles className="size-4 text-primary" />
                <span>{isAr ? "الرئيسية" : "Home"}</span>
              </Link>

              <Link
                to="/calculator"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm font-semibold text-primary hover:bg-primary/10"
              >
                <Calculator className="size-4 text-primary" />
                <span>{isAr ? "حاسبة الزكاة" : "Calculator"}</span>
              </Link>

              <Link
                to="/compare"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground hover:border-primary"
              >
                <Scale className="size-4 text-amber-500" />
                <span>{isAr ? "مقارنة الأنصبة" : "Thresholds"}</span>
              </Link>

              <Link
                to="/countries"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground hover:border-primary"
              >
                <Globe className="size-4 text-emerald-600" />
                <span>{isAr ? "الدول والعملات" : "Currencies"}</span>
              </Link>

              {/* Direct Link: توثيق ومشاركة الزائرين */}
              <Link
                to="/verify"
                onClick={() => setMobileMenuOpen(false)}
                className="col-span-2 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
              >
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {isAr ? "توثيق ومصادقة الزائرين للأسعار" : "Community Price Verification"}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold">
                  {isAr ? "مشاركة حية" : "Join"}
                </span>
              </Link>
            </div>

            {/* Fiqh Section */}
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="px-2 pb-2 mb-2 border-b border-border/60">
                <span className="text-xs font-bold text-foreground">
                  {isAr ? "📖 الموسوعة والأحكام الفقهية" : "📖 Encyclopedia & Fiqh"}
                </span>
              </div>
              <div className="space-y-1">
                {fiqhItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-2 text-sm text-foreground hover:bg-secondary"
                    >
                      <Icon className="size-4 text-primary shrink-0" />
                      <div className="flex-1 text-start min-w-0">
                        <div className="font-semibold text-xs">
                          {isAr ? item.labelAr : item.labelEn}
                        </div>
                        <div className="text-[0.68rem] text-muted-foreground truncate">
                          {isAr ? item.descAr : item.descEn}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* System Section */}
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="px-2 pb-2 mb-2 border-b border-border/60">
                <span className="text-xs font-bold text-foreground">
                  {isAr ? "⚙️ المنظومة والتقنية والوقف" : "⚙️ Platform & Waqf"}
                </span>
              </div>
              <div className="space-y-1">
                {systemItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-2 text-sm text-foreground hover:bg-secondary"
                    >
                      <Icon className="size-4 text-primary shrink-0" />
                      <div className="flex-1 text-start min-w-0">
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          <span>{isAr ? item.labelAr : item.labelEn}</span>
                          {item.badge && (
                            <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-1 py-0.2 text-[0.6rem] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[0.68rem] text-muted-foreground truncate">
                          {isAr ? item.descAr : item.descEn}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
