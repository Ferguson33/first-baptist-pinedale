import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#1a365d",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "First Baptist Church | Pinedale, Wyoming",
  description: "A welcoming Bible-centered church family in Pinedale, Wyoming. Join us for worship, fellowship, and growing in faith together. Pastor Ted York and Pastor Heath Holmes.",
  applicationName: "FBC Pinedale",
  appleWebApp: {
    capable: true,
    title: "FBC Pinedale",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "First Baptist Church Pinedale",
    description: "A warm, welcoming church in the heart of Wyoming. Sunday worship, youth ministry, prayer, and community.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "First Baptist Church - Pinedale, Wyoming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "First Baptist Church Pinedale",
    description: "A warm, welcoming church in the heart of Wyoming. Sunday worship, youth ministry, prayer, and community.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-[var(--color-warm-white)] antialiased">
        <AuthProvider>
          <ErrorBoundary>
            <Layout>
              {children}
            </Layout>
          </ErrorBoundary>
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
