import fs from "fs/promises";
import path from "path";

const workspaceRoot = process.cwd(); // Assumes the script is run from the workspace root
const appsDir = path.join(workspaceRoot, "apps");
const packagesDir = path.join(workspaceRoot, "packages");
const excludedPackages = ["test-tmp", "tsconfig"];

async function analyzeDirectory(dirPath, type, excludeList = []) {
  const components = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !excludeList.includes(entry.name) &&
        !entry.name.startsWith(".")
      ) {
        const componentPath = path.join(dirPath, entry.name);
        const packageJsonPath = path.join(componentPath, "package.json");
        let name = entry.name;
        let description = null;

        try {
          const packageJsonContent = await fs.readFile(
            packageJsonPath,
            "utf-8"
          );
          const packageJson = JSON.parse(packageJsonContent);
          name = packageJson.name || name; // Use package.json name if available
          description = packageJson.description || null;
        } catch (err) {
          // package.json might not exist or be readable, ignore error
          if (err.code !== "ENOENT") {
            console.warn(
              `Warning: Could not read or parse package.json for ${componentPath}: ${err.message}`
            );
          }
        }

        components.push({
          type: type,
          name: name, // Use extracted name (from package.json or dir name)
          path: path.relative(workspaceRoot, componentPath), // Relative path
          description: description,
        });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}: ${err.message}`);
  }
  return components;
}

async function main() {
  console.log("Analyzing project structure...");
  const apps = await analyzeDirectory(appsDir, "app");
  const packages = await analyzeDirectory(
    packagesDir,
    "package",
    excludedPackages
  );
  const analysisResult = {
    apps: apps,
    packages: packages,
  };
  console.log(JSON.stringify(analysisResult, null, 2));
  console.log("Analysis complete.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
