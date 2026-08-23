import fs from "fs";
import path from "path";
import module from "module";
import { pathToFileURL } from "url";

const ROOT = path.resolve("server");
const NODE_BUILTINS = new Set(module.builtinModules);
for (const b of [...NODE_BUILTINS]) NODE_BUILTINS.add(`node:${b}`);

const importPatterns = [
  /\bimport\s+(?:type\s+)?(?:(?:[\w*\s{},$]*)\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+(?:type\s+)?(?:(?:[\w*\s{},$]*)\s+from\s+)?['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function walk(dir, ignore = new Set(["node_modules", ".git", "coverage"])) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ignore));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

function resolveRelative(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.js`,
    path.join(base, "index.js"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function parseNamedImports(importClause) {
  const names = [];
  const cleaned = importClause.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.startsWith("*")) return names;
  const defaultAndRest = cleaned.match(/^([\w$]+)\s*,\s*\{([\s\S]*)\}$/);
  if (defaultAndRest) names.push({ kind: "default", name: defaultAndRest[1] });
  const onlyDefault = cleaned.match(/^([\w$]+)$/);
  if (onlyDefault && !cleaned.includes("{")) {
    names.push({ kind: "default", name: onlyDefault[1] });
    return names;
  }
  const brace = cleaned.match(/\{([\s\S]*)\}/);
  if (brace) {
    for (const part of brace[1].split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const m = seg.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (m) names.push({ kind: "named", import: m[2] || m[1], export: m[1] });
    }
  }
  const defOnly = cleaned.match(/^([\w$]+)\s*,\s*\{/);
  if (defOnly && !names.some((n) => n.kind === "default")) {
    names.unshift({ kind: "default", name: defOnly[1] });
  }
  return names;
}

function parseImportStatement(stmt) {
  const m = stmt.match(/\bimport\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/);
  if (!m) return null;
  return { clause: m[1], spec: m[2] };
}

function extractImports(content) {
  const results = [];
  const lines = content.split(/\n/);
  let buf = "";
  for (const line of lines) {
    buf += `${line}\n`;
    if (buf.includes(";") || (!buf.includes("from") && buf.trim().endsWith("'"))) {
      const stmt = buf.trim();
      if (stmt.startsWith("import ")) {
        const parsed = parseImportStatement(stmt.replace(/\n/g, " "));
        if (parsed) results.push(parsed);
      }
      buf = "";
    }
  }
  if (buf.trim().startsWith("import ")) {
    const parsed = parseImportStatement(buf.trim().replace(/\n/g, " "));
    if (parsed) results.push(parsed);
  }
  return results;
}

async function getExports(filePath) {
  try {
    const mod = await import(pathToFileURL(filePath).href);
    const names = Object.keys(mod).filter((k) => k !== "default");
    return {
      ok: true,
      hasDefault: "default" in mod && mod.default !== undefined,
      named: new Set(names),
      defaultType: mod.default === undefined ? "none" : typeof mod.default,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

const files = walk(ROOT);
const mismatches = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  for (const { clause, spec } of extractImports(content)) {
    const target = resolveRelative(file, spec);
    if (!target) continue;
    const imports = parseNamedImports(clause);
    const exportsInfo = await getExports(target);
    if (!exportsInfo.ok) {
      mismatches.push({
        type: "load-error",
        from: rel,
        spec,
        target: path.relative(ROOT, target).replace(/\\/g, "/"),
        error: exportsInfo.error,
      });
      continue;
    }
    for (const imp of imports) {
      if (imp.kind === "default") {
        if (!exportsInfo.hasDefault) {
          mismatches.push({
            type: "missing-default",
            from: rel,
            spec,
            target: path.relative(ROOT, target).replace(/\\/g, "/"),
            import: imp.name,
          });
        }
      } else if (!exportsInfo.named.has(imp.export)) {
        mismatches.push({
          type: "missing-named",
          from: rel,
          spec,
          target: path.relative(ROOT, target).replace(/\\/g, "/"),
          import: imp.import,
          export: imp.export,
          available: [...exportsInfo.named].sort(),
        });
      }
    }
  }
}

console.log(JSON.stringify(mismatches, null, 2));
console.error(`\nTotal mismatches: ${mismatches.length}`);
