import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AskWidget from "@/components/AskWidget";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

// Just for the wordmark -- a distinct classy serif from the body/heading
// font, at a weight where "All" and "Forecasts" read as one clean, evenly
// weighted mark rather than mono-bold "ll" dominating.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://allforecasts.com"),
  title: "AllForecasts — See what's coming, before it's official.",
  description:
    "A cross-domain forecasting platform: genuine lead-lag relationships between economic, health, and education data, turned into plain-language, falsifiable forecasts for countries, cities, businesses and people.",
  openGraph: {
    title: "AllForecasts",
    description: "See what's coming, before it's official.",
    url: "https://allforecasts.com",
    siteName: "AllForecasts",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://allforecasts.com/#organization",
      name: "AllForecasts",
      url: "https://allforecasts.com",
      logo: "https://allforecasts.com/icon",
    },
    {
      "@type": "WebSite",
      "@id": "https://allforecasts.com/#website",
      name: "AllForecasts",
      url: "https://allforecasts.com",
      publisher: { "@id": "https://allforecasts.com/#organization" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plexMono.variable} ${fraunces.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <Header />
        {children}
        <Footer />
        <AskWidget />
      </body>
    </html>
  );
}
