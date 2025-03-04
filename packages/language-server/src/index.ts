#!/usr/bin/env node

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import process from "node:process";
import { createUnifiedLanguageServer } from "./vendor/unified-language-server";

process.title = "aiml-language-server";

// Create a unified processor for MDX
// Same as parser package
const aimlProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMdxFrontmatter, { name: "frontmatter" })
  .use(remarkMdx);

createUnifiedLanguageServer({
  configurationSection: "aiml",
  defaultProcessor: aimlProcessor,
  ignoreName: ".aimlignore",
  packageField: "aimlConfig",
  pluginPrefix: "aiml",
  processorName: "aiml",
  processorSpecifier: "aiml",
  rcName: ".aimlrc",
});
