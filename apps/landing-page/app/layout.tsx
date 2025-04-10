import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIML - Agentic Intelligence Made Easy",
  description:
    "AIML is a language specification and runtime for building agentic workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
