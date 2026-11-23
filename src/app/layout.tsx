import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0C121E" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://laxpixel.com'),
  title: "Lax Pixel — Luxury Redefined",
  description: "Exclusive curated luxury ecommerce. Timeless elegance, authentic collections, and seamless shopping experience across Bangladesh.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/White mood.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Lax Pixel — Luxury Redefined",
    description: "Exclusive curated luxury ecommerce. Timeless elegance, authentic collections, and seamless shopping experience across Bangladesh.",
    url: "https://laxpixel.com",
    siteName: "Lax Pixel",
    images: [
      {
        url: "/White mood.png",
        width: 800,
        height: 600,
        alt: "Lax Pixel Luxury Ecommerce",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lax Pixel — Luxury Redefined",
    description: "Exclusive curated luxury ecommerce. Timeless elegance, authentic collections, and seamless shopping experience across Bangladesh.",
    images: ["/White mood.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
