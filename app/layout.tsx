import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FORM — Your training, elevated.",
  description:
    "Harshal’s personal five-day training journal. Every set, a little stronger.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FORM" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f8f2",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(() => {
          let theme;
          try { theme = localStorage.getItem('form-theme'); } catch {}
          if (theme !== 'light' && theme !== 'dark') {
            theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          document.documentElement.dataset.theme = theme;
        })();` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
