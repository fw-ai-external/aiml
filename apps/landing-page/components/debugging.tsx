import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Debugging() {
  return (
    <section className="py-24 overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row gap-12 items-start">
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-4xl font-bold tracking-tight">
              <span className="text-[#501ac5]">/</span> Debugging
            </h2>

            <p className="text-xl text-gray-600 max-w-xl">
              Powerful debugging tools online or within your IDE
            </p>

            <div className="space-y-6 mt-6">
              <p className="text-gray-600">
                While AIML is as flexible and easy as a prompt, it's also as
                deterministic as code. You're in complete control with full
                visibility into every step of your agent's workflow.
              </p>

              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                  <span className="text-gray-600">
                    <strong className="text-gray-900">Real-time tracing</strong>{" "}
                    – Visualize each step of your agent's execution with
                    detailed logs and state snapshots.
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                  <span className="text-gray-600">
                    <strong className="text-gray-900">IDE integration</strong> –
                    Debug your AIML workflows directly in VS Code or your
                    favorite IDE with our extension.
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                  <span className="text-gray-600">
                    <strong className="text-gray-900">
                      Time travel debugging
                    </strong>{" "}
                    – Step through your agent's execution history to pinpoint
                    issues and optimize performance.
                  </span>
                </li>
              </ul>

              <Link
                href="#"
                className="inline-flex items-center text-emerald-600 font-medium hover:text-emerald-700"
              >
                Explore debugging tools <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="md:w-1/2 relative">
            <div
              className="w-full h-[500px] bg-white rounded-lg border shadow-lg overflow-hidden"
              style={{
                transform:
                  "translateX(2%) scale(1.2) rotateX(47deg) rotateY(31deg) rotate(324deg)",
                transformOrigin: "center center",
                perspective: "1000px",
              }}
            >
              <div className="border-b px-4 py-3 bg-gray-50 flex justify-between items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-xs text-gray-500">AIML Debugger</div>
              </div>

              <div className="p-4 bg-gray-50 h-full">
                <div className="flex gap-4 h-full">
                  <div className="w-1/3 bg-white rounded border h-full p-3">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      WORKFLOW STEPS
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div className="text-xs">Initialize</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div className="text-xs">Parse Query</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div className="text-xs font-medium">Search Web</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                        <div className="text-xs text-gray-400">Summarize</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                        <div className="text-xs text-gray-400">
                          Generate Response
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-2/3 bg-white rounded border h-full p-3">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      EXECUTION DETAILS
                    </div>
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-100 rounded p-2">
                        <div className="text-xs font-medium text-blue-700 mb-1">
                          Search Web
                        </div>
                        <div className="text-xs text-gray-600">
                          Searching for: "Latest advancements in LLMs"
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Started: 10:42:15 AM
                        </div>
                      </div>

                      <div className="bg-gray-50 border rounded p-2">
                        <div className="text-xs font-medium mb-1">
                          Variables
                        </div>
                        <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                          {`{
  "query": "Latest advancements in LLMs",
  "searchResults": [
    {
      "title": "GPT-5: What We Know So Far",
      "url": "https://example.com/gpt5",
      "snippet": "The upcoming GPT-5 model is expected to..."
    },
    {
      "title": "Advances in Multimodal LLMs",
      "url": "https://example.com/multimodal",
      "snippet": "Recent research has shown significant..."
    }
  ]
}`}
                        </pre>
                      </div>

                      <div className="bg-gray-50 border rounded p-2">
                        <div className="text-xs font-medium mb-1">Console</div>
                        <div className="font-mono text-xs text-gray-600">
                          <div>[10:42:15] Starting search operation</div>
                          <div>[10:42:16] Fetching results from API</div>
                          <div className="text-[#501ac5]">
                            [10:42:17] Received 5 results
                          </div>
                          <div>[10:42:17] Filtering relevant information</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -bottom-6 -right-6 w-64 h-64 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-full opacity-30 blur-3xl -z-10"></div>
            <div className="absolute -top-6 -left-6 w-48 h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-30 blur-3xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
