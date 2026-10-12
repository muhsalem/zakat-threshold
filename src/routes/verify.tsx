import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Users,
  ShieldCheck,
  Check,
  Plus,
  Scale,
  Sparkles,
  MapPin,
  Clock,
  Search,
  Filter,
  ThumbsUp,
  Share2,
  ExternalLink,
  BookOpen,
  Info,
  BadgeCheck,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { COUNTRIES, Country, countryName, flagOf } from "@/lib/countries";
import {
  PriceVerification,
  SOURCE_TYPE_LABELS,
  SourceType,
  getCommunityVerifications,
  getOverallCommunityStats,
  submitCommunityVerification,
  toggleConfirmVerification,
} from "@/lib/community-nisab";
import { formatMoney, formatNumber } from "@/lib/nisab";
import { usePrices } from "@/lib/use-prices";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      {
        title: "منظومة توثيق ومشاركة الزائرين لنصاب الزكاة · نِصاب",
      },
      {
        name: "description",
        content:
          "منصة تشاركية ميدانية لتوثيق وتأكيد أسعار الذهب والفضة ونصاب الزكاة في أسواق الصاغة المحلية لكافة الدول الإسلامية بمشاركة الزوار والخبراء.",
      },
      {
        property: "og:title",
        content: "منظومة توثيق ومشاركة الزائرين لنصاب الزكاة · نِصاب",
      },
      {
        property: "og:description",
        content:
          "شارك في تأكيد وتوثيق سعر الذهب والفضة في بلدك اليوم لضبط حساب نصاب الزكاة بدقة شرعية يقينية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyCommunityPage,
});

