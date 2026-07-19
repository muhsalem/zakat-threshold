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
import { MadhabProvider } from "@/lib/madhabContext";
import { AdminFloatingLinks } from "@/components/AdminFloatingLinks";
import { CommandPalette } from "@/components/CommandPalette";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { FloatingDock } from "@/components/FloatingDock";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { DirectionProvider } from "@radix-ui/react-direction";
import { ArchiveMigrationDialog } from "@/components/archive/ArchiveMigrationDialog";

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
      // R6: تشديد رؤوس الأمان عبر meta http-equiv (المدعومة في المتصفح)
      {
        httpEquiv: "Content-Security-Policy",
        content: [
          "default-src 'self'",
          // Vite HMR وscripts داخلية — نُبقي unsafe-inline لتوافق shadcn/toaster
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: data: https:",
          "connect-src 'self' https: wss: data: blob:",
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join("; "),
      },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      {
        httpEquiv: "Permissions-Policy",
        content: "geolocation=(), microphone=(), camera=(), payment=(self), usb=()",
      },
      { title: "حاسبة الزكاة — للأفراد والشركات" },
      {
        name: "description",
        content:
          "تطبيق شامل لحساب زكاة الأفراد والشركات وفق الضوابط الشرعية، مع التدقيق والامتثال الشرعي والتطور التاريخي للنصاب.",
      },
      { name: "author", content: "Zakat Calculator" },
      { property: "og:title", content: "حاسبة الزكاة — للأفراد والشركات" },
      {
        property: "og:description",
        content:
          "احسب زكاة المال والذهب والفضة والأنعام والزروع وعروض التجارة بدقة، مع نموذج خاص بزكاة الشركات.",
      },
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
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider dir="rtl">
        <LanguageProvider>
          <MadhabProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:rounded focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-1.5 focus:text-sm"
            >
              تخطَّ إلى المحتوى الرئيسي
            </a>
            <SidebarProvider>
              <AppShell />
            </SidebarProvider>
            <FloatingDock />
            <AdminFloatingLinks />
            <CommandPalette />
            <OnboardingWizard />
            <PWAInstallPrompt />
            <MobileBottomNav />
            <ArchiveMigrationDialog />
            <SonnerToaster />
          </MadhabProvider>
        </LanguageProvider>
      </DirectionProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex w-full" dir="rtl">
      {user && <AppSidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
