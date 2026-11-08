import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PIGTOGRAM CONTROL — Digitální velín",
    template: "%s · PIGTOGRAM CONTROL",
  },
  description:
    "Osobní digitální velín. Projekty, infrastruktura a AI operátor v bezpečném DEMO režimu.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111216",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
