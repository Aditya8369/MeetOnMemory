import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTerms } from "../glossaryController.js";
import GlossaryTerm from "../../models/glossaryTermModel.js";

vi.mock("../../models/glossaryTermModel.js");

describe("Glossary Search Security (#1488)", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      user: { organization: "org123" },
      query: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it("returns 400 Bad Request when search query exceeds 200 characters", async () => {
    req.query.search = "a".repeat(201);

    await getTerms(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Search query cannot exceed 200 characters",
      }),
    );
  });

  it("executes search query within length limit successfully", async () => {
    req.query.search = "API";
    GlossaryTerm.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([{ term: "API" }]),
    });

    await getTerms(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(GlossaryTerm.find).toHaveBeenCalledWith({
      organization: "org123",
      $text: { $search: "API" },
    });
  });
});
