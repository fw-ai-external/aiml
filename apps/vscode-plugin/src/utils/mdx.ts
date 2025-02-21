import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";
import matter from "gray-matter";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";

// Add type declarations for modules
declare module "remark-rehype" {
  const remarkRehype: any;
  export default remarkRehype;
}

declare module "rehype-stringify" {
  const rehypeStringify: any;
  export default rehypeStringify;
}

declare module "rehype-sanitize" {
  const rehypeSanitize: any;
  export default rehypeSanitize;
}

declare module "gray-matter" {
  function matter(input: string): {
    data: Record<string, unknown>;
    content: string;
  };
  export default matter;
}

// Types
type MDXProcessingResult = {
  content: string;
  metadata: Record<string, unknown>;
  error?: Error;
};

type MDXNode = {
  type: string;
  value?: string;
  children?: MDXNode[];
  tagName?: string;
  properties?: Record<string, unknown>;
  name?: string;
};

// Utility Functions
const isNodeType = (node: unknown, type: string): node is MDXNode => {
  return Boolean(
    node &&
      typeof node === "object" &&
      node !== null &&
      "type" in node &&
      (node as { type: string }).type === type
  );
};

const hasChildren = (node: unknown): node is { children: unknown[] } => {
  return Boolean(
    node &&
      typeof node === "object" &&
      node !== null &&
      "children" in node &&
      Array.isArray((node as { children: unknown[] }).children)
  );
};

const safeHasProperty = (node: unknown, prop: string): boolean => {
  return Boolean(
    node && typeof node === "object" && node !== null && prop in node
  );
};

// Enhanced HTML PreProcessor
const htmlPreProcessor = (content: string): string => {
  try {
    // Handle markdown-specific issues
    let processedContent = content
      .replace(/```([^`\n]+)```/g, "<codeblock>$1</codeblock>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<link href="$2">$1</link>');

    // Convert HTML-style tags to XML
    processedContent = processedContent
      .replace(/<(\w+)([^>]*)\/>/g, "<$1$2></$1>")
      .replace(/<video([^>]*)>/g, "<video-container$1>")
      .replace(/<\/video>/g, "</video-container>")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "<removed-script />")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "<removed-style />");

    return processedContent;
  } catch (error) {
    console.error("Error in htmlPreProcessor:", error);
    return content;
  }
};

// Custom MDX Node Handler
const handleMDXNodes: Plugin = () => {
  return (tree) => {
    visit(tree, (node: MDXNode) => {
      if (node.type === "mdxjsEsm" || node.type === "mdxFlowExpression") {
        node.type = "element";
        node.tagName = "mdx-expression";
        node.properties = { type: node.type };
        node.children = [{ type: "text", value: node.value || "" }];
      } else if (
        node.type === "mdxJsxFlowElement" ||
        node.type === "mdxJsxTextElement"
      ) {
        node.type = "element";
        node.tagName = "mdx-component";
        node.properties = { name: node.name };
      }
    });
  };
};

// Main MDX to XML Converter
export function convertMDXtoXML(content: string): MDXProcessingResult {
  try {
    // Step 1: Preprocess content
    const cleanedContent = htmlPreProcessor(content);

    // Step 2: Extract frontmatter
    const { data: metadata, content: mdxContent } = matter(cleanedContent);

    // Step 3: Configure processor
    const processor = unified()
      .use(remarkParse)
      .use(remarkMdx)
      .use(handleMDXNodes)
      .use(remarkRehype, {
        allowDangerousHtml: true,
        handlers: {
          // Custom handlers for MDX-specific nodes
          mdxJsxFlowElement: (h: any, node: MDXNode) => {
            return h(node, "mdx-component", { name: node.name });
          },
          mdxFlowExpression: (h: any, node: MDXNode) => {
            return h(node, "mdx-expression", { value: node.value });
          },
        },
      })
      .use(rehypeSanitize)
      .use(rehypeStringify, {
        closeSelfClosing: true,
        closeEmptyElements: true,
      });

    // Step 4: Process content
    const result = processor.processSync(mdxContent);

    // Step 5: Convert to XML format
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<mdx-document>
  <metadata>
    ${Object.entries(metadata)
      .map(([key, value]) => `<${key}>${String(value)}</${key}>`)
      .join("\n    ")}
  </metadata>
  <content>
    ${String(result)}
  </content>
</mdx-document>`;

    return {
      content: xmlContent,
      metadata,
    };
  } catch (error) {
    console.error("Error converting MDX to XML:", error);
    return {
      content: "",
      metadata: {},
      error:
        error instanceof Error ? error : new Error("Unknown error occurred"),
    };
  }
}

// Export utility functions
export { htmlPreProcessor, isNodeType, hasChildren, safeHasProperty };
