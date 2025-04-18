"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github, Menu, X } from "lucide-react";
import Discord from "@/components/icons/discord";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="border-b sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <img src="/mark.svg" alt="AIML Logo" className="w-8 h-8" />
            <span className="font-bold text-xl">AIML</span>
          </Link>
        </div>

        {/* Right-aligned navigation and actions */}
        <div className="flex items-center gap-4">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/docs"
              className="text-sm font-medium text-gray-600 hover:text-emerald-500 transition-colors"
            >
              Docs
            </Link>
            <Link
              href="https://discord.gg/fireworks"
              target="_blank"
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-emerald-500 transition-colors"
            >
              <Discord className="h-4 w-4" />
              Join our Discord
            </Link>
          </nav>

          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors"
            asChild
          >
            <Link
              href="https://github.com/fw-ai-external/aiml"
              target="_blank"
              className="flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              View on Github
            </Link>
          </Button>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-emerald-500 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t py-4 px-4 shadow-md">
          <nav className="flex flex-col gap-4">
            <Link
              href="/docs"
              className="text-lg font-medium hover:text-emerald-500 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="https://discord.gg/fireworks"
              target="_blank"
              className="flex items-center gap-2 text-lg font-medium hover:text-emerald-500 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Discord className="h-5 w-5" />
              Join our Discord
            </Link>
            <Link
              href="https://github.com/fw-ai-external/aiml"
              target="_blank"
              className="flex items-center gap-2 text-gray-700 hover:text-emerald-500 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Github className="h-5 w-5" />
              <span>GitHub</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
