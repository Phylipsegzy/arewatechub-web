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
        {/* afterInteractive (not beforeInteractive) — the popup is only ever
            triggered by a user click well after the page is interactive, so
            there's no need to block rendering on this loading, and it avoids
            a next/script + App Router quirk that was throwing a spurious
            "script tag" warning in dev. */}
        <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
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
