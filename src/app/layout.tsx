import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "ArewaTecHub",
  description: "Workspace booking & Digital Academy",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#DF2328",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      {/* suppressHydrationWarning on both html and body: browser extensions
          and accessibility tools (Grammarly's data-gr-ext-installed, a
          focus-visible polyfill's js-focus-visible class, etc.) inject
          attributes before React hydrates — harmless, but noisy without this. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Paystack's inline.js is intentionally NOT loaded here globally —
            it throws a fatal, uncaught error on any page without a payment
            form (crashed the admin panel, which has none). It's loaded
            on-demand instead, only by pages that actually open the popup —
            see src/lib/paystack.ts. */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
