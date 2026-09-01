import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El dev server se abre desde el celular por IP de LAN.
  allowedDevOrigins: ["192.168.18.4"],
  // Fija la raíz del watcher al proyecto. Sin esto, en D:\ el watcher
  // escanea la raíz del disco (pagefile.sys, System Volume Information…)
  // y dispara full-reloads que borran lo que estás tipeando.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "wger.de" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
