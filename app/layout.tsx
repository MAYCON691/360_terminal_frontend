import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "360 Terminal",
  description: "Descubre la terminal desde otro anguloS",
  icons: {
    icon: "/icono.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}