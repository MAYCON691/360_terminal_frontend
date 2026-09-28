import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "360 Terminal",
  description: "Descubre la terminal desde otro ángulo",
  icons: {
    icon: "/icono.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}