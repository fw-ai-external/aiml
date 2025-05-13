"use client";

import { Layout } from "@/components/layout";
import "./globals.css";
import { GoogleTagManager } from "@next/third-parties/google";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-XYZGTM-M38TSS9H" />

      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
