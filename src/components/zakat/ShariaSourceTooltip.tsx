import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen } from "lucide-react";

interface Props {
  title: string;
  source: string;
  detail?: string;
}

/** زر صغير يُعرض بجوار الحقول لإظهار المرجع الفقهي/المحاسبي */
export default function ShariaSourceTooltip({ title, source, detail }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`مرجع: ${title}`}
          className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs" side="top">
        <div className="space-y-1.5">
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-primary">{source}</div>
          {detail && <p className="text-muted-foreground leading-relaxed">{detail}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
