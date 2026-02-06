import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rushingbot Admin",
  description: "Agent console and bot training"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he">
      <body>{children}</body>
    </html>
  );
}
