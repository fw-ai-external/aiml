import { Layers, Zap, Globe, Code } from "lucide-react";

export default function Features() {
  return (
    <section id="features" className="py-20">
      <div className="container px-4 md:px-6">
        <div className="space-y-6 mb-12">
          <h2 className="text-4xl font-bold tracking-tight">
            <span className="text-[#501ac5]">/</span> Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl">
            Lightweight, optimized, and language agnostic framework designed to
            simplify AI agent development.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <Layers className="h-4 w-4 text-emerald-700" />
              </div>
              <h3 className="text-lg font-semibold">
                Lightweight Architecture
              </h3>
              <p className="text-sm text-gray-600">
                Lives just above the inference layer with flows defined directly
                in the system prompt.
              </p>
            </div>

            <div className="space-y-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <Zap className="h-4 w-4 text-emerald-700" />
              </div>
              <h3 className="text-lg font-semibold">
                Dramatic Latency Reduction
              </h3>
              <p className="text-sm text-gray-600">
                Achieve single-digit latency compared to 120ms+ per step typical
                in other frameworks.
              </p>
            </div>

            <div className="space-y-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <Globe className="h-4 w-4 text-emerald-700" />
              </div>
              <h3 className="text-lg font-semibold">Language Agnostic</h3>
              <p className="text-sm text-gray-600">
                Works across language ecosystems, removing AI/product team
                bottlenecks.
              </p>
            </div>

            <div className="space-y-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <Code className="h-4 w-4 text-emerald-700" />
              </div>
              <h3 className="text-lg font-semibold">Simplicity at its Core</h3>
              <p className="text-sm text-gray-600">
                While it's a full agentic framework, it's ultimately just a
                prompt that works with any SDK.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-4">Why Choose AIML?</h3>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="#047857"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">
                  We've heard consistent feedback that frameworks like LangChain
                  can be over-engineered with disconnected abstractions.
                </span>
              </li>
              <li className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="#047857"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">
                  Our approach enables automatic prompt optimization and
                  eventually self-fine-tuning models.
                </span>
              </li>
              <li className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="#047857"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">
                  Our solution's API is just a prompt, so it works across
                  language ecosystems.
                </span>
              </li>
              <li className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="#047857"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">
                  By hosting directly next to models, we achieve single-digit
                  latency compared to 120ms+ per step.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
