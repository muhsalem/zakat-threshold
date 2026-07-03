import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles, Users, LayoutGrid, UserPlus, ShieldCheck,
  HelpCircle, X, Menu, Info,
} from "lucide-react";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emphasis?: boolean;
};

const PORTALS: Item[] = [
  { to: "/advisor", label: "مستشار ذكي", icon: Sparkles, emphasis: true },
  { to: "/portal-signin", label: "بوابات الدخول", icon: Users, emphasis: true },
  { to: "/accountant", label: "لوحة المحاسب", icon: LayoutGrid },
  { to: "/client-intake", label: "نافذة الفرد/الشركة", icon: UserPlus },
];

const INFO: Item[] = [
  { to: "/verify", label: "التحقق من تقرير", icon: ShieldCheck },
  { to: "/organizations", label: "المؤسسات", icon: Building2 },
  { to: "/prices-history", label: "سجل الأسعار", icon: LineChart },
  { to: "/faq", label: "الأسئلة الشائعة", icon: HelpCircle },
];

function DockMenu({
  side, open, onClose, title, items, accent,
}: {
  side: "right" | "left";
  open: boolean;
  onClose: () => void;
  title: string;
  items: Item[];
  accent: "primary" | "emerald";
}) {
  if (!open) return null;
  return (
    <div
      className={`print:hidden fixed bottom-20 ${side === "right" ? "right-4" : "left-4"} z-40 w-56 rounded-xl border border-border bg-card/98 backdrop-blur shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2`}
      role="menu"
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        <button onClick={onClose} aria-label="إغلاق" className="rounded p-1 hover:bg-muted">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {items.map((it) => {
          const Icon = it.icon;
          const emph = it.emphasis;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onClose}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                emph
                  ? accent === "emerald"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function FloatingDock() {
  const [openRight, setOpenRight] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpenRight(false); setOpenLeft(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <DockMenu side="right" open={openRight} onClose={() => setOpenRight(false)}
        title="البوابات والأدوات" items={PORTALS} accent="emerald" />
      <DockMenu side="left" open={openLeft} onClose={() => setOpenLeft(false)}
        title="معلومات وتحقق" items={INFO} accent="primary" />

      <button
        type="button"
        onClick={() => { setOpenRight((v) => !v); setOpenLeft(false); }}
        aria-label="فتح قائمة البوابات والأدوات"
        aria-expanded={openRight}
        className="print:hidden hidden md:inline-flex fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity"
      >
        {openRight ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        البوابات والأدوات
      </button>

      <button
        type="button"
        onClick={() => { setOpenLeft((v) => !v); setOpenRight(false); }}
        aria-label="فتح قائمة المعلومات والتحقق"
        aria-expanded={openLeft}
        className="print:hidden hidden md:inline-flex fixed bottom-4 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 backdrop-blur px-4 py-2.5 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        {openLeft ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        معلومات وتحقق
      </button>
    </>
  );
}
