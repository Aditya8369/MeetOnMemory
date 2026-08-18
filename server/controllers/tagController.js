import { z } from "zod";
import Tag from "../models/tagModel.js";
import Meeting from "../models/meetingModel.js";
import { sendSuccess } from "../utils/responseHandler.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { caseInsensitiveEquals, escapeRegExp } from "../utils/regexUtils.js";
import mongoose from "mongoose";

// Validation schemas
const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
  description: z.string().max(200).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
  description: z.string().max(200).optional(),
});

/**
 * "Is there already a tag called this?" — as an equality query (Issue #1157).
 *
 * This used to be `{ $regex: new RegExp(`^${name}$`, "i") }`, which answers a
 * different question: "is there a tag *matching the pattern* `name`?" A tag
 * literally called `.*` therefore matched every subsequent lookup and made it
 * impossible to create any further tag in the organization, while `C++` threw
 * `SyntaxError: Nothing to repeat` before the query ran and surfaced as a 500.
 */
const findTagByName = (orgId, name) => {
  const { filter, collation } = caseInsensitiveEquals("name", name);
  return Tag.findOne({ organization: orgId, ...filter }).collation(collation);
};

export const createTag = async (req, res, next) => {
  try {
    const { name, color, description } = createTagSchema.parse(req.body);
    const orgId = req.user.organization;

    // Check uniqueness
    const existingTag = await findTagByName(orgId, name);
    if (existingTag) {
      throw new ValidationError(
        "Tag with this name already exists in your organization.",
      );
    }

    const tag = await Tag.create({
      name,
      color,
      description,
      organization: orgId,
      createdBy: req.user._id,
    });

    return sendSuccess(res, tag, "Tag created successfully", 201);
  } catch (err) {
    next(err);
  }
};

export const getOrgTags = async (req, res, next) => {
  try {
    const orgId = req.user.organization;
    const tags = await Tag.find({ organization: orgId }).sort({
      usageCount: -1,
      name: 1,
    });

    return sendSuccess(res, tags, "Tags retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const updateTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization;
    const updates = updateTagSchema.parse(req.body);

    const tag = await Tag.findOne({ _id: id, organization: orgId });
    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    const oldName = tag.name;
    const isRename = Boolean(updates.name && updates.name !== oldName);

    // If name is changing, check uniqueness using the same case-insensitive
    // equality semantics used by tag creation.
    if (updates.name && updates.name.toLowerCase() !== tag.name.toLowerCase()) {
      const existingTag = await findTagByName(orgId, updates.name);
      if (existingTag) {
        throw new ValidationError(
          "Tag with this name already exists in your organization.",
        );
      }
    }

    if (!isRename) {
      Object.assign(tag, updates);
      await tag.save();
      return sendSuccess(res, tag, "Tag updated successfully");
    }

    const newName = updates.name;

    // Replace every matching array element, not just the first one. The
    // previous positional `$` update could leave stale occurrences when a
    // meeting contained the same tag more than once.
    const renameMeetings = (filter, options = {}) =>
      Meeting.updateMany(
        { organization: orgId, tags: oldName, ...filter },
        [
          {
            $set: {
              tags: {
                $map: {
                  input: "$tags",
                  as: "tag",
                  in: {
                    $cond: [{ $eq: ["$$tag", oldName] }, newName, "$$tag"],
                  },
                },
              },
            },
          },
        ],
        options,
      );

    // MongoDB transactions make the tag document and all meeting references
    // commit/rollback together when the deployment supports transactions.
    // The project's test MongoDB is standalone, so use a compensating rollback
    // there to avoid leaving a partial rename behind if the second write fails.
    const supportsTransactions = async () => {
      try {
        const hello = await mongoose.connection.db.admin().command({
          hello: 1,
        });
        return Boolean(hello.setName || hello.msg === "isdbgrid");
      } catch {
        return false;
      }
    };

    if (await supportsTransactions()) {
      const session = await mongoose.startSession();
      try {
        let updatedTag;
        await session.withTransaction(async () => {
          const transactionalTag = await Tag.findOne({
            _id: id,
            organization: orgId,
          }).session(session);

          if (!transactionalTag) {
            throw new NotFoundError("Tag not found");
          }

          // Re-check uniqueness inside the transaction to reduce the race
          // window between the initial read and the rename commit.
          const duplicate = await findTagByName(orgId, newName).session(
            session,
          );
          if (duplicate && !duplicate._id.equals(transactionalTag._id)) {
            throw new ValidationError(
              "Tag with this name already exists in your organization.",
            );
          }

          Object.assign(transactionalTag, updates);
          await transactionalTag.save({ session });
          await renameMeetings({}, { session });
          updatedTag = transactionalTag;
        });

        return sendSuccess(res, updatedTag, "Tag updated successfully");
      } finally {
        await session.endSession();
      }
    }

    // Standalone MongoDB fallback (including the repository's test server).
    // Capture the exact affected documents so rollback cannot touch an
    // unrelated meeting that already uses the new name.
    const affectedMeetings = await Meeting.find({
      organization: orgId,
      tags: oldName,
    })
      .select("_id tags")
      .lean();

    let meetingsRenamed = false;
    try {
      await renameMeetings();
      meetingsRenamed = true;

      Object.assign(tag, updates);
      await tag.save();

      return sendSuccess(res, tag, "Tag updated successfully");
    } catch (err) {
      if (meetingsRenamed) {
        try {
          await Meeting.bulkWrite(
            affectedMeetings.map(({ _id: meetingId, tags }) => ({
              updateOne: {
                filter: { _id: meetingId },
                update: { $set: { tags } },
              },
            })),
          );
        } catch (rollbackError) {
          err.rollbackError = rollbackError;
        }
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

export const deleteTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization;

    const tag = await Tag.findOneAndDelete({ _id: id, organization: orgId });
    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    // Cascade delete in meetings
    await Meeting.updateMany(
      { organization: orgId },
      { $pull: { tags: tag.name } },
    );

    return sendSuccess(res, null, "Tag deleted successfully");
  } catch (err) {
    next(err);
  }
};

export const autocomplete = async (req, res, next) => {
  try {
    const { q } = req.query;
    const orgId = req.user.organization;

    if (!q) {
      return sendSuccess(res, []);
    }

    // Prefix matching is a genuine pattern query, so this one stays a regex —
    // it just uses the shared helper rather than a fourth open-coded copy of
    // the same character class (Issue #1157).
    const tags = await Tag.find({
      organization: orgId,
      name: { $regex: new RegExp(`^${escapeRegExp(q)}`, "i") },
    })
      .limit(10)
      .sort({ usageCount: -1 });

    return sendSuccess(res, tags);
  } catch (err) {
    next(err);
  }
};

export const getMeetingsByTag = async (req, res, next) => {
  try {
    const { name } = req.params;
    const orgId = req.user.organization;
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 10,
    });

    const query = { organization: orgId, tags: name };

    const meetings = await Meeting.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("uploadedBy", "name email");

    const total = await Meeting.countDocuments(query);
    const pagination = buildPaginationMeta({ total, page, limit });

    return sendSuccess(res, {
      meetings,
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalCount: pagination.total,
      pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getTagStats = async (req, res, next) => {
  try {
    const orgId = req.user.organization;

    // Top 10 tags by usage count
    const topTags = await Tag.find({ organization: orgId })
      .sort({ usageCount: -1 })
      .limit(10);

    return sendSuccess(res, {
      topTags,
    });
  } catch (err) {
    next(err);
  }
};
