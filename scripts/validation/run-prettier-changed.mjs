import {
  FORMAT_REGEX,
  logStep,
  quoteFiles,
  repoRoot,
  runNpx,
  selectChangedFiles,
} from "./changed-files.mjs";

const scope = process.argv[2];
if (!scope) {
  throw new Error(
    "Usage: node scripts/validation/run-prettier-changed.mjs <client|server>",
  );
}

const prefix = `${scope}/`;
const selected = selectChangedFiles(FORMAT_REGEX, prefix);

logStep(
  `format:${scope}`,
  `Checking ${selected.length} changed ${scope} file(s) with Prettier...`,
);

if (selected.length === 0) {
  logStep(`format:${scope}`, `No changed ${scope} files require formatting checks.`);
  process.exit(0);
}

runNpx(`prettier --check ${quoteFiles(selected)}`, {
  cwd: repoRoot,
});
