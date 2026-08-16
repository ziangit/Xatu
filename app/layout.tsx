import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { LangProvider } from "./i18n/provider";
import { readLocale } from "./i18n/server";
import { htmlLang, translate } from "./i18n/translate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the landing page headline/wordmark only.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

// Crawlers send no cookie, so share cards and search results are always the
// English title. That is the right default, and the reason not to invest
// further here.
export async function generateMetadata(): Promise<Metadata> {
  const lang = await readLocale();
  return {
    title: translate(lang, "xatu — see turn one coming"),
    description: translate(
      lang,
      "Turn matchup notes into a turn-by-turn map for Pokémon doubles: which four you bring, who leads, and what happens next.",
    ),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await readLocale();
  return (
    <html
      lang={htmlLang(lang)}
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider initial={lang}>{children}</LangProvider>
        <Analytics />
      </body>
    </html>
  );
}
