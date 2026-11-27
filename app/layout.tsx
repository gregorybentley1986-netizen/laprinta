import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/lib/site";
import "./styles/tokens.css";
import "./styles/base.css";

// Файлы IBM Plex Sans (400/500/600) лежат в репозитории: сборка не должна
// зависеть от доступа к Google Fonts, который из России нестабилен.
const plex = localFont({
  src: [
    { path: "./fonts/plex-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/plex-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/plex-600.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
});

const raleway = localFont({
  src: "./fonts/Raleway-Variable.ttf",
  weight: "500 700",
  variable: "--font-raleway",
  display: "swap",
});

const arista = localFont({
  src: "./fonts/AristaPro-SemiBold.ttf",
  weight: "600",
  variable: "--font-arista",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "laprinta — изделия аддитивного производства", template: "%s · laprinta" },
  description: `${site.positioning}. Каталог готовых изделий: поплавки и другие товары из пластика и ТПУ.`,
  applicationName: "laprinta",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "laprinta",
    images: [{ url: "/brand/og-farm.jpg", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07090c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${plex.variable} ${raleway.variable} ${arista.variable}`}>
      <body>{children}</body>
    </html>
  );
}
