import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FCSG Tippspiel",
  description:
    "Tippe die Spiele des FC St. Gallen, verfolge den Live-Ticker und kämpfe um den ersten Platz in der Rangliste.",
  openGraph: {
    title: "FCSG Tippspiel",
    description: "Tippen. Mitfiebern. Gewinnen.",
    type: "website",
    locale: "de_CH",
  },
  twitter: {
    card: "summary_large_image",
    title: "FCSG Tippspiel",
    description: "Tippen. Mitfiebern. Gewinnen.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${geistSans.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}