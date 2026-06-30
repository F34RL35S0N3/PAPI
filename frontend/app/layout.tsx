import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PasarPintar AI - Asisten UMKM Solo Raya",
  description:
    "Asisten kecerdasan buatan dan dashboard analitik untuk pedagang UMKM Solo Raya. Pantau harga pasar, dapatkan rekomendasi jual, dan tingkatkan bisnis Anda dengan AI.",
  keywords: [
    "PasarPintar",
    "UMKM",
    "Solo Raya",
    "AI",
    "harga pasar",
    "batik",
    "SDG 8",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
