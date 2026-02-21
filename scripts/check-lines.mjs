import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceDir = join(root, "src");

const configPath = join(root, "line-limits.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const defaultMax = Number(config.defaultMax || 750);
const overrides = new Map(Object.entries(config.overrides || {}));
const includeExtensions = new Set([".ts", ".tsx"]);
const ignoreSegments = new Set(config.ignoreSegments || ["assets"]);

function walk(dir, result = []) {
  const entries = readdirSync(dir);
  for (const name of entries) {
    const fullPath = join(dir, name);
    const relPath = relative(root, fullPath);
    if (Array.from(ignoreSegments).some((segment) => relPath.split("/").includes(segment))) {
      continue;
    }

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, result);
      continue;
    }

    const ext = name.slice(name.lastIndexOf("."));
    if (!includeExtensions.has(ext)) continue;
    result.push(fullPath);
  }
  return result;
}

const files = walk(sourceDir);
const violations = [];

for (const file of files) {
  const relPath = relative(root, file).replaceAll("\\", "/");
  const fileMax = Number(overrides.get(relPath) || defaultMax);
  const raw = readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/).length;
  if (lines > fileMax) {
    violations.push({ relPath, lines, max: fileMax });
  }
}

if (!violations.length) {
  process.stdout.write(`line check passed for ${files.length} files\n`);
  process.exit(0);
}

process.stdout.write("line check failed\n");
for (const item of violations) {
  process.stdout.write(`${item.relPath}: ${item.lines} > ${item.max}\n`);
}
process.exit(1);
