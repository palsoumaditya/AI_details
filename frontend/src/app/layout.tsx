import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/app-layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneAtlas — AI Model Discovery & Intelligence Platform",
  description:
    "Discover, understand and compare AI models across leading research labs and inference providers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
