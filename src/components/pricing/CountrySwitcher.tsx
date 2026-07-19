import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCountries } from "@/lib/geo/countries";
import { useGeoPricing } from "@/hooks/useGeoPricing";
import { Badge } from "@/components/ui/badge";

export function CountrySwitcher() {
  const { code, info, source, setCountry } = useGeoPricing();
  const countries = listCountries();

  const sourceLabel: Record<string, string> = {
    ip: "تم الكشف تلقائياً",
    profile: "من حسابك",
    manual: "اختيار يدوي",
    default: "افتراضي عالمي",
    loading: "جارٍ الكشف…",
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground">أسعار</span>
      <Select value={code ?? ""} onValueChange={setCountry}>
        <SelectTrigger className="w-[220px] h-9">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span className="text-lg leading-none">{info.flag}</span>
              <span>{info.nameAr}</span>
              <span className="text-xs text-muted-foreground">({info.currency})</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {countries.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span className="text-lg leading-none">{c.flag}</span>
                <span>{c.nameAr}</span>
                <span className="text-xs text-muted-foreground">({c.currency})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Badge variant="outline" className="text-xs">
        {sourceLabel[source] ?? source}
      </Badge>
    </div>
  );
}