function VerifyCommunityPage() {
  const { lang, t } = useI18n();
  const isAr = lang === "ar";
  const { data: base } = usePrices();

  const [verifications, setVerifications] = useState<PriceVerification[]>([]);
  const [stats, setStats] = useState(() => getOverallCommunityStats());
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"confirmations" | "recent">("confirmations");

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New form state
  const [fCountry, setFCountry] = useState("SA");
  const [fGold24k, setFGold24k] = useState("");
  const [fSilverPure, setFSilverPure] = useState("");
  const [fCity, setFCity] = useState("");
  const [fSourceType, setFSourceType] = useState<SourceType>("gold_souq");
  const [fSourceLabel, setFSourceLabel] = useState("");
  const [fName, setFName] = useState("");
  const [fRole, setFRole] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fSuccess, setFSuccess] = useState(false);

  const refresh = () => {
    setVerifications(getCommunityVerifications());
    setStats(getOverallCommunityStats());
  };

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    window.addEventListener("nisab-community-updated", handleUpdate);
    return () => window.removeEventListener("nisab-community-updated", handleUpdate);
  }, []);

  // Update country defaults in form
  const handleCountryChangeInForm = (code: string) => {
    setFCountry(code);
    const country = COUNTRIES.find((c) => c.code === code);
    if (!country || !base) return;
    const rate = base.rates[country.currency] ?? 1;
    const goldG = (base.goldUsdOz / 31.1034768) * rate;
    const silverG = (base.silverUsdOz / 31.1034768) * rate;
    setFGold24k(goldG.toFixed(2));
    setFSilverPure(silverG.toFixed(2));
  };

  const handleEndorse = (item: PriceVerification) => {
    toggleConfirmVerification(item.id);
    refresh();
  };

  const handleShare = (item: PriceVerification) => {
    const text = isAr
      ? `📢 توثيق نصاب الزكاة الميداني في ${item.countryName} (${item.date}):\n` +
        `• الذهب عيار 24: ${formatMoney(item.goldGram24k, item.currency, lang)} / غ\n` +
        `• نصاب الذهب (85غ): ${formatMoney(item.goldNisab, item.currency, lang)}\n` +
        `• الفضة النقية: ${formatMoney(item.silverGramPure, item.currency, lang)} / غ\n` +
        `• نصاب الفضة (595غ): ${formatMoney(item.silverNisab, item.currency, lang)}\n` +
        `المصدر: ${item.sourceLabel} (${item.confirmations} تأكيد من الزوار)\n` +
        `🔗 منصة نِصاب: ${typeof window !== "undefined" ? window.location.href : ""}`
      : `📢 Verified Zakat Nisab in ${item.countryName} (${item.date}):\n` +
        `• 24K Gold: ${formatMoney(item.goldGram24k, item.currency, lang)}/g (Nisab: ${formatMoney(item.goldNisab, item.currency, lang)})\n` +
        `• Pure Silver: ${formatMoney(item.silverGramPure, item.currency, lang)}/g (Nisab: ${formatMoney(item.silverNisab, item.currency, lang)})\n` +
        `Source: ${item.sourceLabel} (${item.confirmations} endorsements)\n` +
        `🔗 Details: ${typeof window !== "undefined" ? window.location.href : ""}`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const g = parseFloat(fGold24k);
    const s = parseFloat(fSilverPure);
    if (!g || g <= 0 || !s || s <= 0) return;

    submitCommunityVerification({
      countryCode: fCountry,
      city: fCity.trim() || undefined,
      goldGram24k: g,
      silverGramPure: s,
      sourceType: fSourceType,
      sourceLabel: fSourceLabel.trim() || SOURCE_TYPE_LABELS[fSourceType]?.ar || "سوق محلي",
      contributorName: fName.trim() || (isAr ? "زائر موثوق" : "Verified Contributor"),
      contributorRole: fRole.trim() || undefined,
      notes: fNotes.trim() || undefined,
    });

    setFSuccess(true);
    setTimeout(() => {
      setFSuccess(false);
      setShowSubmitModal(false);
      refresh();
    }, 1800);
  };

  // Filtered & sorted records
  const filtered = useMemo(() => {
    return verifications
      .filter((item) => {
        if (selectedCountry !== "ALL" && item.countryCode !== selectedCountry) return false;
        if (sourceFilter !== "ALL" && item.sourceType !== sourceFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCountry = item.countryName.toLowerCase().includes(q);
          const matchCity = item.city?.toLowerCase().includes(q) ?? false;
          const matchSource = item.sourceLabel.toLowerCase().includes(q);
          const matchAuthor = item.contributorName.toLowerCase().includes(q);
          if (!matchCountry && !matchCity && !matchSource && !matchAuthor) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "confirmations") return b.confirmations - a.confirmations;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [verifications, selectedCountry, sourceFilter, searchQuery, sortBy]);

  // Countries that have contributions
  const activeCountryCodes = Array.from(new Set(verifications.map((v) => v.countryCode)));

  return (
    <Page
      eyebrow={isAr ? "المشاركة المجتمعية الحية" : "Crowdsourced Field Verifications"}
      title={
        isAr
          ? "توثيق وتأكيد نصاب الزكاة بمشاركة الزائرين"
          : "Community Zakat Nisab & Market Price Verification"
      }
      sub={
        isAr
          ? "مبادرة تشاركية لتوثيق أسعار الذهب والفضة الحقيقية في أسواق الصاغة المحلية لكل دولة، وتأكيد النصاب الشرعي بإجماع المزكّين والخبراء."
          : "A collaborative initiative allowing visitors and gold merchants to verify real-time local bullion prices and confirm the Nisab threshold across all countries."
      }
    >
      {/* KPI Stats Header Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface p-5 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{isAr ? "إجمالي عمليات التوثيق والمصادقة" : "Total Confirmations"}</span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="num mt-2 text-3xl font-bold font-mono text-primary">
            {formatNumber(stats.totalConfirmations, lang)}+
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAr ? "مصادقة ميدانية مؤكدة من الزوار" : "verified community endorsements"}
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{isAr ? "الدول الموثقة ميدانياً" : "Active Countries"}</span>
            <MapPin className="size-4 text-emerald-500" />
          </div>
          <p className="num mt-2 text-3xl font-bold font-mono text-foreground">
            {stats.countriesCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAr ? "دولة وعاصمة إسلامية مشاركة" : "countries with active price feeds"}
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{isAr ? "مؤشر التوافق والإجماع" : "Consensus Confidence"}</span>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
          <p className="num mt-2 text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats.overallConsensus}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAr ? "مطابقة مع أسواق الصاغة والنشرات" : "consensus between souqs & fatwas"}
          </p>
        </div>

        <div className="card-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{isAr ? "شارك في توثيق بلدك" : "Participate Now"}</span>
            <Sparkles className="size-4 text-primary" />
          </div>
          <Button
            onClick={() => {
              handleCountryChangeInForm("SA");
              setShowSubmitModal(true);
            }}
            className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="size-4 mr-1.5" />
            {isAr ? "وثّق سعر دولتك اليوم" : "Add Your Country's Price"}
          </Button>
        </div>
      </div>

      {/* Main Interactive Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isAr
                ? "ابحث بالدولة، المدينة، سوق الصاغة، أو اسم الموثق..."
                : "Search country, city, souq, or contributor..."
            }
            className="w-full rounded-lg border border-input bg-background pr-9 pl-4 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary outline-none rtl:pr-9 rtl:pl-3"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="ALL">{isAr ? "كل المصادر" : "All Sources"}</option>
            {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {isAr ? v.ar : v.en}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/50 text-xs">
            <button
              onClick={() => setSortBy("confirmations")}
              className={`rounded-md px-3 py-1 font-medium transition-all ${
                sortBy === "confirmations"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {isAr ? "الأعلى تأكيداً" : "Most Confirmed"}
            </button>
            <button
              onClick={() => setSortBy("recent")}
              className={`rounded-md px-3 py-1 font-medium transition-all ${
                sortBy === "recent" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {isAr ? "الأحدث توثيقاً" : "Most Recent"}
            </button>
          </div>
        </div>
      </div>

      {/* Country Pills Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setSelectedCountry("ALL")}
          className={`rounded-full px-3 py-1 font-medium transition-all ${
            selectedCountry === "ALL"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          {isAr ? "جميع الدول الموثقة" : "All Countries"} ({verifications.length})
        </button>

        {activeCountryCodes.map((code) => {
          const c = COUNTRIES.find((item) => item.code === code);
          const count = verifications.filter((v) => v.countryCode === code).length;
          return (
            <button
              key={code}
              onClick={() => setSelectedCountry(code)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all ${
                selectedCountry === code
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span>{flagOf(code)}</span>
              <span>{c ? (isAr ? c.ar : c.en) : code}</span>
              <span className="rounded-full bg-black/15 px-1.5 text-[10px] font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Modal / Dialog for New Submission */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Plus className="size-5 text-primary" />
                  {isAr
                    ? "توثيق وتأكيد سعر الذهب والفضة في بلدك"
                    : "Verify & Confirm Nisab In Your Country"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr
                    ? "مشاركتك تعين آلاف المسلمين على معرفة النصاب الدقيق وإخراج فريضتهم بيقين"
                    : "Your contribution helps thousands accurately calculate their Zakat"}
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {fSuccess ? (
              <div className="my-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <Check className="mx-auto size-10 text-emerald-500" />
                <h4 className="mt-3 text-base font-bold text-emerald-800 dark:text-emerald-200">
                  {isAr ? "تم تسجيل وتوثيق مشاركتك بنجاح!" : "Verification Successfully Recorded!"}
                </h4>
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  {isAr
                    ? "جزاك الله خيراً، تم إدراج التسعيرة في سجل التوثيق الميداني المعتمد للدولة."
                    : "May Allah reward you! The prices have been added to the field log."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Country Selection */}
                  <div>
                    <label className="block text-xs font-medium text-foreground">
                      {isAr ? "الدولة *" : "Country *"}
                    </label>
                    <select
                      value={fCountry}
                      onChange={(e) => handleCountryChangeInForm(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {flagOf(c.code)} {isAr ? c.ar : c.en} ({c.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City or Souq */}
                  <div>
                    <label className="block text-xs font-medium text-foreground">
                      {isAr ? "المدينة أو سوق الصاغة" : "City / Souq"}
                    </label>
                    <input
                      type="text"
                      value={fCity}
                      onChange={(e) => setFCity(e.target.value)}
                      placeholder={
                        isAr ? "مثال: الرياض (البطحاء)، القاهرة (الحسين)" : "e.g. Riyadh, Cairo"
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  {/* Gold 24k Price */}
                  <div>
                    <label className="block text-xs font-medium text-foreground">
                      {isAr ? "سعر جرام الذهب عيار 24 الصافي *" : "24K Pure Gold / Gram *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={fGold24k}
                      onChange={(e) => setFGold24k(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary outline-none"
                    />
                    {parseFloat(fGold24k) > 0 && (
                      <span className="mt-1 block text-[11px] text-muted-foreground font-mono">
                        {isAr ? "نصاب الذهب (85غ): " : "Gold Nisab (85g): "}
                        <strong className="text-foreground">
                          {(parseFloat(fGold24k) * 85).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Silver Pure Price */}
                  <div>
                    <label className="block text-xs font-medium text-foreground">
                      {isAr ? "سعر جرام الفضة النقية 999 *" : "Pure Silver / Gram *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={fSilverPure}
                      onChange={(e) => setFSilverPure(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary outline-none"
                    />
                    {parseFloat(fSilverPure) > 0 && (
                      <span className="mt-1 block text-[11px] text-muted-foreground font-mono">
                        {isAr ? "نصاب الفضة (595غ): " : "Silver Nisab (595g): "}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {(parseFloat(fSilverPure) * 595).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Source Type */}
                  <div>
                    <label className="block text-xs font-medium text-foreground">
                      {isAr ? "نوع المصدر الميداني *" : "Source Type *"}
                    </label>
                    <select
                      value={fSourceType}
                      onChange={(e) => setFSourceType(e.target.value as SourceType)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                    >
                      {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {isAr ? v.ar : v.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Source Details / Store Name */}
                  <div>
                    <label className="block text-xs font-medium text-foreground">
                      {isAr ? "تفاصيل المصدر (اسم المحل أو الجهة)" : "Source Name / Store"}
                    </label>
                    <input
                      type="text"
                      value={fSourceLabel}
                      onChange={(e) => setFSourceLabel(e.target.value)}
                      placeholder={
                        isAr
                          ? "مثال: مجمع الذهب، الغرفة التجارية"
                          : "e.g. Gold Market, Chamber of Commerce"
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  {/* Contributor Name */}
                  <div>
                    <label className="block text-xs font-medium text-foreground">
                      {isAr ? "اسمك أو صفتك (اختياري)" : "Your Name / Title"}
                    </label>
                    <input
                      type="text"
                      value={fName}
                      onChange={(e) => setFName(e.target.value)}
                      placeholder={isAr ? "مثال: عبد الله بن فهد" : "e.g. Abdullah"}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  {/* Contributor Role */}
                  <div>
                    <label className="block text-xs font-medium text-foreground">
                      {isAr ? "صفتك (صائغ، باحث، زائر)" : "Role (Jeweler, Scholar, Visitor)"}
                    </label>
                    <input
                      type="text"
                      value={fRole}
                      onChange={(e) => setFRole(e.target.value)}
                      placeholder={
                        isAr ? "مثال: تاجر مجوهرات، باحث شرعي" : "e.g. Jeweler, Researcher"
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-foreground">
                    {isAr ? "ملاحظات إضافية أو تنبيهات للمزكّين" : "Additional Notes"}
                  </label>
                  <textarea
                    rows={2}
                    value={fNotes}
                    onChange={(e) => setFNotes(e.target.value)}
                    placeholder={
                      isAr
                        ? "أية تفاصيل تخص خلو السعر من المصنعية، أسعار العيارات الأخرى..."
                        : "Details on taxes, workmanship deductions..."
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSubmitModal(false)}
                    className="text-xs"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6"
                  >
                    {isAr ? "نشر وتوثيق في السجل الميداني ✓" : "Publish & Confirm ✓"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Verification Cards Feed */}
      <div className="mt-8 space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`card-surface p-6 transition-all hover:border-primary/40 ${
              item.userConfirmed ? "border-emerald-500/40 bg-emerald-500/5 shadow-sm" : ""
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Country & Contributor Info */}
              <div className="flex items-start gap-3">
                <div className="text-3xl leading-none pt-0.5">{flagOf(item.countryCode)}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/country/$code"
                      params={{ code: item.countryCode }}
                      className="text-base font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      {item.countryName}
                      <ArrowRight className="size-3.5 rtl:rotate-180 text-muted-foreground" />
                    </Link>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                      {item.currency}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck className="size-3" />
                      {item.status === "verified"
                        ? isAr
                          ? "موثق بإجماع الزوار"
                          : "Consensus Verified"
                        : isAr
                          ? "قيد المراجعة الميدانية"
                          : "Trending"}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{item.contributorName}</span>
                    {item.contributorRole && (
                      <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[11px]">
                        {item.contributorRole}
                      </span>
                    )}
                    {item.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {item.city}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Clock className="size-3" />
                      {item.date}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-foreground/80 flex items-center gap-1">
                    <span className="text-muted-foreground">{isAr ? "المصدر:" : "Source:"}</span>
                    <strong className="font-medium">{item.sourceLabel}</strong>
                  </p>
                </div>
              </div>

              {/* Endorse & Share Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEndorse(item)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-xs ${
                    item.userConfirmed
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md scale-[1.02]"
                      : "border border-border bg-card text-foreground hover:bg-secondary hover:border-primary/40"
                  }`}
                  title={
                    isAr
                      ? "انقر لتأكيد صحة السعر والمصادقة عليه في دولتك"
                      : "Click to endorse this price in your country"
                  }
                >
                  <ThumbsUp className={`size-3.5 ${item.userConfirmed ? "fill-white" : ""}`} />
                  <span>
                    {item.userConfirmed
                      ? isAr
                        ? "أنت وثّقت هذا السعر ✓"
                        : "Verified by you ✓"
                      : isAr
                        ? "أؤكد هذا السعر في دولتي"
                        : "Endorse price"}
                  </span>
                  <span className="rounded-full bg-black/20 px-2 py-0.5 font-mono text-[11px]">
                    {item.confirmations}
                  </span>
                </button>

                <button
                  onClick={() => handleShare(item)}
                  className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title={isAr ? "مشاركة بطاقة التوثيق" : "Share verification card"}
                >
                  {copiedId === item.id ? (
                    <Check className="size-4 text-emerald-500" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Price & Nisab Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-border/80 bg-secondary/30 p-3.5 text-xs">
              <div>
                <span className="block text-[11px] text-muted-foreground">
                  {isAr ? "جرام الذهب 24 (محلياً):" : "24K Gold / g:"}
                </span>
                <span className="num mt-0.5 block font-mono text-base font-bold text-foreground">
                  {formatMoney(item.goldGram24k, item.currency, lang)}
                </span>
                {item.goldGram21k && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {isAr ? "عيار 21: " : "21k: "}
                    {formatMoney(item.goldGram21k, item.currency, lang)}
                  </span>
                )}
              </div>

              <div>
                <span className="block text-[11px] text-muted-foreground">
                  {isAr ? "نصاب الذهب الشرعي (85غ):" : "Gold Nisab (85g):"}
                </span>
                <span className="num mt-0.5 block font-mono text-base font-bold text-foreground">
                  {formatMoney(item.goldNisab, item.currency, lang)}
                </span>
              </div>

              <div>
                <span className="block text-[11px] text-muted-foreground">
                  {isAr ? "جرام الفضة النقية 999:" : "Pure Silver / g:"}
                </span>
                <span className="num mt-0.5 block font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(item.silverGramPure, item.currency, lang)}
                </span>
              </div>

              <div>
                <span className="block text-[11px] text-muted-foreground">
                  {isAr ? "نصاب الفضة الشرعي (595غ):" : "Silver Nisab (595g):"}
                </span>
                <span className="num mt-0.5 block font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(item.silverNisab, item.currency, lang)}
                </span>
              </div>
            </div>

            {item.notes && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground italic border-t border-border/60 pt-2.5">
                💬 {item.notes}
              </p>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card-surface p-12 text-center">
            <Users className="mx-auto size-12 text-muted-foreground/40" />
            <h4 className="mt-3 text-sm font-bold text-foreground">
              {isAr ? "لم نجد توثيقات مطابقة لخيارات البحث" : "No verifications match your search"}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr
                ? "يمكنك البدء وتوثيق أول سعر لسوق بلدك الآن!"
                : "Be the first to record verified prices for this country!"}
            </p>
            <Button
              onClick={() => {
                handleCountryChangeInForm(selectedCountry !== "ALL" ? selectedCountry : "SA");
                setShowSubmitModal(true);
              }}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
            >
              <Plus className="size-4 mr-1.5" />
              {isAr ? "وثّق سعر دولتك الآن" : "Add Price Verification"}
            </Button>
          </div>
        )}
      </div>

      {/* Sharia & Methodological Guidance Accordion */}
      <section className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border pb-4">
          <BookOpen className="size-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">
            {isAr
              ? "الضوابط الفقهية والميدانية لتوثيق أسعار نصاب الزكاة"
              : "Sharia & Practical Guidelines for Zakat Nisab Verification"}
          </h3>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3 text-xs leading-relaxed">
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <Scale className="size-4 text-primary" />
              {isAr
                ? "لماذا يختلف سعر الصاغة عن السعر العالمي؟"
                : "Why do local souq prices differ from spot?"}
            </h4>
            <p className="mt-2 text-muted-foreground">
              {isAr
                ? "السعر العالمي الفوري (Spot XAU/XAG) يمثل عقود أونصات البورصات الدولية الكبرى بالدولار، بينما أسواق الصاغة المحلية في الدول تخضع لتكاليف الشحن والاستيراد، ورسوم الدمغة الحكومية، وضريبة القيمة المضافة، وفروقات صرف العملة المحلية. لذلك يعتبر توثيق سعر الصاغة الفعلي أقرب للواقع المالي للمزكّي."
                : "International spot prices reflect wholesale paper contracts. Local physical gold shops incorporate import fees, local mint stamps, sales taxes, and currency premiums. Local souq documentation gives an exact real-world threshold."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-500" />
              {isAr ? "ما هو العيار المعتبر شرعاً في الذهب؟" : "Which karat is standard in Sharia?"}
            </h4>
            <p className="mt-2 text-muted-foreground">
              {isAr
                ? "النصاب الشرعي المقرر بالسنة المطهرة هو عشرون ديناراً، وتزن ٨٥ جراماً من الذهب الخالص النقي (عيار 24 قيراط نقاوة 999.9). وإذا سُعِّر بالعيار 21 وجب احتساب النقاء بما يعادل 97.14 جراماً، أو ضرب سعر جرام 24 الصافي في 85 لتحديد النصاب النقدي."
                : "The Sharia nisab is 20 dinars = 85 grams of pure 24K gold (999.9 purity). If priced in 21k, the weight equivalent is 97.14g, or 85g multiplied by pure 24K price."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <Users className="size-4 text-primary" />
              {isAr ? "أثر التوثيق المجتمعي في تبرئة الذمة" : "The Value of Visitor Crowdsourcing"}
            </h4>
            <p className="mt-2 text-muted-foreground">
              {isAr
                ? "التعاون بين المسلمين وأهل الخبرة في الصاغة في ضبط أسعار النصاب يحقق مبدأ التعاون على البر والتقوى، ويزيل اللبس عن أصحاب الأموال، خاصة في الدول التي تشهد تقلبات في سعر الصرف أو تبايناً في نشرات الصاغة اليومية."
                : "Crowdsourced cross-verification between community members and trusted jewelers ensures transparency and helps Muslims discharge their religious duty with certainty."}
            </p>
          </div>
        </div>
      </section>
    </Page>
  );
}
