const fs = require("fs");
const path = require("path");

const srcDir = path.join(process.cwd(), "src");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".test.js") || file.endsWith(".test.jsx")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  const mockRegex =
    /vi\.mock\("((?:\.\.\/)+)services",\s*\(\)\s*=>\s*\(\{([\s\S]*?)\}\)\);/g;

  if (content.match(mockRegex)) {
    if (!content.includes("savedFilterApi:")) {
      content = content.replace(mockRegex, (match, p1, p2) => {
        // p2 is the inner content of the returned object
        let newInner = p2;
        if (!newInner.trim().endsWith(",")) {
          newInner += ",";
        }
        newInner +=
          "\n  savedFilterApi: {\n    getSavedFilters: vi.fn().mockResolvedValue({ data: [] }),\n    createSavedFilter: vi.fn(),\n    deleteSavedFilter: vi.fn(),\n  },";
        return `vi.mock("${p1}services", () => ({${newInner}}));`;
      });
      fs.writeFileSync(file, content);
      console.log("Patched", file);
    }
  }
});
