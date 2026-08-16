import { jest } from "@jest/globals";

const SavedFilter = {
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  deleteOne: jest.fn(),
};

const savedFilterService = {
  refreshMatchCounts: jest.fn(),
};

jest.unstable_mockModule("../models/savedFilterModel.js", () => ({
  default: SavedFilter,
}));
jest.unstable_mockModule("../services/savedFilterService.js", () => ({
  default: savedFilterService,
}));

const { updateFilter, deleteFilter, togglePin, getFilters } =
  await import("../controllers/savedFilterController.js");

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const makeFilter = ({
  id = "filter-1",
  user = "owner-1",
  organization = "org-1",
  isShared = true,
} = {}) => ({
  _id: id,
  user: { toString: () => user },
  organization: { toString: () => organization },
  isShared,
  isPinned: false,
  save: jest.fn(),
});

describe("Saved Filter authorization (Issue #1541)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SavedFilter.findOne.mockResolvedValue(null);
    savedFilterService.refreshMatchCounts.mockResolvedValue([]);
  });

  test("rejects a cross-organization filter ID", async () => {
    const filter = makeFilter({ organization: "org-other" });
    SavedFilter.findById.mockResolvedValue(filter);
    const res = makeResponse();

    await updateFilter(
      {
        params: { id: "filter-1" },
        body: { name: "attacker update" },
        user: { _id: "member-1", organization: "org-1", role: "member" },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(filter.save).not.toHaveBeenCalled();
  });

  test("allows an owner to update a filter in the same organization", async () => {
    const filter = makeFilter({
      user: "owner-1",
      organization: "org-1",
      isShared: false,
    });
    SavedFilter.findById.mockResolvedValue(filter);
    SavedFilter.findOne.mockResolvedValue(filter);
    const res = makeResponse();

    await updateFilter(
      {
        params: { id: "filter-1" },
        body: { name: "updated" },
        user: { _id: "owner-1", organization: "org-1", role: "owner" },
      },
      res,
    );

    expect(filter.name).toBe("updated");
    expect(filter.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("prevents a non-owner shared member from modifying a filter", async () => {
    const filter = makeFilter({
      user: "owner-1",
      organization: "org-1",
      isShared: true,
    });
    SavedFilter.findById.mockResolvedValue(filter);
    const res = makeResponse();

    await updateFilter(
      {
        params: { id: "filter-1" },
        body: { name: "member update" },
        user: { _id: "member-1", organization: "org-1", role: "member" },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(filter.save).not.toHaveBeenCalled();
  });

  test("prevents a shared member from changing global pin state", async () => {
    const filter = makeFilter({
      user: "owner-1",
      organization: "org-1",
      isShared: true,
    });
    SavedFilter.findById.mockResolvedValue(filter);
    const res = makeResponse();

    await togglePin(
      {
        params: { id: "filter-1" },
        body: { isPinned: true },
        user: { _id: "member-1", organization: "org-1", role: "member" },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(filter.save).not.toHaveBeenCalled();
  });

  test("allows an authorized organization member to read shared filters only from their organization", async () => {
    const query = {
      sort: jest
        .fn()
        .mockResolvedValue([
          { _id: "filter-1", organization: "org-1", isShared: true },
        ]),
    };
    SavedFilter.find.mockReturnValue(query);
    const res = makeResponse();

    await getFilters(
      { user: { _id: "member-1", organization: "org-1", role: "member" } },
      res,
    );

    expect(SavedFilter.find).toHaveBeenCalledWith({
      $or: [
        { user: "member-1", organization: "org-1" },
        { organization: "org-1", isShared: true },
      ],
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("prevents deleting another owner's filter", async () => {
    const filter = makeFilter({
      user: "owner-1",
      organization: "org-1",
      isShared: true,
    });
    SavedFilter.findById.mockResolvedValue(filter);
    const res = makeResponse();

    await deleteFilter(
      {
        params: { id: "filter-1" },
        user: { _id: "member-1", organization: "org-1", role: "admin" },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(SavedFilter.deleteOne).not.toHaveBeenCalled();
  });
});
