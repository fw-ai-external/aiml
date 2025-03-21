#!/usr/bin/env node

import process from 'node:process';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { createUnifiedLanguageServer } from './vendor/unified-language-server';

process.title = 'aiml-language-server';

// Create a unified processor for MDX
// Same as parser package
const aimlProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMdxFrontmatter, { name: 'frontmatter' })
  .use(remarkMdx);

createUnifiedLanguageServer({
  configurationSection: 'aiml',
  defaultProcessor: aimlProcessor,
  ignoreName: '.aimlignore',
  packageField: 'aimlConfig',
  pluginPrefix: 'aiml',
  processorName: 'aiml',
  processorSpecifier: 'aiml',
  rcName: '.aimlrc',
});
