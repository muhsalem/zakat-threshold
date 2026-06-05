import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Type } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SCALES = [
  { id: "sm", label: "صغير", value: 0.9 },
  { id: "md", label: "افتراضي", value: 1 },
  { id: "lg", label: "كبير", value: 1.125 },
  { id: "xl", label: "أكبر", value: 1.25 },
] as const;

type ScaleId = (typeof SCALES)[number]["id"];

const KEY = "nesab:font-scale";

function apply(scale: number) {
  document.documentElement.style.setProperty("--font-scale", String(scale));
}

export function FontSizeToggle() {
  const [current, setCurrent] = useState<ScaleId>("md");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as ScaleId | null) ?? "md";
    const entry = SCALES.find((s) => s.id === saved) ?? SCALES[1];
    setCurrent(entry.id);
    apply(entry.value);
  }, []);

  const pick = (id: ScaleId) => {
    const entry = SCALES.find((s) => s.id === id) ?? SCALES[1];
    setCurrent(entry.id);
    apply(entry.value);
    localStorage.setItem(KEY, entry.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="حجم الخط" title="حجم الخط">
          <Type className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs">حجم خط المنصة</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SCALES.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onSelect={() => pick(s.id)}
            className={current === s.id ? "bg-primary/10 font-bold text-primary" : ""}
          >
            <span style={{ fontSize: `${s.value}rem` }}>{s.label}</span>
            {current === s.id && <span className="mr-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
