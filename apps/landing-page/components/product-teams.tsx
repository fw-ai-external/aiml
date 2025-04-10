import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

export default function ProductTeams() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-5xl font-bold tracking-tight mb-6">
              <span className="text-[#501ac5]">/</span> Built for developers
              <br />
              who want to get stuff done!
            </h2>
          </div>

          <div className="space-y-6">
            <p className="text-lg text-gray-600">
              AIML allows you to easily build reliable, deterministic agents and
              workflows without having to learn a new framework or constantly
              bounce between code and natural language prompts. This also allows
              AI experts and non-experts to collaborate more effectively.
            </p>
            <Link
              href="#"
              className="inline-flex items-center text-emerald-600 font-medium hover:text-emerald-700"
            >
              Check out some examples <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white rounded-xl p-8 shadow-sm border relative group hover:shadow-md transition-shadow">
            <div className="h-48  flex items-center justify-center">
              <svg
                width="160"
                height="120"
                viewBox="0 0 160 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="20"
                  y="10"
                  width="100"
                  height="70"
                  rx="8"
                  fill="#f0fdf4"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <rect
                  x="30"
                  y="20"
                  width="100"
                  height="70"
                  rx="8"
                  fill="#f0fdf4"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <rect
                  x="40"
                  y="30"
                  width="100"
                  height="70"
                  rx="8"
                  fill="#f0fdf4"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <circle
                  cx="90"
                  cy="65"
                  r="20"
                  fill="#10b981"
                  fillOpacity="0.2"
                  stroke="#10b981"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="mb-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="mr-1">NO FRAMEWORK LOCK-IN</span>
            </div>

            <h3 className="text-2xl font-semibold mb-2">
              It's just Markdown with XML tags — Like you're used to!
            </h3>
            <p className="text-gray-600 mb-8">
              The AIML language is designed to be simple and easy to understand.
              It's just Markdown with some special XML tags that provide
              deterministic, reliable multi-step actions and tools to any LLM.
              (and yes, JSX syntax is supported too!)
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border relative group hover:shadow-md transition-shadow">
            <div className="h-48 flex items-center justify-center">
              <svg
                width="160"
                height="120"
                viewBox="0 0 160 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20 60 H140" stroke="#e5e7eb" strokeWidth="2" />
                <path d="M30 40 L130 40" stroke="#e5e7eb" strokeWidth="2" />
                <path d="M30 80 L130 80" stroke="#e5e7eb" strokeWidth="2" />
                <rect
                  x="50"
                  y="50"
                  width="60"
                  height="20"
                  rx="4"
                  fill="#10b981"
                  fillOpacity="0.2"
                />
                <text
                  x="80"
                  y="65"
                  textAnchor="middle"
                  fill="#10b981"
                  fontWeight="bold"
                  fontSize="12"
                >
                  5ms
                </text>
              </svg>
            </div>
            <div className="mb-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="mr-1">DEVELOPER EXPERIENCE</span>
            </div>
            <h3 className="text-2xl font-semibold mb-2">
              OpenAI Chat and Responses API compatible
            </h3>
            <p className="text-gray-600 mb-8">
              Just send your AIML based prompts to your self deployed or
              cloud-based AIML Runtime server using the OpenAI Chat or Responses
              compatible API as your "developer" or "system" message. It's that
              simple!
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border relative group hover:shadow-md transition-shadow">
            <div className="h-48 flex items-center justify-center">
              <svg
                width="160"
                height="120"
                viewBox="0 0 160 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M40 80 L80 40 L120 80"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="80" cy="40" r="5" fill="#10b981" />
                <circle cx="40" cy="80" r="5" fill="#10b981" />
                <circle cx="120" cy="80" r="5" fill="#10b981" />
                <text
                  x="80"
                  y="65"
                  textAnchor="middle"
                  fill="#10b981"
                  fontWeight="bold"
                  fontSize="14"
                >
                  Create
                </text>
              </svg>
            </div>
            <div className="mb-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="mr-1">CODE WHEN YOU WANT IT</span>
            </div>
            <h3 className="text-2xl font-semibold mb-2">
              Still want to use code? No problem!
            </h3>
            <p className="text-gray-600 mb-8">
              The AIML Runtime supports exicuting Javascript, or Python code
              inside script tags within your prompt within a secure sandboxed
              environment.
            </p>
            <button className="absolute bottom-8 right-8 w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
              <Plus className="h-5 w-5 text-gray-500 group-hover:text-emerald-600" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
