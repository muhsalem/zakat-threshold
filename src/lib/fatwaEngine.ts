/**
 * محرك قواعد الفتاوى — Fatwa Rule Engine
 *
 * يسمح بتخصيص الأحكام حسب:
 * - الولاية القضائية (Jurisdiction: SA, AE, EG, ...)
 * - الهيئة الشرعية (Authority: AAOIFI, IFA-OIC, Dar Al-Ifta, ...)
 * - المذهب (Madhab: Hanafi, Maliki, Shafii, Hanbali)
 *
 * كل قاعدة توثّق: الحكم، النسبة، الأدلة، المصدر، تاريخ السريان.
 */

export type Madhab = "hanafi" | "maliki" | "shafii" | "hanbali";
export type Jurisdiction = "SA" | "AE" | "EG" | "KW" | "MY" | "PK" | "GB" | "US" | "ID" | "QA" | "JO" | "TR";
export type Authority =
  | "aaoifi"
  | "ifa-oic"
  | "mwl-fiqh-council"
  | "dar-al-ifta-eg"
  | "haiah-kibar-sa"
  | "bait-al-zakat-kw"
  | "majlis-fatwa-my"
  | "dar-al-ifta-jo";

export type Ruling = "obligatory" | "permissible_with_zakat" | "permissible_no_zakat" | "prohibited" | "differed";

export interface FatwaRule {
  id: string;
  topic: string; // e.g. "crypto.bitcoin", "stocks.mixed", "reit"
  authority: Authority;
  jurisdiction?: Jurisdiction[];
  madhab?: Madhab[];
  ruling: Ruling;
  rate?: number; // e.g. 0.025
  basis: string[]; // ["AAOIFI-59", "IFA-237/2019"]
  evidence?: string; // نص الدليل مختصراً
  source_url?: string;
  effective_from?: string; // ISO date
  supersedes?: string; // id of older rule
  notes?: string;
}

