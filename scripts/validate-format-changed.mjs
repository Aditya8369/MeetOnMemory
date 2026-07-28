import {
  FORMAT_REGEX,
  logStep,
  quoteFiles,
  runNpx,
  selectChangedFiles,
} from "./validation/changed-files.mjs";

const selected = selectChangedFiles(FORMAT_REGEX);

logStep(
  "validate:format",
  `Checking ${selected.length} changed file(s) with Prettier...`,
);

if (selected.length === 0) {
  logStep("validate:format", "No changed files require formatting checks.");
  process.exit(0);
}

runNpx(`prettier --check ${quoteFiles(selected)}`);
