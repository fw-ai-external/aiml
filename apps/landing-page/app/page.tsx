import Header from "@/components/header";
import Hero from "@/components/hero";
import ProductTeams from "@/components/product-teams";
import Features from "@/components/features";
import Example from "@/components/example";
import Debugging from "@/components/debugging";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-emerald-50 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
        <div
          className="absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
          aria-hidden="true"
        >
          <div
            className="aspect-577/310 w-[36.0625rem] bg-linear-to-r from-[#ff80b5] to-[#9089fc] opacity-30"
            style={{
              clipPath:
                "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
            }}
          ></div>
        </div>
        <div
          className="absolute top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
          aria-hidden="true"
        >
          <div
            className="aspect-577/310 w-[36.0625rem] bg-linear-to-r from-[#ff80b5] to-[#9089fc] opacity-30"
            style={{
              clipPath:
                "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
            }}
          ></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm/6 text-gray-900">
            <strong className="font-semibold">Alpha Preview</strong>
            <svg
              viewBox="0 0 2 2"
              className="mx-2 inline size-0.5 fill-current"
              aria-hidden="true"
            >
              <circle cx="1" cy="1" r="1" />
            </svg>
            Please note that AIML is not yet ready for production use.{" "}
            <a
              href="https://github.com/fw-ai-external/aiml/issues"
              target="_blank"
              className="text-emerald-500 font-bold underline"
            >
              Please report all issues or feedback.
            </a>
          </p>
        </div>
        <div className="flex flex-1 justify-end"></div>
      </div>
      <Header />
      <main className="flex-grow">
        <Hero />
        <ProductTeams />
        <Example />
        <Features />
        <Debugging />
      </main>
      <Footer />
    </div>
  );
}
