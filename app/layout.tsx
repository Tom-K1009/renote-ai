import type { Metadata } from "next";
import { PwaRegister } from "./components/PwaRegister";
import { BetaBadge, SiteFooter } from "./components/SiteFooter";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const brandDescription =
  "TSUMUGUは、AIが文章を代わりに書くサービスではありません。ユーザー自身の言葉を大切にしながら、自然で伝わりやすい文章へ整え、文章を書く力を育てるAIライティングアシスタントです。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TSUMUGU",
    template: "%s | TSUMUGU"
  },
  description: brandDescription,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "TSUMUGU | あなたの言葉を、そのまま、もっと伝わる文章へ。",
    description: brandDescription,
    url: siteUrl,
    siteName: "TSUMUGU",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "TSUMUGU"
      }
    ],
    locale: "ja_JP",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "TSUMUGU | あなたの言葉を、そのまま、もっと伝わる文章へ。",
    description: brandDescription,
    images: ["/opengraph-image"]
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TSUMUGU",
    description: brandDescription,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "500",
      priceCurrency: "JPY"
    }
  };

  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <BetaBadge />
        {children}
        <SiteFooter />
        <PwaRegister />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
