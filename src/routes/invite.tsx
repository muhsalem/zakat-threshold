import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import {
  INVITATION_KINDS,
  buildInvitation,
  whatsappShareUrl,
  type InvitationKind,
} from "@/lib/invitations";

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "دعوة لمراجعة نِصاب" },
      {
        name: "description",
        content: "نصوص جاهزة تدعو العلماء والمطورين والصاغة والمهتمين لمراجعة منصة نِصاب.",
      },
      { property: "og:title", content: "دعوة لمراجعة نِصاب" },
      { property: "og:description", content: "نصوص دعوة جاهزة للمشاركة عبر واتساب أو النسخ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Invite,
});

function Invite() {
  const [kind, setKind] = useState<InvitationKind>("general");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const text = buildInvitation(kind, origin || "https://");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Page
      eyebrow="مشاركة"
      title="دعوة لمراجعة نِصاب"
      sub="اختر نصًّا مناسبًا للجهة التي تدعوها، وعدّله إن شئت قبل الإرسال."
    >
      <div role="tablist" className="flex flex-wrap gap-2">
        {INVITATION_KINDS.map((item) => (
          <Button
            key={item.id}
            role="tab"
            aria-selected={kind === item.id}
            variant={kind === item.id ? "default" : "outline"}
            onClick={() => setKind(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <pre className="card-surface mt-4 whitespace-pre-wrap p-5 text-sm leading-8 text-foreground">
        {text}
      </pre>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => void copy()} disabled={!origin}>
          <Copy /> {copied ? "تم النسخ" : "نسخ النص"}
        </Button>
        <Button asChild variant="outline" disabled={!origin}>
          <a href={whatsappShareUrl(text)} target="_blank" rel="noopener noreferrer">
            <Share2 /> مشاركة عبر واتساب
          </a>
        </Button>
      </div>
    </Page>
  );
}
