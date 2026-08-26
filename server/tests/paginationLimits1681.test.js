import { jest } from "@jest/globals";

const makeRes = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const auditFind = {
  populate: jest.fn(() => auditFind),
  sort: jest.fn(() => auditFind),
  skip: jest.fn(() => auditFind),
  limit: jest.fn(() => auditFind),
  lean: jest.fn(async () => []),
};
const auditLogMock = {
  find: jest.fn(() => auditFind),
  countDocuments: jest.fn(async () => 0),
};
const auditExportMock = { findOne: jest.fn() };
const exportQueueMock = { isActive: true, add: jest.fn() };

const getConsolidatedMemoriesMock = jest.fn(async () => []);
const listConflictSetsMock = jest.fn(async () => []);

jest.unstable_mockModule("../models/auditLogModel.js", () => ({
  default: auditLogMock,
}));
jest.unstable_mockModule("../models/auditLogExportModel.js", () => ({
  default: auditExportMock,
}));
jest.unstable_mockModule("../services/queueService.js", () => ({
  dataExportQueue: exportQueueMock,
}));
jest.unstable_mockModule("../services/auditLogExportService.js", () => ({
  AUDIT_EXPORT_DIRECTORY: "/tmp/audit-exports",
  buildAuditLogFilter: jest.fn(({ organizationId }) => ({ organizationId })),
  streamCsvExport: jest.fn(),
  streamXlsxExport: jest.fn(),
}));
jest.unstable_mockModule("../services/memoryConsolidationService.js", () => ({
  consolidateMemories: jest.fn(),
  getConsolidatedMemories: getConsolidatedMemoriesMock,
  MODEL_REGISTRY: { decision: {}, fact: {} },
}));
jest.unstable_mockModule(
  "../services/conflictDetection/conflictDetectionService.js",
  () => ({
    detectConflicts: jest.fn(),
    listConflictSets: listConflictSetsMock,
    getConflictSetById: jest.fn(),
    resolveConflictSet: jest.fn(),
    MODEL_REGISTRY: { decision: {}, fact: {} },
  }),
);

const { getOrganizationAuditLogs } =
  await import("../controllers/auditLogController.js");
const { getConsolidationHistory } =
  await import("../controllers/consolidationController.js");
const { getConflicts } = await import("../controllers/conflictController.js");

const user = { id: "user-1", _id: "user-1", organization: "org-1" };

beforeEach(() => {
  jest.clearAllMocks();
  auditFind.populate.mockReturnValue(auditFind);
  auditFind.sort.mockReturnValue(auditFind);
  auditFind.skip.mockReturnValue(auditFind);
  auditFind.limit.mockReturnValue(auditFind);
  auditFind.lean.mockResolvedValue([]);
  auditLogMock.find.mockReturnValue(auditFind);
  auditLogMock.countDocuments.mockResolvedValue(0);
  getConsolidatedMemoriesMock.mockResolvedValue([]);
  listConflictSetsMock.mockResolvedValue([]);
});

describe("Issue #1681 pagination ceilings", () => {
  test.each([
    ["audit logs", getOrganizationAuditLogs, { id: "org-1" }, "audit"],
    ["consolidation history", getConsolidationHistory, {}, "consolidation"],
    ["conflicts", getConflicts, {}, "conflict"],
  ])("clamps oversized limits for %s", async (_name, handler, params, kind) => {
    const req = {
      params,
      query: { limit: "10000000" },
      user,
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    if (kind === "audit") {
      expect(auditFind.limit).toHaveBeenCalledWith(100);
    } else if (kind === "consolidation") {
      expect(getConsolidatedMemoriesMock).toHaveBeenCalledWith(
        "decision",
        expect.objectContaining({ limit: 100 }),
      );
    } else {
      expect(listConflictSetsMock).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ limit: 100 }),
      );
    }
  });

  test.each([
    ["audit", getOrganizationAuditLogs, { id: "org-1" }],
    ["consolidation", getConsolidationHistory, {}],
    ["conflict", getConflicts, {}],
  ])(
    "preserves endpoint default limit for %s",
    async (_name, handler, params) => {
      const req = { params, query: {}, user };
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      if (_name === "audit") {
        expect(auditFind.limit).toHaveBeenCalledWith(20);
      } else if (_name === "consolidation") {
        expect(getConsolidatedMemoriesMock).toHaveBeenCalledWith(
          "decision",
          expect.objectContaining({ limit: 50 }),
        );
      } else {
        expect(listConflictSetsMock).toHaveBeenCalledWith(
          undefined,
          expect.objectContaining({ limit: 50 }),
        );
      }
    },
  );

  test.each([
    ["audit", getOrganizationAuditLogs, { id: "org-1" }],
    ["consolidation", getConsolidationHistory, {}],
    ["conflict", getConflicts, {}],
  ])("normalizes invalid limits for %s", async (_name, handler, params) => {
    for (const limit of ["0", "-10", "abc", "4.5", "1e5"]) {
      jest.clearAllMocks();
      const req = { params, query: { limit }, user };
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      if (_name === "audit") {
        expect(auditFind.limit).toHaveBeenCalledWith(20);
      } else if (_name === "consolidation") {
        expect(getConsolidatedMemoriesMock).toHaveBeenCalledWith(
          "decision",
          expect.objectContaining({ limit: 50 }),
        );
      } else {
        expect(listConflictSetsMock).toHaveBeenCalledWith(
          undefined,
          expect.objectContaining({ limit: 50 }),
        );
      }
    }
  });

  test("accepts valid limits below the ceiling", async () => {
    const auditRes = makeRes();
    await getOrganizationAuditLogs(
      { params: { id: "org-1" }, query: { limit: "35" }, user },
      auditRes,
    );
    expect(auditFind.limit).toHaveBeenCalledWith(35);

    const consolidationRes = makeRes();
    await getConsolidationHistory(
      { query: { limit: "35" }, user },
      consolidationRes,
    );
    expect(getConsolidatedMemoriesMock).toHaveBeenCalledWith(
      "decision",
      expect.objectContaining({ limit: 35 }),
    );

    const conflictRes = makeRes();
    await getConflicts({ query: { limit: "35" }, user }, conflictRes);
    expect(listConflictSetsMock).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ limit: 35 }),
    );
  });
});
