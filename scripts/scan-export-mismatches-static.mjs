import fs from "fs";
import path from "path";

const ROOT = path.resolve("server");

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
  for (const c of [base, `${base}.js`, path.join(base, "index.js")]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function parseExports(content) {
  const named = new Set();
  let hasDefault = false;

  for (const m of content.matchAll(/export\s+default\b/g)) hasDefault = true;
  for (const m of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const asMatch = seg.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
      const name = asMatch ? asMatch[2] : seg.match(/^([\w$]+)$/)?.[1];
      if (name) named.add(name);
    }
  }
  for (const m of content.matchAll(
    /export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([\w$]+)/g,
  )) {
    named.add(m[1]);
  }
  for (const m of content.matchAll(/export\s*\*\s+from\s+['"][^'"]+['"]/g)) {
    named.add("*reexport*");
  }

  if (
    /module\.exports\s*=/.test(content) ||
    /exports\.[\w$]+\s*=/.test(content)
  ) {
    hasDefault = true;
  }

  return { named, hasDefault };
}

function parseImports(content) {
  const imports = [];
  const stmts = content.match(/import[\s\S]*?from\s+['"][^'"]+['"]/g) || [];
  for (const stmt of stmts) {
    const spec = stmt.match(/from\s+['"]([^'"]+)['"]/)?.[1];
    if (!spec) continue;
    const clause = stmt
      .replace(/^import\s+/, "")
      .replace(/\s+from\s+['"][^'"]+['"]/, "")
      .trim();

    if (clause.startsWith("* as ")) {
      imports.push({ spec, kind: "namespace", name: clause.slice(5).trim() });
      continue;
    }

    const defaultMatch = clause.match(/^([\w$]+)(?:\s*,\s*\{([\s\S]*)\})?$/);
    if (defaultMatch && !clause.startsWith("{")) {
      imports.push({ spec, kind: "default", name: defaultMatch[1] });
      if (defaultMatch[2]) {
        for (const part of defaultMatch[2].split(",")) {
          const seg = part.trim();
          const m = seg.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
          if (m)
            imports.push({
              spec,
              kind: "named",
              import: m[2] || m[1],
              export: m[1],
            });
        }
      }
      continue;
    }

    const brace = clause.match(/^\{([\s\S]*)\}$/);
    if (brace) {
      for (const part of brace[1].split(",")) {
        const seg = part.trim();
        const m = seg.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
        if (m)
          imports.push({
            spec,
            kind: "named",
            import: m[2] || m[1],
            export: m[1],
          });
      }
    }
  }
  return imports;
}

const files = walk(ROOT);
const exportMap = new Map();
for (const file of files) {
  exportMap.set(file, parseExports(fs.readFileSync(file, "utf8")));
}

const mismatches = [];
for (const file of files) {
  const relFrom = path.relative(ROOT, file).replace(/\\/g, "/");
  const imports = parseImports(fs.readFileSync(file, "utf8"));
  for (const imp of imports) {
    const target = resolveRelative(file, imp.spec);
    if (!target) continue;
    const relTarget = path.relative(ROOT, target).replace(/\\/g, "/");
    const exp = exportMap.get(target);
    if (!exp) continue;

    if (imp.kind === "default" && !exp.hasDefault && exp.named.size === 0) {
      mismatches.push({
        type: "missing-default",
        from: relFrom,
        target: relTarget,
        name: imp.name,
      });
    } else if (
      imp.kind === "default" &&
      !exp.hasDefault &&
      exp.named.size > 0
    ) {
      mismatches.push({
        type: "default-vs-named",
        from: relFrom,
        target: relTarget,
        name: imp.name,
        available: [...exp.named].sort(),
      });
    } else if (
      imp.kind === "named" &&
      !exp.named.has(imp.export) &&
      !exp.named.has("*reexport*")
    ) {
      mismatches.push({
        type: "missing-named",
        from: relFrom,
        target: relTarget,
        name: imp.export,
        available: [...exp.named].sort(),
      });
    }
  }
}

console.log(JSON.stringify(mismatches, null, 2));
console.error(`Total mismatches: ${mismatches.length}`);
