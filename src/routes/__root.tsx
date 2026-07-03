import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { initSentry } from "@/lib/sentry";
import { LanguageProvider } from "@/lib/i18n";
import { AdminFloatingLinks } from "@/components/AdminFloatingLinks";
import { CommandPalette } from "@/components/CommandPalette";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { FloatingDock } from "@/components/FloatingDock";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "حاسبة الزكاة — للأفراد والشركات" },
      { name: "description", content: "تطبيق شامل لحساب زكاة الأفراد والشركات وفق الضوابط الشرعية، مع التدقيق والامتثال الشرعي والتطور التاريخي للنصاب." },
      { name: "author", content: "Zakat Calculator" },
      { property: "og:title", content: "حاسبة الزكاة — للأفراد والشركات" },
      { property: "og:description", content: "احسب زكاة المال والذهب والفضة والأنعام والزروع وعروض التجارة بدقة، مع نموذج خاص بزكاة الشركات." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "نِصاب — حاسبة الزكاة" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-192.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icon-192.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Amiri:wght@400;700&family=Amiri+Quran&family=Cairo:wght@400;500;600;700;800;900&family=Noto+Kufi+Arabic:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    initSentry();
    if (typeof window !== "undefined" && "serviceWorker" in navigator && window.location.hostname !== "localhost") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:rounded focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-1.5 focus:text-sm"
        >
          تخطَّ إلى المحتوى الرئيسي
        </a>
        <Outlet />
        <Link
          to="/verify"
          aria-label="التحقق من تقرير الزكاة"
          className="print:hidden fixed bottom-4 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          التحقق من تقرير
        </Link>
        <Link
          to="/organizations"
          aria-label="المؤسسات والشركات"
          className="print:hidden fixed bottom-16 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
          المؤسسات
        </Link>
        <Link
          to="/prices-history"
          aria-label="السجل التاريخي للأسعار"
          className="print:hidden fixed bottom-28 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          سجل الأسعار
        </Link>
        <Link
          to="/faq"
          aria-label="الأسئلة الشائعة عن الزكاة"
          className="print:hidden fixed bottom-40 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          الأسئلة الشائعة
        </Link>
        <Link
          to="/advisor"
          aria-label="مستشار الزكاة الذكي"
          className="print:hidden fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
          مستشار ذكي
        </Link>
        <Link
          to="/portal-signin"
          aria-label="بوابات الدخول: محاسب أو فرد أو شركة"
          className="print:hidden fixed bottom-16 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3.5 py-2 text-xs font-semibold shadow-lg hover:bg-emerald-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          بوابات الدخول
        </Link>
        <Link
          to="/accountant"
          aria-label="لوحة المحاسب"
          className="print:hidden fixed bottom-28 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-card/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>
          لوحة المحاسب
        </Link>
        <Link
          to="/client-intake"
          aria-label="نافذة الفرد والشركة"
          className="print:hidden fixed bottom-40 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-card/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          نافذة الفرد/الشركة
        </Link>
        <AdminFloatingLinks />
        <CommandPalette />
        <OnboardingWizard />
        <PWAInstallPrompt />
        <MobileBottomNav />
        <SonnerToaster />

      </LanguageProvider>
    </QueryClientProvider>
  );
}
