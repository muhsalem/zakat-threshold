import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { BLOG_POSTS, getPost } from "@/lib/blogPosts";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "مقال غير موجود — نِصاب" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.post;
    return {
      meta: [
        { title: `${p.title} — نِصاب` },
        { name: "description", content: p.description },
        { name: "author", content: p.author },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.description },
        { property: "og:type", content: "article" },
        { property: "article:published_time", content: p.date },
        { property: "article:author", content: p.author },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: BlogPost,
  notFoundComponent: NotFoundPost,
});

function renderInline(s: string) {
  const escaped = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>');
}

function renderBody(md: string) {
  const blocks = md.trim().split(/\n\n+/);
  return blocks.map((b, i) => {
    if (b.startsWith("## ")) {
      return <h2 key={i} className="text-xl font-bold mt-6 mb-2">{b.slice(3)}</h2>;
    }
    const lines = b.split("\n");
    if (lines.every((l) => /^\d+\.\s/.test(l))) {
      return (
        <ol key={i} className="list-decimal pr-6 space-y-1">
          {lines.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(l.replace(/^\d+\.\s/, "")) }} />
          ))}
        </ol>
      );
    }
    if (lines.every((l) => l.startsWith("- "))) {
      return (
        <ul key={i} className="list-disc pr-6 space-y-1">
          {lines.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(l.slice(2)) }} />
          ))}
        </ul>
      );
    }
    return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(b) }} />;
  });
}

function BlogPost() {
  const { post } = Route.useLoaderData();
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <article className="container max-w-3xl py-10 space-y-6" dir="rtl">
      <Link to="/blog" className="text-sm text-primary flex items-center gap-1">
        <ArrowRight className="h-4 w-4 rotate-180" /> رجوع للمدوّنة
      </Link>
      <header className="space-y-3 border-b pb-4">
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
        </div>
        <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
        <p className="text-muted-foreground">{post.description}</p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {post.author}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.date}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readMinutes} دقائق قراءة</span>
        </div>
      </header>

      <div className="space-y-3 text-[0.95rem]">{renderBody(post.body)}</div>

      <section className="border-t pt-6 space-y-3">
        <h3 className="font-bold">مقالات ذات صلة</h3>
        <ul className="space-y-2 text-sm">
          {related.map((r) => (
            <li key={r.slug}>
              <Link to="/blog/$slug" params={{ slug: r.slug }} className="text-primary hover:underline">
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/">
          <Button className="mt-3">احسب زكاتك الآن</Button>
        </Link>
      </section>
    </article>
  );
}

function NotFoundPost() {
  return (
    <div className="container max-w-xl py-16 text-center space-y-3" dir="rtl">
      <h1 className="text-2xl font-bold">المقال غير موجود</h1>
      <Link to="/blog"><Button variant="outline">تصفّح المدوّنة</Button></Link>
    </div>
  );
}
