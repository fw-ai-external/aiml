"use client";

import { useEffect, useState } from "react";

export default function Example() {
  // State for tracking the active box in the visualization
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const totalBoxes = 5;

  // // Animation timing control
  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveBoxIndex((prevIndex) => {
        // If we've completed the cycle, reset to -1 briefly before starting again
        if (prevIndex >= totalBoxes - 1) {
          return -1;
        }
        // Otherwise, move to the next box
        return prevIndex + 1;
      });
    }, 1500); // Change box every 1.5 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Helper function to determine the fill color for each box
  const getBoxStyles = (index: number) => {
    if (activeBoxIndex === -1) {
      // Reset state - all boxes are grey
      return {
        fill: "#f5f5f5",
        stroke: "#9ca3af",
      };
    }

    if (index === activeBoxIndex) {
      // Active box - purple
      return {
        fill: "#f3e8ff",
        stroke: "#9333ea",
      };
    } else if (index < activeBoxIndex) {
      // Completed box - green
      return {
        fill: "#f0fdf4",
        stroke: "#10b981",
      };
    } else {
      // Not yet active box - grey
      return {
        fill: "#f5f5f5",
        stroke: "#9ca3af",
      };
    }
  };

  return (
    <section id="example" className="py-24 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col space-y-12">
          <div className="space-y-6 ">
            <h2 className="text-4xl font-bold tracking-tight">
              <span className="text-[#501ac5]">/</span> Workflows
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl">
              AIML's runtime is State Graph based, allowing you to define
              complex workflows with conditional branching, merging, and
              orchestration... and visualize them with real-time results in the
              inspector!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="border-b px-4 py-3 bg-gray-50 flex justify-between items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-xs text-gray-500">AIML Prompt</div>
              </div>
              <div>
                <pre className="text-xs p-4 overflow-auto bg-white h-[350px]">
                  <code className="language-mdx">{`---
model: account/fireworks/model/deepseek-v3
---

{/* 
I can include a comment here that wont be sent to the LLM... USEFUL!
This will be used as a system prompt for th default model defined in the header 
*/}

You are a helpful assistant that can answer questions and help with tasks.
The user has made a request of you, just think outloud to yourself about how to respond.
Wrap your thoughts in 

{/* 
Then we get the actual response as a second llm call to a smaller, cheaper, faster model
*/}
<llm model="account/fireworks/model/qwen-2.5-32b">
    <instructions>
        {({lastElement}) => \`Your thoughts on the conversation so far... \${lastElement.output}\`}
        Based on your thoughts, respond to the users request.
    </instructions>
    <prompt>
        {({userInput}) => userInput.message}
    </prompt>
</llm>`}</code>
                </pre>
              </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="border-b px-4 py-3 bg-gray-50 flex justify-between items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-xs text-gray-500">
                  AIML Runtime Inspector
                </div>
              </div>
              <div className="p-4 h-[350px] flex items-center justify-center bg-white">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 600 350"
                  className="mx-auto"
                >
                  {/* Cloud Outline */}
                  <path
                    d="M235,80 C210,80 210,50 230,50 C230,20 260,20 275,40 C285,30 300,30 310,40 C325,25 350,30 355,50 C375,50 375,80 355,80 Z"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="2"
                  />
                  <text
                    x="290"
                    y="65"
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Your server / client
                  </text>

                  {/* Line from cloud to first node */}
                  <line
                    x1="210"
                    y1="80"
                    x2="70"
                    y2="145"
                    stroke={
                      activeBoxIndex > 0
                        ? getBoxStyles(1).stroke
                        : "transparent"
                    }
                    strokeWidth="2"
                    strokeDasharray={activeBoxIndex > 0 ? "5,5" : "0"}
                    strokeDashoffset={activeBoxIndex > 0 ? "10" : "0"}
                  />

                  {/* Connection circle */}
                  <circle
                    cx="220"
                    cy="76"
                    r="5"
                    fill={
                      activeBoxIndex > 0
                        ? getBoxStyles(1).stroke
                        : "transparent"
                    }
                  />

                  {/* Start node */}
                  <rect
                    x="10"
                    y="150"
                    width="120"
                    height="50"
                    rx="6"
                    fill={getBoxStyles(1).fill}
                    stroke={getBoxStyles(1).stroke}
                    strokeWidth="2"
                    className="transition-colors duration-300 ease-in-out"
                  />
                  <text
                    x="70"
                    y="178"
                    textAnchor="middle"
                    fill={getBoxStyles(1).stroke}
                    fontSize="12"
                    fontWeight="bold"
                    className="transition-colors duration-300 ease-in-out"
                  >
                    Incoming Request
                  </text>

                  <rect
                    x="160"
                    y="150"
                    width="120"
                    height="50"
                    rx="6"
                    fill={getBoxStyles(2).fill}
                    stroke={getBoxStyles(2).stroke}
                    strokeWidth="2"
                    className="transition-colors duration-300 ease-in-out"
                  />
                  <text
                    x="220"
                    y="178"
                    textAnchor="middle"
                    fill={getBoxStyles(2).stroke}
                    fontSize="12"
                    fontWeight="bold"
                    className="transition-colors duration-300 ease-in-out"
                  >
                    Think
                  </text>

                  {/* Answer node */}
                  <rect
                    x="310"
                    y="150"
                    width="120"
                    height="50"
                    rx="6"
                    fill={getBoxStyles(3).fill}
                    stroke={getBoxStyles(3).stroke}
                    strokeWidth="2"
                    className="transition-colors duration-300 ease-in-out"
                  />
                  <text
                    x="370"
                    y="178"
                    textAnchor="middle"
                    fill={getBoxStyles(3).stroke}
                    fontSize="12"
                    fontWeight="bold"
                    className="transition-colors duration-300 ease-in-out"
                  >
                    Answer
                  </text>

                  {/* Extract node */}
                  <rect
                    x="460"
                    y="150"
                    width="120"
                    height="50"
                    rx="6"
                    fill={getBoxStyles(4).fill}
                    stroke={getBoxStyles(4).stroke}
                    strokeWidth="2"
                    className="transition-colors duration-300 ease-in-out"
                  />
                  <text
                    x="520"
                    y="178"
                    textAnchor="middle"
                    fill={getBoxStyles(4).stroke}
                    fontSize="12"
                    fontWeight="bold"
                    className="transition-colors duration-300 ease-in-out"
                  >
                    Stream Response
                  </text>

                  {/* Line from respond to cloud node */}
                  <line
                    x1="370"
                    y1="70"
                    x2="520"
                    y2="145"
                    stroke={activeBoxIndex === 4 ? "#9333ea" : "transparent"}
                    strokeWidth="2"
                    strokeDasharray={activeBoxIndex === 4 ? "5,5" : "0"}
                    strokeDashoffset={activeBoxIndex === 4 ? "10" : "0"}
                  />

                  {/* Connection circle */}
                  <circle
                    cx="520"
                    cy="145"
                    r="5"
                    fill={activeBoxIndex === 4 ? "#9333ea" : "transparent"}
                  />

                  {/* Connecting lines */}
                  <line
                    x1="130"
                    y1="175"
                    x2="160"
                    y2="175"
                    stroke={activeBoxIndex >= 2 ? "#10b981" : "#9ca3af"}
                    strokeWidth="2"
                    className="transition-colors duration-300 ease-in-out"
                  />
                  <line
                    x1="280"
                    y1="175"
                    x2="310"
                    y2="175"
                    stroke={activeBoxIndex >= 3 ? "#10b981" : "#9ca3af"}
                    strokeWidth="2"
                    className="transition-colors duration-300 ease-in-out"
                  />
                  <line
                    x1="430"
                    y1="175"
                    x2="460"
                    y2="175"
                    stroke={activeBoxIndex >= 4 ? "#10b981" : "#9ca3af"}
                    strokeWidth="2"
                    className="transition-colors duration-300 ease-in-out"
                  />

                  {/* Status indicators */}
                  <circle
                    cx="130"
                    cy="175"
                    r="5"
                    fill={activeBoxIndex >= 2 ? "#10b981" : "#9ca3af"}
                    className="transition-colors duration-300 ease-in-out"
                  />
                  <circle
                    cx="280"
                    cy="175"
                    r="5"
                    fill={activeBoxIndex >= 3 ? "#10b981" : "#9ca3af"}
                    className="transition-colors duration-300 ease-in-out"
                  />
                  <circle
                    cx="430"
                    cy="175"
                    r="5"
                    fill={activeBoxIndex >= 4 ? "#10b981" : "#9ca3af"}
                    className="transition-colors duration-300 ease-in-out"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Simple control flow</h3>
              <p className="text-sm text-gray-600">
                Simple semantics for branching, chaining, merging, looping, and
                conditional execution. With no element being enforced. Just
                sending text? that will be intuited as a single LLM call and
                ran... only use elements you need when you need them.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Real-time streaming</h3>
              <p className="text-sm text-gray-600">
                Stream step completion events to users as they happen, or just
                wait and use results in the next step. You have complete control
                of how each step is executed and what data is returned.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">State & Context</h3>
              <p className="text-sm text-gray-600">
                <code className="text-xs text-green-400 bg-gray-800 rounded-md p-1">
                  {'<data field="name" type="string"/>'}
                </code>{" "}
                tags can be added to your prompt to define schemas and default
                values that can be updated by defining a{" "}
                <code className="text-xs text-green-400 bg-gray-800 rounded-md p-1">
                  {
                    '<assign field="name" value={({lastElement}) => lastElement.output}/>'
                  }
                </code>{" "}
                tag. The value will then be persisted by the runtime between
                requests.{" "}
                <a href="/docs/runtime/state" className="text-blue-500">
                  Learn more
                </a>
                tag.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
