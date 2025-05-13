import type { ReactNode } from "react";
import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIML - Agentic Intelligence Made Easy",
  description:
    "AIML is a language specification and runtime for building agentic workflows.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID && (
        <GoogleTagManager
          gtmId={process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID!}
        />
      )}

      <body
        // you can use Tailwind CSS too
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
