import type { Metadata } from "next";
import localFont from "next/font/local";

import { Providers } from "@/app/providers";
import { getThemeBootScript } from "@/lib/themeBootScript";
import { cn } from "@/lib/utils";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "Personal financial dashboard with Plaid and AI insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(geistSans.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeBootScript() }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
