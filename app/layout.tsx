import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plexMono.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
