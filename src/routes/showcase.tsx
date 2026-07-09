import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Play,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  FileText,
  Award,
  ChevronDown,
} from "lucide-react";
import videoAsset from "@/assets/media/zakat-marketing.mp4.asset.json";
import videoAsset480p from "@/assets/media/zakat-marketing-480p.mp4.asset.json";
import pptxAsset from "@/assets/media/zakat-jury-presentation.pptx.asset.json";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "عرض المنصة للجنة التحكيم — منصة الزكاة الذكية" },
      {
        name: "description",
        content:
          "فيديو تسويقي وعرض تقديمي شامل لمنصة الزكاة الذكية مُقدَّم إلى لجنة تحكيم الجائزة.",
      },
      { property: "og:title", content: "منصة الزكاة الذكية — عرض الجائزة" },
      { property: "og:description", content: "اكتشف الفيديو التسويقي وحمّل العرض التقديمي." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/showcase" },
      { property: "og:image", content: "https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "/showcase" }],
  }),
  component: ShowcasePage,
});

function ShowcasePage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-[#0B2A4A] via-[#0F3A63] to-[#0B2A4A] text-white"
    >
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-20 bg-[#0B2A4A]/80">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[#C9A35A] font-bold text-lg">
            <Sparkles className="h-5 w-5" />
            منصة الزكاة الذكية
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2">
              العودة للحاسبة <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A35A]/15 text-[#C9A35A] text-sm font-semibold mb-6 border border-[#C9A35A]/30">
          <Award className="h-4 w-4" />
          مُقدَّم إلى لجنة تحكيم الجائزة
        </div>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-5">
          منصة الزكاة الذكية
          <span className="block text-[#C9A35A] mt-3 text-2xl md:text-3xl font-normal">
            نموذج موحّد لحساب الزكاة وفق المعايير الشرعية الدولية
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-white/75 text-lg leading-relaxed">
          شاهد الفيديو التسويقي للمنصة، ثم حمّل العرض التقديمي الكامل المُعَدّ خصيصًا للجنة التحكيم.
        </p>
      </section>

      {/* Video */}
      <section className="container mx-auto px-6 pb-16">
        <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-[0_20px_80px_-20px_rgba(201,163,90,0.35)] border border-[#C9A35A]/30 bg-black">
          <video
            src={videoAsset.url}
            controls
            playsInline
            poster=""
            className="w-full aspect-video bg-black"
          />
        </div>
        <div className="max-w-5xl mx-auto mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
          <span className="flex items-center gap-2">
            <Play className="h-4 w-4 text-[#C9A35A]" /> فيديو تسويقي تعريفي — جودة عالية
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-[#C9A35A]/40 text-[#C9A35A] hover:bg-[#C9A35A]/10 hover:text-[#C9A35A] gap-2"
              >
                <Download className="h-4 w-4" />
                تنزيل الفيديو
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="bg-[#0B2A4A] border-white/10 text-white min-w-[13rem]"
            >
              <DropdownMenuLabel className="text-white/90">اختر جودة التنزيل</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                asChild
                className="cursor-pointer focus:bg-[#C9A35A]/15 focus:text-white"
              >
                <a
                  href={videoAsset.url}
                  download="zakat-marketing-1080p.mp4"
                  className="flex items-center justify-between gap-3"
                >
                  <span className="font-semibold">1080p</span>
                  <span className="text-white/60 text-xs">
                    Full HD — {formatBytes(videoAsset.size)}
                  </span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="cursor-pointer focus:bg-[#C9A35A]/15 focus:text-white"
              >
                <a
                  href={videoAsset480p.url}
                  download="zakat-marketing-480p.mp4"
                  className="flex items-center justify-between gap-3"
                >
                  <span className="font-semibold">480p</span>
                  <span className="text-white/60 text-xs">
                    HD — {formatBytes(videoAsset480p.size)}
                  </span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {/* Downloads */}
      <section className="container mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="rounded-2xl p-8 bg-white/5 border border-white/10 hover:border-[#C9A35A]/40 transition">
            <div className="w-12 h-12 rounded-xl bg-[#C9A35A]/15 flex items-center justify-center mb-5">
              <FileText className="h-6 w-6 text-[#C9A35A]" />
            </div>
            <h3 className="text-2xl font-bold mb-2">العرض التقديمي للجنة</h3>
            <p className="text-white/70 mb-6 leading-relaxed">
              ١٢ شريحة بتصميم احترافي تعرض الحلّ، البنية، المرجعية الشرعية، الابتكار، والأثر
              المتوقّع.
            </p>
            <a href={pptxAsset.url} download="zakat-jury-presentation.pptx">
              <Button className="w-full bg-[#C9A35A] hover:bg-[#b8924b] text-[#0B2A4A] font-bold gap-2">
                <Download className="h-5 w-5" />
                تنزيل العرض (.pptx)
              </Button>
            </a>
          </div>

          <div className="rounded-2xl p-8 bg-white/5 border border-white/10 hover:border-[#C9A35A]/40 transition">
            <div className="w-12 h-12 rounded-xl bg-[#C9A35A]/15 flex items-center justify-center mb-5">
              <ShieldCheck className="h-6 w-6 text-[#C9A35A]" />
            </div>
            <h3 className="text-2xl font-bold mb-2">جرّب المنصة مباشرة</h3>
            <p className="text-white/70 mb-6 leading-relaxed">
              ادخل إلى الحاسبة الشاملة للأفراد والشركات والمجموعات وفق معيار AAOIFI 35 وتقويم أم
              القرى.
            </p>
            <Link to="/">
              <Button
                variant="outline"
                className="w-full border-[#C9A35A]/40 text-[#C9A35A] hover:bg-[#C9A35A]/10 font-bold gap-2"
              >
                فتح الحاسبة
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="container mx-auto px-6 pb-24">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { n: "7", d: "نماذج زكاة متكاملة" },
            { n: "+20", d: "بندًا شرعيًا للحوكمة" },
            { n: "2", d: "تقويم: هجري وميلادي" },
            { n: "100%", d: "مرجعية قابلة للتدقيق" },
          ].map((s) => (
            <div key={s.d} className="rounded-xl bg-white/5 border border-white/10 p-6">
              <div className="text-4xl font-bold text-[#C9A35A] mb-1">{s.n}</div>
              <div className="text-sm text-white/70">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-sm text-white/50">
        منصة الزكاة الذكية © 2026 — Smart Zakat Platform
      </footer>
    </div>
  );
}
