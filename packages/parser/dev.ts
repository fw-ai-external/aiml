// dev.mjs
import { runBuild } from "hohoro";
import { rm } from "fs/promises";
import { join } from "path";

// Clean up dist before building
try {
  await rm(join(process.cwd(), "dist"), { recursive: true, force: true });
} catch (e) {
  // Ignore errors if directory doesn't exist
}

await runBuild({ rootDirectory: process.cwd(), logger: console });
