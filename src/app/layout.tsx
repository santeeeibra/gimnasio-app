import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Inter,
  Space_Grotesk,
  Geist,
  Fraunces,
} from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestión de gimnasio",
  description: "Cuotas, rutinas y avisos en un solo lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${inter.variable} ${spaceGrotesk.variable} ${geist.variable} ${fraunces.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
