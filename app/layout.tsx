import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { I18nProvider } from "@/lib/i18n/use-i18n";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ignition AI - Intelligence Artificielle & Automatisation",
  description: "Transformez votre entreprise avec l'IA. Solutions d'automatisation, chatbots intelligents, et analyses prédictives pour propulser votre croissance.",
  keywords: ["IA", "Intelligence Artificielle", "Automatisation", "Chatbot", "Machine Learning", "Data Science"],
  authors: [{ name: "Ignition AI" }],
  icons: {
    icon: '/ignition_flame.gif',
    apple: '/ignition_flame.gif',
  },
  openGraph: {
    title: "Ignition AI - Intelligence Artificielle & Automatisation",
    description: "Transformez votre entreprise avec l'IA",
    type: "website",
    images: [{ url: '/ignition_flame.gif', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
