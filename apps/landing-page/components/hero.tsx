import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="pt-32 pb-24 md:pt-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-8">
          {
            <div className="inline-flex items-center rounded-full border border-[#501ac5] bg-[#d5cfe8] px-3 py-1 text-md font-medium text-[#705ba5]">
              Brought to you by the experts at{" "}
              <a
                href="https://fireworks.ai"
                target="_blank"
                className="ml-2 text-[#501ac5] font-bold"
              >
                Fireworks AI
              </a>
            </div>
          }

          <div className="space-y-4">
            <h1 className="px-2 text-4xl tracking-tighter text-balance max-lg:font-medium max-sm:px-4 sm:text-3xl lg:text-4xl xl:text-6xl">
              Build production-ready agents & AI workflows with nothing but
              prompting
            </h1>
          </div>

          <p className="text-lg text-gray-600 max-w-2xl">
            Making the promise of "text as code" a reality with the AIML Agent
            Runtime!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors"
              asChild
            >
              <Link href="/docs">
                View the Docs <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              View on GitHub
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
