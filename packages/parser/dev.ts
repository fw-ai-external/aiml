import { runBuild } from "hohoro";
import { rm } from "fs/promises";
import { join } from "path";
import { watch } from "fs";

// If "watch" flag is passed, the following argument must be the directory path; otherwise, default to "./src".
const args = process.argv.slice(2);
let targetDir = "./src";
if (args[0] === "watch-dir") {
  if (args[1]) {
    targetDir = args[1];
  }
}

// Clean up the dist directory before building.
try {
  await rm(join(process.cwd(), "dist"), { recursive: true, force: true });
} catch (error) {
  // Ignore errors if the directory doesn't exist.
}

// Start Generation Here
const originalProcessExit = process.exit;
// process.exit = (code?: number): never => {
//   console.info(`Watching for changes...`);
//   // Instead of exiting, simply return.
//   return undefined as never;
// };

await runBuild({
  rootDirectory: process.cwd(),
  logger: console,
});

const watcher = watch(
  join(process.cwd(), targetDir),
  { recursive: true },
  async () => {
    // await rm(join(process.cwd(), "dist"), { recursive: true, force: true });
    console.log("Removing dist directory...");
    await runBuild({
      rootDirectory: process.cwd(),
      logger: console,
    });
  }
);

process.on("SIGINT", () => {
  // close watcher when Ctrl-C is pressed
  console.log("Closing watcher...");
  watcher.close();

  originalProcessExit(0);
});
