import type { Metadata } from "next";
import { PwaRegister } from "./components/PwaRegister";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Renote AI",
    template: "%s | Renote AI"
  },
  description:
    "あなたの言葉を、そのまま、もっと伝わる文章へ。自分の文章を育てるAIライティングアシスタント",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Renote AI",
    description:
      "あなたの言葉を、そのまま、もっと伝わる文章へ。AIに書かせるのではなく、自分の文章を育てるサービス。",
    url: siteUrl,
    siteName: "Renote AI",
    locale: "ja_JP",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Renote AI",
    description: "あなたの言葉を、そのまま、もっと伝わる文章へ。"
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
    name: "Renote AI",
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
        {children}
        <PwaRegister />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
