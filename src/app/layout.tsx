import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Inter,
  Space_Grotesk,
  Geist,
  Fraunces,
  DM_Sans,
  Manrope,
  Archivo,
  Sora,
  Plus_Jakarta_Sans,
  Orbitron,
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

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestión de gimnasio",
  description: "Cuotas, rutinas y avisos en un solo lugar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Mi gimnasio" },
};

export const viewport: Viewport = {
  themeColor: "#16181d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${inter.variable} ${spaceGrotesk.variable} ${geist.variable} ${fraunces.variable} ${dmSans.variable} ${manrope.variable} ${archivo.variable} ${sora.variable} ${plusJakarta.variable} ${orbitron.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
