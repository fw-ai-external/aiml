import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";

import "./globals.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        // you can use Tailwind CSS too
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
