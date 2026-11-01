import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { organizeAssets } from "@/lib/asset-organizer.functions";
import {
  aggregateReviewedAssets,
  assetCategories,
  assetInputSchema,
  type AssetItem,
  type AssetValues,
} from "@/lib/asset-organizer";

const categoryLabels = {
  cash: ["نقد وحسابات بنكية", "Cash & bank balances"],
  business: ["عروض التجارة", "Trade inventory"],
  investments: ["استثمارات للتداول", "Trading investments"],
  longTerm: ["استثمارات طويلة الأجل", "Long-term holdings"],
  receivables: ["مستحقات لك", "Receivables"],
  debts: ["التزامات عليك", "Liabilities"],
  goldG: ["ذهب (جرام)", "Gold (grams)"],
  jewelryG: ["حلي ذهب (جرام)", "Gold jewelry (grams)"],
  silverG: ["فضة (جرام)", "Silver (grams)"],
  unmapped: ["خارج البنود / غير واضح", "Unmapped / uncertain"],
};

export function AssetOrganizer({ onApply }: { onApply: (values: AssetValues) => void }) {
  const { lang, currency } = useI18n();
  const ar = lang === "ar";
  const organize = useServerFn(organizeAssets);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<AssetItem[]>([]);
  const [approved, setApproved] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contextCurrency, setContextCurrency] = useState(currency);
  const edit = (index: number, patch: Partial<AssetItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    setApproved((prev) => prev.map((value, i) => (i === index ? false : value)));
    setNotice("");
  };
  const submit = async () => {
    setError("");
    setNotice("");
    const input = assetInputSchema.safeParse({ description, currency, lang });
    if (!input.success) {
      setError(ar ? "اكتب وصفًا بين 10 و5000 حرف." : "Enter a description of 10–5000 characters.");
      return;
    }
    setBusy(true);
    setItems([]);
    setApproved([]);
    try {
      const result = await organize({ data: input.data });
      if (!result.ok) {
        setError(
          result.error === "CREDITS"
            ? ar
              ? "رصيد الذكاء الاصطناعي غير كافٍ."
              : "AI credits are unavailable."
            : result.error === "RATE_LIMIT"
              ? ar
                ? "وصلت إلى حد الطلبات. حاول لاحقًا."
                : "Request limit reached. Try later."
              : ar
                ? "تعذّر تنظيم الوصف. احتفظنا بالنص؛ حاول مرة أخرى."
                : "Could not organize your description. Your text is preserved; retry.",
        );
        return;
      }
      setContextCurrency(currency);
      setItems(result.items);
      setApproved(result.items.map(() => false));
      if (!result.items.length)
        setNotice(
          ar
            ? "لم نجد أصولًا أو التزامات قابلة للتنظيم في الوصف."
            : "No assets or liabilities found in the description.",
        );
    } catch {
      setError(ar ? "تعذّر الاتصال. حاول مرة أخرى." : "Connection failed. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  const apply = () => {
    setError("");
    try {
      if (contextCurrency !== currency) throw new Error("currency changed");
      onApply(aggregateReviewedAssets(items, approved, currency));
      setNotice(
        ar
          ? "نُقلت البنود المؤكدة. راجع العيار ونسبة الاستثمارات وحكم الحلي والحَوْل في الحاسبة."
          : "Confirmed items applied. Review purity, investment percentage, jewelry treatment and hawl in the calculator.",
      );
    } catch {
      setError(
        ar
          ? "راجع المبالغ والجرامات والعملة قبل النقل؛ لا نحول العملات تلقائيًا."
          : "Review amounts, grams and currency before applying; currencies are not converted automatically.",
      );
    }
  };
  return (
    <section className="mb-8 border-y border-border py-6" aria-labelledby="asset-organizer-heading">
      <h2 id="asset-organizer-heading" className="flex items-center gap-2 text-xl">
        <Sparkles className="size-5 text-primary" />
        {ar ? "وصف الأصول والالتزامات" : "Describe assets & liabilities"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {ar
          ? "اقتراح استرشادي، وليس فتوى. راجع كل بند قبل إدخاله؛ تجنب أسماء الأشخاص وأرقام الحسابات."
          : "Guidance, not a fatwa. Review each item before applying; omit names and account numbers."}
      </p>
      <label className="mt-4 grid gap-2 text-sm">
        <span>
          {ar
            ? "ما الذي تملكه وما الالتزامات المستحقة عليك؟"
            : "What do you own and what liabilities do you owe?"}
        </span>
        <textarea
          rows={4}
          maxLength={5000}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setItems([]);
            setApproved([]);
            setNotice("");
          }}
          className="w-full rounded-md border border-input bg-background p-3 text-foreground"
        />
      </label>
      <Button className="mt-3" disabled={busy} onClick={submit}>
        <Sparkles className="size-4" />
        {busy ? (ar ? "جارٍ التنظيم…" : "Organizing…") : ar ? "تنظيم البنود" : "Organize items"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-primary">
          {notice}
        </p>
      )}
      {items.length > 0 && (
        <div className="mt-5 grid gap-4">
          {items.map((item, index) => (
            <article key={index} className="rounded-md border border-border p-4">
              <h3 className="font-semibold">{item.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {ar ? "للمراجعة: " : "Review: "}
                {item.review}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span>{ar ? "البند" : "Category"}</span>
                  <select
                    value={item.category}
                    onChange={(e) => {
                      const category = assetCategories.find((c) => c === e.target.value);
                      if (category) edit(index, { category });
                    }}
                    className="rounded-md border border-input bg-background p-2"
                  >
                    {assetCategories.map((c) => (
                      <option key={c} value={c}>
                        {categoryLabels[c][ar ? 0 : 1]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span>{ar ? "المبلغ أو الوزن" : "Amount or weight"}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.amount ?? ""}
                    onChange={(e) =>
                      edit(index, { amount: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className="num rounded-md border border-input bg-background p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>{ar ? "الوحدة" : "Unit"}</span>
                  <select
                    value={item.unit === "currency" ? (item.currency ?? "unknown") : item.unit}
                    onChange={(e) =>
                      edit(
                        index,
                        e.target.value === currency
                          ? { unit: "currency", currency }
                          : {
                              unit: e.target.value === "grams" ? "grams" : "unknown",
                              currency: null,
                            },
                      )
                    }
                    className="rounded-md border border-input bg-background p-2"
                  >
                    <option value="unknown">{ar ? "غير محددة" : "Unknown"}</option>
                    <option value={currency}>{currency}</option>
                    {item.unit === "currency" && item.currency && item.currency !== currency && (
                      <option value={item.currency}>{item.currency}</option>
                    )}
                    <option value="grams">{ar ? "جرام" : "Grams"}</option>
                  </select>
                </label>
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={approved[index] ?? false}
                  onChange={(e) => {
                    setApproved((prev) => prev.map((v, i) => (i === index ? e.target.checked : v)));
                    setNotice("");
                  }}
                />
                <span>
                  {ar
                    ? "راجعت هذا البند وأوافق على إدخاله"
                    : "I reviewed this item and confirm its inclusion"}
                </span>
              </label>
            </article>
          ))}
          <Button
            className="justify-self-start"
            disabled={!approved.some(Boolean) || busy || contextCurrency !== currency}
            onClick={apply}
          >
            <Check className="size-4" />
            {ar ? "نقل البنود المؤكدة إلى الحاسبة" : "Apply confirmed items to calculator"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {ar
              ? "تُجمع البنود المؤكدة ويُستبدل بها محتوى الخانات المطابقة فقط؛ لا تتغير بقية الخانات أو الخيارات."
              : "Confirmed items replace matching fields only. Other fields and calculation settings stay unchanged."}
          </p>
        </div>
      )}
    </section>
  );
}
