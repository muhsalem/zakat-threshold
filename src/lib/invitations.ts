/**
 * Ready-to-share invitations that ask people to review the platform. Pure text: no claims
 * beyond what the platform itself shows (weights, the free/no-ads model, the open API).
 */
export type InvitationKind = "general" | "scholars" | "developers" | "field";

export const INVITATION_KINDS: { id: InvitationKind; label: string }[] = [
  { id: "general", label: "دعوة عامة" },
  { id: "scholars", label: "للعلماء والفقهاء" },
  { id: "developers", label: "للمطورين والتقنيين" },
  { id: "field", label: "للتوثيق الميداني" },
];

const OPENING = "بسم الله الرحمن الرحيم\n\nالسلام عليكم ورحمة الله وبركاته،\n\n";

const CLOSING = "\n\nشاكرون لكم وقتكم وملاحظاتكم، وجزاكم الله خيرًا.";

const BODY: Record<InvitationKind, (url: string) => string> = {
  general: (url) =>
    `أدعوكم للاطلاع على منصة «نِصاب»، وهي تعرض نصاب الذهب (٨٥ جم) والفضة (٥٩٥ جم) بعملة بلدك، مع حاسبة للزكاة:\n\n🌐 ${url}\n\nالمنصة مجانية وبلا إعلانات، وتهمنا ملاحظاتكم على وضوح الأرقام وسهولة الاستخدام.`,
  scholars: (url) =>
    `أدعو فضيلتكم لمراجعة ما تعرضه منصة «نِصاب» من أحكام الأنصبة وأقوال المذاهب في الزكاة، وتصويب ما يحتاج تصويبًا:\n\n🌐 ${url}/fiqh\n🌐 ${url}/methodology\n\nنحرص على عرض الخلاف كما هو وعدم الجزم في موضع الخلاف، وعلى أن يكون لكل مرجع نصه ورابطه. ويهمنا خصوصًا: مسألة الحُلي، وخصم الدين، ومعيار الفضة أو الذهب للنقود المعاصرة.`,
  developers: (url) =>
    `أدعو المطورين لتجربة واجهة «نِصاب» المفتوحة وإبداء رأيكم في بنيتها:\n\n🌐 ${url}/developers\n\nتعيد الواجهة نصاب أي دولة بعملتها بصيغة JSON أو CSV، وتتيح الاطلاع على اللقطة اليومية الموثقة للأسعار وحالة إجماع المصادر، مع نشرة موقّعة للبرامج. نرحب بتقارير الأخطاء والاقتراحات.`,
  field: (url) =>
    `إن كنتَ صائغًا أو تاجر معادن أو تتابع سوق الذهب في بلدك، فأدعوك للمساهمة بسعر موثق في منصة «نِصاب»:\n\n🌐 ${url}/partners\n\nنطلب سعر الجرام عيار ٢٤ ومصدره وتاريخه، وتراجعه جهة إشراف قبل أن يظهر للعموم.`,
};

export function buildInvitation(kind: InvitationKind, siteUrl: string): string {
  const url = siteUrl.replace(/\/+$/, "");
  return OPENING + BODY[kind](url) + CLOSING;
}

export function whatsappShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
