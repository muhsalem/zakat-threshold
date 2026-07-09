import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, Clock } from "lucide-react";
import { BLOG_POSTS } from "@/lib/blogPosts";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "مدوّنة نِصاب — فقه الزكاة المعاصر" },
      {
        name: "description",
        content:
          "مقالات متخصّصة في فقه الزكاة، معايير AAOIFI، زكاة الشركات، العملات الرقمية، ومصارف الزكاة الثمانية.",
      },
      { property: "og:title", content: "مدوّنة نِصاب — فقه الزكاة المعاصر" },
      { property: "og:description", content: "مقالات فقهية ومحاسبية متخصّصة في الزكاة" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogLayout,
});

function BlogLayout() {
  const matchRoute = useMatchRoute();
  const isDetail = matchRoute({ to: "/blog/$slug" });
  if (isDetail) return <Outlet />;
  return <BlogIndex />;
}

function BlogIndex() {
  return (
    <div className="container max-w-5xl py-10 space-y-8" dir="rtl">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">مدوّنة نِصاب</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          مقالات متخصّصة في فقه الزكاة المعاصر، معايير AAOIFI، وحلول محاسبية للشركات والأفراد.
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-5">
        {BLOG_POSTS.map((p) => (
          <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }}>
            <Card className="h-full hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="text-lg leading-snug">{p.title}</CardTitle>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {p.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {p.readMinutes} د
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
