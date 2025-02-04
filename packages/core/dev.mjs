// dev.mjs
import { runBuild } from "hohoro";

await runBuild({ rootDirectory: process.cwd(), logger: console });
