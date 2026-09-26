import type { Metadata, Viewport } from "next";
import { Geist_Mono, Nunito_Sans } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { SupperProvider } from "@/components/supper-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { APPEARANCE_BOOTSTRAP_SCRIPT } from "@/lib/appearance";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/config";
import {
  BRAND_FAVICON_SRC,
  BRAND_ICON_180_SRC,
  BRAND_ICON_192_SRC,
  BRAND_ICON_512_SRC,
  THEME_PRIMARY,
} from "@/lib/theme";
import "./globals.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_TAGLINE,
  applicationName: PRODUCT_NAME,
  appleWebApp: {
    capable: true,
    title: PRODUCT_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: BRAND_FAVICON_SRC, sizes: "48x48" },
      { url: BRAND_ICON_192_SRC, sizes: "192x192", type: "image/png" },
      { url: BRAND_ICON_512_SRC, sizes: "512x512", type: "image/png" },
    ],
    shortcut: BRAND_ICON_192_SRC,
    apple: [{ url: BRAND_ICON_180_SRC, sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: THEME_PRIMARY,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nunito.variable} ${geistMono.variable} h-full bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background">
        <ThemeProvider>
          <SupperProvider>
            {children}
            <PwaRegister />
          </SupperProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
