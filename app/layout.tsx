import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { Layout } from "@/components/Layout";

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

export const metadata: Metadata = {
  title: "First Baptist Church | Pinedale, Wyoming",
  description: "A welcoming Bible-centered church family in Pinedale, Wyoming. Join us for worship, fellowship, and growing in faith together. Pastor Ted York and Pastor Heath Holmes.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "First Baptist Church Pinedale",
    description: "A warm, welcoming church in the heart of Wyoming. Sunday worship, youth ministry, prayer, and community.",
    images: [{ url: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200&q=80" }],
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
          <Layout>
            {children}
          </Layout>
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
