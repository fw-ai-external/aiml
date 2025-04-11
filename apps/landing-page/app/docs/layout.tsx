import "./globals.css";
import { RootProvider } from "fumadocs-ui/provider";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootProvider>{children}</RootProvider>;
}
