const fs = require('fs');
const path = require('path');
const testsDir = path.join(process.cwd(), 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
const jobsDir = path.join(process.cwd(), 'jobs', '__tests__');
let jobFiles = [];
if (fs.existsSync(jobsDir)) {
  jobFiles = fs.readdirSync(jobsDir).filter(f => f.endsWith('.test.js')).map(f => path.join('jobs', '__tests__', f));
}

const vitestFiles = [];
for (const file of [...files, ...jobFiles]) {
  const filePath = file.includes('jobs') ? path.join(process.cwd(), file) : path.join(testsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('from "vitest"') || content.includes("from 'vitest'")) {
    vitestFiles.push(path.basename(file));
  }
}

let jestConfig = fs.readFileSync('jest.config.mjs', 'utf8');
const ignorePatternMatch = jestConfig.match(/testPathIgnorePatterns:\s*\[([\s\S]*?)\]/);
if (ignorePatternMatch) {
  const existingFiles = ignorePatternMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  const merged = Array.from(new Set([...existingFiles, ...vitestFiles]));
  
  const newArray = '[\n    ' + merged.map(f => '"' + f + '"').join(',\n    ') + ',\n  ]';
  jestConfig = jestConfig.replace(/testPathIgnorePatterns:\s*\[[\s\S]*?\]/, 'testPathIgnorePatterns: ' + newArray);
  fs.writeFileSync('jest.config.mjs', jestConfig);
  console.log('Updated jest.config.mjs with ' + merged.length + ' ignored files');
}