// ==== سجل الفتاوى المعتمدة ====
export const FATWA_REGISTRY: FatwaRule[] = [
  // العملات الرقمية
  {
    id: "crypto-btc-aaoifi-59",
    topic: "crypto.bitcoin",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-59"],
    evidence: "المعيار الشرعي (59) للعملات الرقمية — تُعدّ مالاً متقوماً في نظر بعض المجامع.",
    effective_from: "2023-01-01",
  },
  {
    id: "crypto-btc-mwl-2019",
    topic: "crypto.bitcoin",
    authority: "mwl-fiqh-council",
    jurisdiction: ["SA"],
    ruling: "differed",
    basis: ["قرار المجمع الفقهي الإسلامي — رابطة العالم الإسلامي 2019"],
    evidence: "توقّف عن الحكم النهائي بانتظار مزيد من الدراسة.",
    effective_from: "2019-01-01",
  },
  {
    id: "crypto-btc-eg-2018",
    topic: "crypto.bitcoin",
    authority: "dar-al-ifta-eg",
    jurisdiction: ["EG"],
    ruling: "prohibited",
    basis: ["فتوى دار الإفتاء المصرية — 2018"],
    effective_from: "2018-01-01",
  },

  // الأسهم
  {
    id: "stocks-pure-halal-aaoifi-21",
    topic: "stocks.islamic",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-21"],
    evidence: "الشركات النقية شرعياً — زكاة على القيمة السوقية بالكامل.",
  },
  {
    id: "stocks-mixed-aaoifi-21",
    topic: "stocks.mixed",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-21"],
    evidence: "تُخرج الزكاة على نصيب المساهم من الموجودات الزكوية فقط، لا كامل قيمة السهم.",
  },

  // REITs
  {
    id: "reit-my-2015",
    topic: "reit",
    authority: "majlis-fatwa-my",
    jurisdiction: ["MY"],
    ruling: "permissible_with_zakat",
    basis: ["MAIWP — Islamic REIT Guidelines"],
    effective_from: "2015-01-01",
  },

  // الراتب
  {
    id: "salary-hanafi-fixed",
    topic: "income.salary",
    authority: "aaoifi",
    madhab: ["hanafi"],
    ruling: "permissible_with_zakat",
    basis: ["فتوى مجمع الفقه الإسلامي الدولي — الدورة الثالثة"],
    evidence: "تُزكّى مع سائر المال عند الحول، ولا زكاة مستقلة على الراتب.",
  },

  // صناديق التقاعد والادخار الاختياري
  {
    id: "retirement-voluntary-aaoifi",
    topic: "retirement.voluntary",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-35 §2/1/6"],
    evidence: "الاشتراكات الاختيارية القابلة للسحب مالٌ مملوك يُزكَّى عند حولان الحول على القيمة الفعلية القابلة للاسترداد.",
  },
  {
    id: "retirement-mandatory-ifa-2004",
    topic: "retirement.mandatory",
    authority: "ifa-oic",
    ruling: "permissible_no_zakat",
    basis: ["قرار 143 (16/9) مجمع الفقه الإسلامي الدولي"],
    evidence: "الاقتطاعات الحكومية الإلزامية دَينٌ غير مقبوض ولا يجب فيها زكاة حتى القبض؛ يُزكّى ما يُقبض عن سنة واحدة.",
    effective_from: "2004-01-01",
  },
  {
    id: "retirement-401k-us",
    topic: "retirement.401k",
    authority: "aaoifi",
    jurisdiction: ["US"],
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35", "Fiqh Council of North America 2014"],
    evidence: "401(k)/IRA: يُزكّى الجزء القابل للسحب فعلاً بعد خصم الضرائب والغرامات؛ الجزء المحبوس مؤجّل الزكاة حتى القبض.",
  },

  // التأمين والتكافل
  {
    id: "takaful-participation-aaoifi-26",
    topic: "insurance.takaful",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-26"],
    evidence: "حصة المشترك في صندوق التكافل ماله؛ تُزكّى القيمة القابلة للاسترداد سنوياً.",
  },
  {
    id: "insurance-commercial-cash-value",
    topic: "insurance.commercial_cash_value",
    authority: "ifa-oic",
    ruling: "permissible_with_zakat",
    basis: ["قرار 9 (9/2) مجمع الفقه الإسلامي"],
    evidence: "القيمة النقدية القابلة للاسترداد من بوليصة التأمين التجاري تُعامل كمال مملوك لأغراض الزكاة رغم اختلاف العلماء في حكم العقد نفسه.",
  },

  // الوقف والأوقاف الاستثمارية
  {
    id: "waqf-productive-aaoifi-33",
    topic: "waqf.productive",
    authority: "aaoifi",
    ruling: "permissible_no_zakat",
    basis: ["AAOIFI-33"],
    evidence: "أصل الوقف الخيري لا زكاة فيه لخروجه عن الملك؛ أما ريعه الموزَّع فيُزكّى في يد المستفيد.",
  },
  {
    id: "waqf-family-shafii",
    topic: "waqf.family",
    authority: "aaoifi",
    madhab: ["shafii"],
    ruling: "permissible_with_zakat",
    basis: ["مغني المحتاج للشربيني"],
    evidence: "الوقف الذُّرِّي إن استلمه المستحق يُزكّى على قوله عند بلوغه النصاب مع الحول.",
  },

  // السندات والصكوك
  {
    id: "sukuk-ijara-aaoifi-17",
    topic: "sukuk.ijara",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-17"],
    evidence: "صكوك الإجارة تمثّل ملكية شائعة في أعيان مؤجّرة؛ تُزكّى على قيمتها السوقية.",
  },
  {
    id: "bonds-conventional-ifa",
    topic: "bonds.conventional",
    authority: "ifa-oic",
    ruling: "prohibited",
    basis: ["قرار 60 (11/6) مجمع الفقه الإسلامي"],
    evidence: "السندات الربوية محرّمة؛ ويجب التخلّص من الفائدة، ويُزكّى رأس المال فقط دون الفوائد.",
  },

  // الأصول الرقمية غير Bitcoin
  {
    id: "nft-utility-aaoifi-59",
    topic: "crypto.nft_utility",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-59"],
    evidence: "NFTs ذات المنفعة المشروعة تُعامل كأصل تجاري إن نُويت للتجارة؛ تُزكّى على القيمة السوقية.",
    effective_from: "2023-01-01",
  },
  {
    id: "stablecoin-usdc-aaoifi",
    topic: "crypto.stablecoin",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-59"],
    evidence: "العملات المستقرة المضمونة بالدولار (USDC/USDT) تُعامل كنقد أجنبي؛ تُزكّى كاملةً عند بلوغ النصاب.",
    effective_from: "2024-01-01",
  },

  // العملات الأجنبية والاحتياطيات
  {
    id: "fx-holdings-aaoifi-1",
    topic: "fx.holdings",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-1"],
    evidence: "العملات الأجنبية أثمان مصطلح عليها؛ تُقوَّم بعملة الوطن يوم الحول وتُزكّى إن بلغت النصاب مع بقية المال.",
  },

  // الديون
  {
    id: "debts-strong-hanafi",
    topic: "debts.strong",
    authority: "aaoifi",
    madhab: ["hanafi"],
    ruling: "permissible_with_zakat",
    basis: ["فقه أبي حنيفة — الدَّين القوي"],
    evidence: "الدَّين المرجوّ السداد يُزكّى مع المال كل حول عند الحنفية.",
  },
  {
    id: "debts-doubtful-jumhur",
    topic: "debts.doubtful",
    authority: "ifa-oic",
    ruling: "permissible_no_zakat",
    basis: ["قرار 1 مجمع الفقه — الدورة الثانية"],
    evidence: "الدَّين الضعيف (المتعثّر/المجحود) لا زكاة فيه حتى يُقبض، ثم يُزكّى لعام واحد.",
  },

  // الذهب المستعمل والحُلي
  {
    id: "jewelry-worn-jumhur",
    topic: "gold.jewelry_worn",
    authority: "ifa-oic",
    ruling: "permissible_no_zakat",
    basis: ["قرار جمهور المالكية والشافعية والحنابلة"],
    evidence: "الحُلي المستعمل للزينة المشروعة لا زكاة فيه عند الجمهور، وعليه العمل في أكثر الفتاوى المعاصرة.",
  },
  {
    id: "jewelry-worn-hanafi",
    topic: "gold.jewelry_worn",
    authority: "aaoifi",
    madhab: ["hanafi"],
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["مذهب الحنفية"],
    evidence: "الحنفية يوجبون الزكاة في الحُلي مطلقاً بلغ النصاب.",
  },

  // === توسعات 2026: زكاة الأنعام والزراعة ===
  {
    id: "livestock-fish-jumhur",
    topic: "livestock.fish",
    authority: "ifa-oic",
    ruling: "permissible_no_zakat",
    basis: ["قرار مجمع الفقه — الدورة الثانية عشرة"],
    evidence: "الثروة السمكية لا زكاة فيها في ذاتها؛ فإن كانت للتجارة زُكّيت زكاة عروض التجارة على القيمة السوقية.",
  },
  {
    id: "livestock-poultry-trade",
    topic: "livestock.poultry",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35 §5/2"],
    evidence: "الدواجن المرباة للتجارة تُزكّى زكاة عروض التجارة بالقيمة السوقية عند حولان الحول.",
  },
  {
    id: "livestock-honey-hanbali",
    topic: "livestock.honey",
    authority: "aaoifi",
    madhab: ["hanbali"],
    ruling: "permissible_with_zakat",
    rate: 0.1,
    basis: ["مذهب الحنابلة والصاحبين من الحنفية"],
    evidence: "العسل يجب فيه العُشر عند الحنابلة إذا بلغ النصاب (قيل: 160 رطلاً عراقياً ≈ 653 كجم).",
  },
  {
    id: "crops-honey-jumhur",
    topic: "livestock.honey",
    authority: "ifa-oic",
    ruling: "permissible_no_zakat",
    basis: ["مذهب المالكية والشافعية"],
    evidence: "الجمهور من المالكية والشافعية لا يوجبون الزكاة في العسل لعدم ثبوت الدليل عندهم.",
  },
  {
    id: "crops-dairy-trade",
    topic: "livestock.dairy_production",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35"],
    evidence: "الألبان المُنتَجة للبيع تُعامل كعروض تجارة؛ تُزكّى القيمة السوقية للمخزون والذمم المدينة.",
  },

  // === الملكية الفكرية والأصول غير الملموسة ===
  {
    id: "ip-trade-aaoifi-42",
    topic: "intellectual_property.trade",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-42", "قرار مجمع الفقه 43 (5/5)"],
    evidence: "حقوق الملكية الفكرية (براءات، علامات، حقوق نشر) المُعدَّة للبيع تُزكّى بقيمتها السوقية العادلة عند الحول.",
  },
  {
    id: "ip-income-jumhur",
    topic: "intellectual_property.royalty",
    authority: "ifa-oic",
    ruling: "permissible_with_zakat",
    basis: ["قياس على المستغلات"],
    evidence: "الإتاوات والرواتب من الملكية الفكرية تُزكّى مع سائر المال إذا حال عليها الحول وبلغت النصاب.",
  },
  {
    id: "domain-names-trade",
    topic: "digital.domain_names",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["قياس على عروض التجارة"],
    evidence: "أسماء النطاقات المُقتناة للتجارة تُزكّى بقيمتها السوقية عند بلوغ النصاب.",
  },

  // === زكاة الأراضي والتطوير العقاري ===
  {
    id: "land-trade-aaoifi-35",
    topic: "realestate.land_trade",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35 §5/2"],
    evidence: "الأراضي المُشتراة بنيّة البيع (عروض تجارة) تُزكّى بالقيمة السوقية العادلة عند حولان الحول.",
  },
  {
    id: "land-personal-no-zakat",
    topic: "realestate.land_personal",
    authority: "aaoifi",
    ruling: "permissible_no_zakat",
    basis: ["إجماع الفقهاء"],
    evidence: "الأراضي المُقتناة للسكن أو للأولاد أو لغير التجارة لا زكاة في أعيانها.",
  },
  {
    id: "realestate-development",
    topic: "realestate.development",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35 §5/3"],
    evidence: "مشاريع التطوير العقاري: يُزكّى المخزون (Work-in-Progress + الوحدات الجاهزة للبيع) بالقيمة السوقية أو التكلفة أيهما أقل.",
  },
  {
    id: "realestate-rental-mustaghallat",
    topic: "realestate.rental",
    authority: "ifa-oic",
    ruling: "permissible_with_zakat",
    basis: ["قرار 2 مجمع الفقه — الدورة الثانية"],
    evidence: "العقار المُؤجَّر (المستغلات) لا زكاة في عينه؛ وتُزكّى غلّته (الإيجار) مع سائر المال إذا بلغت النصاب وحال عليها الحول.",
  },
  {
    id: "reit-shariah-aaoifi",
    topic: "reit.shariah_compliant",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-21", "MAIWP Guidelines"],
    evidence: "صناديق الاستثمار العقاري المتوافقة شرعاً: يُزكّى نصيب المستثمر من الموجودات الزكوية (النقد + الذمم + الأراضي التجارية) لا كامل قيمة الوحدة.",
  },

  // === زكاة الشركات والصناعات المتخصصة ===
  {
    id: "islamic-bank-model",
    topic: "company.islamic_bank",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35 §7"],
    evidence: "البنوك الإسلامية: يُزكّى صافي الموجودات الزكوية (نقد + استثمارات قصيرة + مرابحات) بعد خصم الودائع والالتزامات؛ حسابات المضاربة تُزكّى في يد أصحابها.",
  },
  {
    id: "takaful-fund-aaoifi-26",
    topic: "company.takaful",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-26"],
    evidence: "صناديق التكافل: تُزكّى أموال المساهمين (شركة التكافل) بمنهج الشركات، أما صندوق المشتركين فيُزكّى الفائض الموزَّع في يد المشترك.",
  },
  {
    id: "startup-preRevenue",
    topic: "company.startup_prerevenue",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35"],
    evidence: "الشركات الناشئة قبل الإيرادات: تُزكّى الأصول الزكوية (النقد المُحصَّل من التمويل + الاستثمارات) عند بلوغ النصاب وحولان الحول، حتى ولو كانت الشركة خاسرة.",
  },
  {
    id: "holding-consolidated",
    topic: "company.holding_consolidated",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35 §8"],
    evidence: "الشركات القابضة: تُحسَب الزكاة على أساس القوائم المُوحَّدة، مع مراعاة استبعاد المعاملات البينية والحصص غير المُسيطر عليها.",
  },
  {
    id: "waqf-body-no-zakat",
    topic: "company.waqf",
    authority: "aaoifi",
    ruling: "permissible_no_zakat",
    basis: ["AAOIFI-33"],
    evidence: "المؤسسات الوقفية لا زكاة على أصولها الموقوفة لخروجها عن الملك الخاص؛ لكن رِيع الوقف الموزَّع يُزكّى في يد المستفيد إن بلغ النصاب.",
  },
  {
    id: "ngo-no-zakat",
    topic: "company.ngo",
    authority: "ifa-oic",
    ruling: "permissible_no_zakat",
    basis: ["قياس على الوقف"],
    evidence: "الجمعيات الخيرية والمنظمات غير الربحية لا زكاة على أموالها المُخصَّصة للأغراض الخيرية؛ الأموال الاستثمارية المُدرَّة للربح قد تُزكّى إن كانت للتجارة.",
  },

  // === زكاة الأدوات المالية الحديثة ===
  {
    id: "sukuk-mudaraba",
    topic: "sukuk.mudaraba",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-17"],
    evidence: "صكوك المضاربة والمشاركة: تُزكّى بحصة الصكّ من الموجودات الزكوية في المشروع (لا القيمة السوقية الكاملة).",
  },
  {
    id: "sukuk-murabaha",
    topic: "sukuk.murabaha",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-17"],
    evidence: "صكوك المرابحة: تُعامل كديون قوية؛ تُزكّى بالقيمة الاسمية عند حولان الحول.",
  },
  {
    id: "etf-halal-aaoifi",
    topic: "securities.etf_shariah",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-21"],
    evidence: "صناديق ETF المتوافقة شرعاً: تُزكّى بنسبة الموجودات الزكوية داخل الصندوق (مُعلَنة عادةً في تقرير التنقية الشرعية Purification Ratio).",
  },
  {
    id: "money-market-shariah",
    topic: "securities.money_market_shariah",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-21"],
    evidence: "صناديق النقد الإسلامية: تُعامل كنقد؛ تُزكّى بالقيمة السوقية كاملةً عند بلوغ النصاب.",
  },
  {
    id: "perpetual-futures-prohibited",
    topic: "derivatives.perpetual_futures",
    authority: "aaoifi",
    ruling: "prohibited",
    basis: ["AAOIFI-20", "قرار مجمع الفقه 63 (1/7)"],
    evidence: "العقود المستقبلية الدائمة (Perpetual Futures) محرّمة لاشتمالها على الغرر والربا (Funding Rate)؛ لا تُزكّى، ويجب التخلّص من الأرباح.",
  },
  {
    id: "options-prohibited",
    topic: "derivatives.options",
    authority: "aaoifi",
    ruling: "prohibited",
    basis: ["قرار مجمع الفقه 63 (1/7)"],
    evidence: "الخيارات (Options) بيع مجرَّد حقوق لا تُقابل بمال؛ محرّمة عند الجمهور المعاصرين.",
  },

  // === زكاة الأصول الرقمية الموسّعة ===
  {
    id: "crypto-mining-rewards",
    topic: "crypto.mining",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-59"],
    evidence: "عائدات تعدين العملات الرقمية المشروعة تُعامل كمال مُكتَسَب؛ تُزكّى مع سائر المال عند حولان الحول.",
  },
  {
    id: "crypto-staking-rewards",
    topic: "crypto.staking",
    authority: "aaoifi",
    ruling: "differed",
    basis: ["AAOIFI-59 — قيد الدراسة"],
    evidence: "مكافآت Staking فيها خلاف: من يُشبهها بالإجارة يُجيزها، ومن يُشبهها بالربا يمنعها. عند من يُجيزها تُزكّى مع النقد.",
  },
  {
    id: "defi-yield-prohibited",
    topic: "crypto.defi_yield",
    authority: "aaoifi",
    ruling: "prohibited",
    basis: ["AAOIFI-59", "قياس على الربا"],
    evidence: "عوائد بروتوكولات DeFi القائمة على الإقراض بفائدة (Aave, Compound) محرّمة؛ يجب التخلّص من الأرباح، ويُزكّى رأس المال فقط.",
  },
  {
    id: "nft-collectible-no-zakat",
    topic: "crypto.nft_collectible",
    authority: "aaoifi",
    ruling: "permissible_no_zakat",
    basis: ["قياس على المقتنيات الشخصية"],
    evidence: "الـ NFTs المُقتناة كأصول شخصية (Art, Collectibles) لا للتجارة لا زكاة فيها؛ إن نُويت التجارة زُكّيت بالقيمة السوقية.",
  },

  // === زكاة الرواتب والاستحقاقات ===
  {
    id: "salary-savings-aaoifi",
    topic: "income.salary_savings",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-35 §2/1/5"],
    evidence: "المدَّخر من الراتب يُزكّى عند حولان الحول من أول شهر بلغ فيه المُدَّخر النصاب.",
  },
  {
    id: "bonus-endofservice",
    topic: "income.end_of_service",
    authority: "ifa-oic",
    ruling: "permissible_with_zakat",
    basis: ["قرار 143 مجمع الفقه"],
    evidence: "مكافأة نهاية الخدمة عند القبض: تُزكّى لعام واحد فقط ثم تدخل في وعاء الحول القادم.",
  },
  {
    id: "esop-vested",
    topic: "income.esop_vested",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-21"],
    evidence: "خيارات الأسهم للموظفين (ESOP/RSU) المُستحَقَّة (Vested): تُعامل كأسهم مملوكة؛ تُزكّى بالقيمة السوقية بعد خصم تكلفة التنفيذ.",
  },
  {
    id: "esop-unvested-no-zakat",
    topic: "income.esop_unvested",
    authority: "aaoifi",
    ruling: "permissible_no_zakat",
    basis: ["قياس على الدَّين غير المستحقّ"],
    evidence: "خيارات الأسهم غير المُستحَقَّة (Unvested) لا يملكها الموظف ملكاً تاماً؛ لا زكاة عليها حتى تستحقّ.",
  },

  // === زكاة الديون والمستحقات ===
  {
    id: "loans-given-solid",
    topic: "debts.loans_given",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-35 §2/2"],
    evidence: "القروض التي أعطيتها للآخرين وترجو ردَّها: تُزكّى معك كل عام كمالك.",
  },
  {
    id: "loans-owed-deductible",
    topic: "debts.loans_owed",
    authority: "aaoifi",
    ruling: "permissible_no_zakat",
    basis: ["AAOIFI-35 §3/1", "قرار مجمع الفقه 165"],
    evidence: "الديون التي عليك (قصيرة الأجل مستحقّة خلال السنة) تُخصَم من الوعاء الزكوي. الديون طويلة الأجل تُخصم بمقدار قسط سنة واحدة فقط.",
  },
  {
    id: "receivables-doubtful-provision",
    topic: "debts.receivables_doubtful",
    authority: "aaoifi",
    ruling: "permissible_no_zakat",
    basis: ["AAOIFI-35 §2/2/3"],
    evidence: "الذمم المدينة المشكوك في تحصيلها (مُخصَّص Doubtful) تُخصَم من الوعاء الزكوي؛ فإن قُبضت لاحقاً زُكّيت لعام واحد.",
  },

  // ==== أوعية زكوية جديدة ====

  // تعدين العملات الرقمية (Crypto Mining)
  {
    id: "crypto-mining-aaoifi-59",
    topic: "crypto.mining",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-59", "قياس على عروض التجارة"],
    evidence: "مخرجات التعدين إن قُصد بها التجارة تُعامل معاملة عروض التجارة (2.5% على القيمة السوقية عند الحول)؛ وإن كانت للاقتناء طويل الأجل فحكمها حكم النقدين إن بلغت النصاب.",
    effective_from: "2023-06-01",
    notes: "تُخصم تكاليف الكهرباء والمعدات كمصروفات جارية قبل حساب الوعاء.",
  },
  {
    id: "crypto-defi-staking-aaoifi",
    topic: "crypto.staking",
    authority: "aaoifi",
    ruling: "differed",
    basis: ["AAOIFI-59", "دراسات المجلس الشرعي"],
    evidence: "عوائد الـ Staking تحتاج تكييفاً فقهياً: إن كانت أجرة على خدمة تحقّق (Validator) فجائزة وتُزكّى؛ وإن كانت فائدة محضة على إيداع فمنعها الأولى.",
    effective_from: "2024-01-01",
  },

  // الثروة السمكية والمزارع المائية
  {
    id: "fish-farming-trade-goods",
    topic: "livestock.fish_farming",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-35 §5", "قياس على عروض التجارة"],
    evidence: "الأسماك المستزرعة للبيع تُعدّ عروض تجارة: تُقوَّم بسعر السوق عند الحول ويُخرج 2.5% من صافي الوعاء بعد خصم الديون والمصروفات المستحقة.",
    effective_from: "2023-01-01",
    notes: "الأسماك المصطادة من البحر مباحة أصلاً ولا زكاة فيها لعينها، إنما زكاة عائدها المتحقّق نقداً.",
  },
  {
    id: "fish-catch-cash-yield",
    topic: "livestock.fish_catch",
    authority: "ifa-oic",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["قرار المجمع 143 (2003)"],
    evidence: "صافي دخل الصيد البحري بعد المصروفات يُضمّ إلى المال ويُزكّى مع حول المال إن بلغ النصاب.",
    effective_from: "2003-01-01",
  },

  // الإنتاج الحيواني (ألبان، بيض، عسل، دواجن)
  {
    id: "animal-production-poultry-aaoifi",
    topic: "livestock.poultry_production",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-35 §5/2"],
    evidence: "مزارع الدواجن والألبان والبيض للتجارة تُعامل عروضَ تجارة: يُزكَّى الوعاء (المخزون + الذمم + النقد − الديون) بنسبة 2.5% عند الحول.",
    effective_from: "2023-01-01",
  },
  {
    id: "honey-production-hanafi",
    topic: "livestock.honey",
    authority: "aaoifi",
    madhab: ["hanafi", "hanbali"],
    ruling: "permissible_with_zakat",
    rate: 0.10,
    basis: ["قول الحنفية والحنابلة", "حديث ابن عمر"],
    evidence: "العسل المستخرَج من أرض عشرية فيه العُشر (10%) عند الحنفية والحنابلة إن بلغ النصاب؛ ولا زكاة فيه عند الشافعية والمالكية إلا إن كان للتجارة فيُزكَّى 2.5%.",
    effective_from: "2023-01-01",
  },

  // الملكية الفكرية وحقوق التأليف والبراءات
  {
    id: "ip-royalties-cash-yield",
    topic: "ip.royalties",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-35 §4", "قياس على المستغلات"],
    evidence: "لا زكاة على أصل الملكية الفكرية (البراءة، حق النشر، العلامة التجارية)، وإنما تجب الزكاة في صافي عوائدها النقدية (Royalties) بعد ضمّها إلى مال المالك وحلول الحول بنسبة 2.5%.",
    effective_from: "2023-01-01",
  },
  {
    id: "ip-patent-tradeable-asset",
    topic: "ip.patent_for_sale",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-35 §4/1", "قياس على عروض التجارة"],
    evidence: "إن اقتُنيت البراءة أو حق النشر بنيّة البيع فتُقوَّم بسعر السوق عند الحول وتُزكّى 2.5% كعروض تجارة.",
    effective_from: "2024-01-01",
  },
  {
    id: "ip-software-licenses",
    topic: "ip.software_licenses",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-35 §4"],
    evidence: "دخل تراخيص البرمجيات (SaaS Subscriptions) يُعامل معاملة الأجرة/المستغلات: تُزكّى العوائد النقدية بعد خصم المصروفات التشغيلية عند حولان الحول.",
    effective_from: "2024-01-01",
  },
];

