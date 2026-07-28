import {
  getChangedFiles,
  logStep,
  quoteFiles,
  repoRoot,
  runNpx,
} from "./changed-files.mjs";

const TEST_FILE_REGEX = /(\.test\.|\.spec\.|__tests__)/;
const VITEST_TEST_FILES = new Set([
  "server/tests/OrganizationService.test.js",
  "server/tests/InvitationService.test.js",
  "server/tests/organizationController.test.js",
  "server/tests/knowledgeController.test.js",
  "server/tests/transcriptController.test.js",
  "server/tests/meetingDigestService.test.js",
]);
const JEST_RELATED_IGNORE = [
  "tests/integration.test.js",
  "tests/policyComplianceIntegration.test.js",
];

const changedFiles = getChangedFiles();
const serverFiles = changedFiles.filter(
  (file) =>
    file.startsWith("server/") &&
    /\.(js|jsx|ts|tsx)$/.test(file) &&
    !file.includes("/coverage/"),
);

const directTests = serverFiles.filter((file) => TEST_FILE_REGEX.test(file));
const sourceFiles = serverFiles.filter((file) => !directTests.includes(file));
const vitestTests = directTests.filter((file) => VITEST_TEST_FILES.has(file));
const jestTests = directTests.filter((file) => !vitestTests.includes(file));

logStep(
  "test:server:related",
  `Running focused server tests for ${serverFiles.length} changed file(s)...`,
);

if (serverFiles.length === 0) {
  logStep("test:server:related", "No changed server files require tests.");
  process.exit(0);
}

if (jestTests.length > 0) {
  runNpx(
    `jest --runInBand --passWithNoTests ${quoteFiles(
      jestTests.map((file) => file.slice("server/".length)),
    )}`,
    {
      cwd: `${repoRoot}/server`,
    },
  );
}

if (sourceFiles.length > 0) {
  const scopedSources = sourceFiles.map((file) => file.slice("server/".length));
  const ignoreArgs = JEST_RELATED_IGNORE.map(
    (pattern) => `--testPathIgnorePatterns="${pattern}"`,
  ).join(" ");

  runNpx(
    `jest --runInBand --findRelatedTests --passWithNoTests ${ignoreArgs} ${quoteFiles(
      scopedSources,
    )}`,
    {
      cwd: `${repoRoot}/server`,
    },
  );

  runNpx(`vitest related --passWithNoTests ${quoteFiles(scopedSources)}`, {
    cwd: `${repoRoot}/server`,
  });
}

if (vitestTests.length > 0) {
  runNpx(
    `vitest run --passWithNoTests ${quoteFiles(
      vitestTests.map((file) => file.slice("server/".length)),
    )}`,
    {
    cwd: `${repoRoot}/server`,
    },
  );
}
