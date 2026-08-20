import { describe, it, expect, vi, beforeEach } from "vitest";

const glossaryTermFind = {
  sort: vi.fn(),
  skip: vi.fn(),
  limit: vi.fn(),
};

const glossaryTermMock = {
  find: vi.fn(() => glossaryTermFind),
  countDocuments: vi.fn(),
};

vi.mock("../models/glossaryTermModel.js", () => ({
  default: glossaryTermMock,
}));

vi.mock("../services/glossaryService.js", () => ({
  default: {
    detectTerms: vi.fn(),
    aiExtractTerms: vi.fn(),
  },
}));

const { getTerms } = await import("../controllers/glossaryController.js");

function mockResponse() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("glossaryController pagination (Issue #1679)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    glossaryTermFind.sort.mockReturnValue(glossaryTermFind);
    glossaryTermFind.skip.mockReturnValue(glossaryTermFind);
    glossaryTermFind.limit.mockResolvedValue([
      { _id: "1", term: "ROI", definition: "Return on Investment" },
      { _id: "2", term: "KPI", definition: "Key Performance Indicator" },
    ]);
  });

  it("returns unpaginated array for backward compatibility when no pagination params", async () => {
    glossaryTermMock.countDocuments.mockResolvedValue(2);
    const req = {
      user: { organization: "org-1" },
      query: {},
    };
    const res = mockResponse();

    await getTerms(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { _id: "1", term: "ROI", definition: "Return on Investment" },
      { _id: "2", term: "KPI", definition: "Key Performance Indicator" },
    ]);
  });

  it("returns paginated envelope when page or limit is specified", async () => {
    glossaryTermMock.countDocuments.mockResolvedValue(100);
    const req = {
      user: { organization: "org-1" },
      query: { page: "2", limit: "10" },
    };
    const res = mockResponse();

    await getTerms(req, res);

    expect(glossaryTermFind.skip).toHaveBeenCalledWith(10);
    expect(glossaryTermFind.limit).toHaveBeenCalledWith(10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      terms: [
        { _id: "1", term: "ROI", definition: "Return on Investment" },
        { _id: "2", term: "KPI", definition: "Key Performance Indicator" },
      ],
      pagination: {
        total: 100,
        page: 2,
        limit: 10,
        totalPages: 10,
        hasMore: true,
      },
    });
  });

  it("clamps oversized limits to maxLimit (100)", async () => {
    glossaryTermMock.countDocuments.mockResolvedValue(150);
    const req = {
      user: { organization: "org-1" },
      query: { limit: "10000" },
    };
    const res = mockResponse();

    await getTerms(req, res);

    expect(glossaryTermFind.limit).toHaveBeenCalledWith(100);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({
          limit: 100,
        }),
      }),
    );
  });
});
