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
              href="/docs/examples/simple-chat"
              className="inline-flex items-center text-emerald-600 font-medium hover:text-emerald-700"
            >
              Check out some examples <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white rounded-xl p-8 shadow-sm border relative group hover:shadow-md transition-shadow">
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
            <div className="mb-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="mr-1">DEVELOPER EXPERIENCE</span>
            </div>
            <h3 className="text-2xl font-semibold mb-2">
              OpenAI Chat API compatible
            </h3>
            <p className="text-gray-600 mb-8">
              Just send your AIML based prompts to
              <Link href="/docs/using-with-fireworks">Fireworks API</Link>
              or another AIML Runtime server via the OpenAI Chat compatible API
              as your "system" message. It's that simple! You can also self host
              a server yourself! You can also{" "}
              <Link href="/docs/deploy-an-aiml-server">
                self host a server
              </Link>{" "}
              yourself!
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border relative group hover:shadow-md transition-shadow">
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
