import Link from "next/link";
import { Github } from "lucide-react";
import Discord from "./icons/discord";

export default function Footer() {
  return (
    <footer className="border-t py-12">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/mark.svg" alt="Fireworks AI" width={32} height={32} />
              <span className="font-bold text-xl">AIML</span>
            </div>
            <p className="text-sm text-gray-600">
              Build AI agent workflows with just a prompt.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm text-gray-900">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/docs"
                  className="text-sm text-gray-600 hover:text-emerald-500"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/elements"
                  className="text-sm text-gray-600 hover:text-emerald-500"
                >
                  API Reference
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm text-gray-900">
              Community
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="https://github.com/fw-ai-external/aiml"
                  className="text-sm text-gray-600 hover:text-emerald-500"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="https://discord.com/channels/1137072072808472616/1371878063079428176"
                  className="text-sm text-gray-600 hover:text-emerald-500"
                  target="_blank"
                >
                  Discord
                </Link>
              </li>
              <li>
                <Link
                  href="https://x.com/AIML_lang"
                  target="_blank"
                  className="text-sm text-gray-600 hover:text-emerald-500"
                >
                  X
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm text-gray-900">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="https://github.com/fw-ai-external/aiml/blob/main/LICENSE.md"
                  className="text-sm text-gray-600 hover:text-emerald-500"
                >
                  License
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Fireworks AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/fw-ai-external/aiml"
              target="_blank"
              className="text-gray-600 hover:text-emerald-500"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link
              href="https://discord.gg/fireworks"
              target="_blank"
              className="text-gray-600 hover:text-emerald-500"
            >
              <Discord className="h-5 w-5" />
              <span className="sr-only">Discord</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
