/**
 * Regression tests for Issue #1770 — MongoDB regex injection via unsanitized
 * user input.
 *
 * User-controlled values must be escaped before they reach `$regex` / `RegExp`.
 * Inputs such as `.*`, `(a+)+b`, `^admin$`, `foo|bar`, `[abc]`, and `\w+` must
 * be treated as literal text, not executable patterns.
 */

import mongoose from "mongoose";
import { escapeRegex } from "../utils/regex.js";
import { escapeRegExp } from "../utils/regexUtils.js";
import savedFilterService from "../services/savedFilterService.js";
import {
  createTag,
  updateTag,
  autocomplete,
} from "../controllers/tagController.js";
import Tag from "../models/tagModel.js";

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

const mockRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

const invoke = async (handler, req) => {
  const res = mockRes();
  let error = null;
  await handler(req, res, (err) => {
    error = err;
  });
  return { res, error };
};

const asUser = (body = {}, extra = {}) => ({
  body,
  params: {},
  query: {},
  user: { _id: USER_A, organization: ORG_A },
  ...extra,
});

const payloadRows = (body) =>
  Object.entries(body ?? {})
    .filter(([key]) => /^\d+$/.test(key))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, value]) => value);

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  }
});

describe("escapeRegex (Issue #1770)", () => {
  it("is the single shared implementation re-exported as escapeRegExp", () => {
    expect(escapeRegex).toBe(escapeRegExp);
  });

  it.each([
    [".*", "\\.\\*"],
    ["(a+)+b", "\\(a\\+\\)\\+b"],
    ["^admin$", "\\^admin\\$"],
    ["foo|bar", "foo\\|bar"],
    ["[abc]", "\\[abc\\]"],
    ["\\w+", "\\\\w\\+"],
  ])("escapes %p as literal text", (input, escaped) => {
    expect(escapeRegex(input)).toBe(escaped);
    const re = new RegExp(`^${escapeRegex(input)}$`);
    expect(re.test(input)).toBe(true);
  });

  it("does not let '.*' match arbitrary strings", () => {
    const re = new RegExp(escapeRegex(".*"));
    expect(re.test("anything at all")).toBe(false);
    expect(re.test(".*")).toBe(true);
  });

  it("does not let '^admin$' anchor an equality bypass", () => {
    const re = new RegExp(escapeRegex("^admin$"));
    expect(re.test("admin")).toBe(false);
    expect(re.test("^admin$")).toBe(true);
  });

  it("does not let 'foo|bar' match either alternative", () => {
    const re = new RegExp(escapeRegex("foo|bar"));
    expect(re.test("foo")).toBe(false);
    expect(re.test("bar")).toBe(false);
    expect(re.test("foo|bar")).toBe(true);
  });

  it("still matches ordinary search text", () => {
    const re = new RegExp(escapeRegex("budget"), "i");
    expect(re.test("Q4 Budget Review")).toBe(true);
  });
});

describe("saved filter searchQuery (Issue #1770)", () => {
  it("keeps organization scoping while escaping metacharacters", () => {
    const orgId = new mongoose.Types.ObjectId();
    const query = savedFilterService.buildQuery(
      { searchQuery: "foo|bar" },
      orgId,
    );

    expect(query.organization).toBe(orgId);
    expect(query.deletedAt).toBeNull();
    expect(query.$or[0].title.source).toBe("foo\\|bar");
    expect(query.$or[0].title.test("foo")).toBe(false);
    expect(query.$or[0].title.test("foo|bar")).toBe(true);
  });
});

describe("tag names (Issue #1770)", () => {
  it("creates a tag named '.*' without matching every existing tag", async () => {
    await invoke(createTag, asUser({ name: "Engineering" }));

    const { res, error } = await invoke(createTag, asUser({ name: ".*" }));

    expect(error).toBeNull();
    expect(res.statusCode).toBe(201);
    expect(
      await Tag.findOne({ organization: ORG_A, name: ".*" }),
    ).not.toBeNull();
    expect(await Tag.countDocuments({ organization: ORG_A })).toBe(2);
  });

  it("renames a tag to 'C++' without a compile error", async () => {
    const created = await invoke(createTag, asUser({ name: "Cpp" }));
    const tag = await Tag.findOne({ organization: ORG_A, name: "Cpp" });

    const renamed = await invoke(
      updateTag,
      asUser({ name: "C++" }, { params: { id: tag._id.toString() } }),
    );

    expect(created.error).toBeNull();
    expect(renamed.error).toBeNull();
    expect((await Tag.findById(tag._id)).name).toBe("C++");
  });

  it("autocomplete treats 'B.' as a literal prefix, not 'B' + any char", async () => {
    await Tag.create([
      { name: "Budget", organization: ORG_A, createdBy: USER_A },
      { name: "B.dget", organization: ORG_A, createdBy: USER_A },
    ]);

    const { res, error } = await invoke(
      autocomplete,
      asUser({}, { query: { q: "B." } }),
    );

    expect(error).toBeNull();
    expect(payloadRows(res.body).map((t) => t.name)).toEqual(["B.dget"]);
  });

  it("does not leak tags across organizations during autocomplete", async () => {
    await Tag.create([
      { name: "Shared", organization: ORG_A, createdBy: USER_A },
      {
        name: "Shared",
        organization: ORG_B,
        createdBy: new mongoose.Types.ObjectId(),
      },
    ]);

    const { res, error } = await invoke(
      autocomplete,
      asUser({}, { query: { q: "Sha" } }),
    );

    expect(error).toBeNull();
    const rows = payloadRows(res.body);
    expect(rows).toHaveLength(1);
    expect(rows[0].organization.toString()).toBe(ORG_A.toString());
  });
});
