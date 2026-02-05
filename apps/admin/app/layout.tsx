import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

const assistant = Assistant({ subsets: ["hebrew", "latin"], weight: ["400", "600", "700"] });

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
      <body className={assistant.className}>{children}</body>
    </html>
  );
}