// ==== الاستعلامات ====

export interface FatwaQuery {
  topic: string;
  jurisdiction?: Jurisdiction;
  authority?: Authority;
  madhab?: Madhab;
  onlyEffective?: boolean;
}

export function findFatwas(q: FatwaQuery): FatwaRule[] {
  const today = new Date().toISOString().slice(0, 10);
  return FATWA_REGISTRY.filter((r) => {
    if (r.topic !== q.topic) return false;
    if (q.authority && r.authority !== q.authority) return false;
    if (q.jurisdiction && r.jurisdiction && !r.jurisdiction.includes(q.jurisdiction)) return false;
    if (q.madhab && r.madhab && !r.madhab.includes(q.madhab)) return false;
    if (q.onlyEffective && r.effective_from && r.effective_from > today) return false;
    // استبعد المنسوخ
    const supersededBy = FATWA_REGISTRY.find((x) => x.supersedes === r.id);
    if (supersededBy) return false;
    return true;
  });
}

/**
 * يختار الحكم الراجح بناءً على الأولوية:
 * 1. فتوى الهيئة الوطنية للولاية القضائية إن وُجدت
 * 2. AAOIFI (المعيار الدولي)
 * 3. مجمع الفقه الإسلامي الدولي
 * 4. أول فتوى متاحة
 */
export function resolveRuling(q: FatwaQuery): FatwaRule | null {
  const matches = findFatwas({ ...q, onlyEffective: true });
  if (!matches.length) return null;

  const nationalPriority: Record<Jurisdiction, Authority[]> = {
    SA: ["haiah-kibar-sa", "mwl-fiqh-council"],
    EG: ["dar-al-ifta-eg"],
    KW: ["bait-al-zakat-kw"],
    MY: ["majlis-fatwa-my"],
    JO: ["dar-al-ifta-jo"],
    AE: [], PK: [], GB: [], US: [], ID: [], QA: [], TR: [],
  };

  if (q.jurisdiction) {
    for (const auth of nationalPriority[q.jurisdiction] ?? []) {
      const m = matches.find((r) => r.authority === auth);
      if (m) return m;
    }
  }
  return matches.find((r) => r.authority === "aaoifi")
    ?? matches.find((r) => r.authority === "ifa-oic")
    ?? matches[0];
}
