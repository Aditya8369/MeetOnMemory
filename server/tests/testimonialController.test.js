import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listApprovedTestimonials,
  getTestimonialStats,
  createTestimonial,
  updateTestimonial,
  deleteOwnTestimonial,
  updateTestimonialStatus,
} from "../controllers/testimonialController.js";
import Testimonial from "../models/testimonialModel.js";

vi.mock("../models/testimonialModel.js", () => {
  const Model = {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
  };
  return {
    default: Model,
    TESTIMONIAL_COMMENT_MAX_LENGTH: 500,
  };
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const chainFind = (docs) => {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(docs),
  };
  return chain;
};

describe("testimonialController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only approved testimonials publicly", async () => {
    const docs = [
      {
        _id: "t1",
        rating: 5,
        comment: "Great product for meeting notes",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: "Ada", profilePic: "", role: "member" },
        organization: { name: "Acme" },
      },
    ];
    Testimonial.find.mockReturnValue(chainFind(docs));
    Testimonial.countDocuments.mockResolvedValue(1);

    const req = { query: {} };
    const res = mockRes();
    await listApprovedTestimonials(req, res);

    expect(Testimonial.find).toHaveBeenCalledWith({ status: "approved" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        testimonials: [
          expect.objectContaining({
            rating: 5,
            comment: "Great product for meeting notes",
            user: expect.objectContaining({ name: "Ada" }),
          }),
        ],
      }),
    );
  });

  it("computes stats from approved testimonials only", async () => {
    Testimonial.aggregate.mockResolvedValue([
      {
        total: 2,
        averageRating: 4.5,
        star1: 0,
        star2: 0,
        star3: 0,
        star4: 1,
        star5: 1,
      },
    ]);

    const res = mockRes();
    await getTestimonialStats({}, res);

    expect(Testimonial.aggregate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      stats: {
        total: 2,
        averageRating: 4.5,
        distribution: [
          { stars: 5, count: 1, percent: 50 },
          { stars: 4, count: 1, percent: 50 },
          { stars: 3, count: 0, percent: 0 },
          { stars: 2, count: 0, percent: 0 },
          { stars: 1, count: 0, percent: 0 },
        ],
      },
    });
  });

  it("rejects invalid ratings on create", async () => {
    const req = {
      user: { _id: "u1", organization: null },
      body: { rating: 6, comment: "This is a valid length comment" },
    };
    const res = mockRes();
    await createTestimonial(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Testimonial.create).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only comments", async () => {
    const req = {
      user: { _id: "u1" },
      body: { rating: 5, comment: "     " },
    };
    const res = mockRes();
    await createTestimonial(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("prevents duplicate submissions for the same user", async () => {
    Testimonial.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "existing" }),
    });

    const req = {
      user: { _id: "u1", organization: null },
      body: {
        rating: 5,
        comment: "Another thoughtful review about the product",
      },
    };
    const res = mockRes();
    await createTestimonial(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(Testimonial.create).not.toHaveBeenCalled();
  });

  it("creates a pending testimonial for authenticated users", async () => {
    Testimonial.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    Testimonial.create.mockResolvedValue({ _id: "t1" });
    Testimonial.findById.mockReturnValue(
      chainFind({
        _id: "t1",
        rating: 5,
        comment: "Another thoughtful review about the product",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: "Ada", profilePic: "", role: "member" },
        organization: null,
      }),
    );

    // findById after create uses populate chain differently - fix mock
    const populateChain = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: "t1",
        rating: 5,
        comment: "Another thoughtful review about the product",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: "Ada", profilePic: "", role: "member" },
        organization: null,
      }),
    };
    populateChain.populate.mockReturnValue(populateChain);
    Testimonial.findById.mockReturnValue(populateChain);

    const req = {
      user: { _id: "u1", organization: "org1" },
      body: {
        rating: 5,
        comment: "Another thoughtful review about the product",
      },
    };
    const res = mockRes();
    await createTestimonial(req, res);

    expect(Testimonial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: "u1",
        status: "pending",
        rating: 5,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("blocks editing another user's testimonial", async () => {
    Testimonial.findById.mockResolvedValue({
      user: { toString: () => "owner-id" },
    });

    const req = {
      user: { _id: "other-user" },
      params: { id: "507f1f77bcf86cd799439011" },
      body: {
        rating: 4,
        comment: "Trying to edit someone else's review text",
      },
    };
    const res = mockRes();
    await updateTestimonial(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows owners to update and resets status to pending", async () => {
    const existing = {
      user: { toString: () => "u1" },
      _id: "507f1f77bcf86cd799439011",
      rating: 3,
      comment: "old",
      status: "approved",
      save: vi.fn().mockResolvedValue(undefined),
    };
    Testimonial.findById.mockResolvedValueOnce(existing).mockReturnValueOnce(
      (() => {
        const chain = {
          populate: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue({
            _id: existing._id,
            rating: 4,
            comment: "Updated thoughtful review about the product",
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { name: "Ada", profilePic: "", role: "member" },
            organization: null,
          }),
        };
        chain.populate.mockReturnValue(chain);
        return chain;
      })(),
    );

    const req = {
      user: { _id: "u1" },
      params: { id: "507f1f77bcf86cd799439011" },
      body: {
        rating: 4,
        comment: "Updated thoughtful review about the product",
      },
    };
    const res = mockRes();
    await updateTestimonial(req, res);

    expect(existing.status).toBe("pending");
    expect(existing.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("blocks deleting another user's testimonial", async () => {
    Testimonial.findById.mockResolvedValue({
      user: { toString: () => "owner-id" },
      deleteOne: vi.fn(),
    });

    const req = {
      user: { _id: "other" },
      params: { id: "507f1f77bcf86cd799439011" },
    };
    const res = mockRes();
    await deleteOwnTestimonial(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows admins to approve testimonials", async () => {
    const existing = {
      _id: "507f1f77bcf86cd799439011",
      status: "pending",
      save: vi.fn().mockResolvedValue(undefined),
    };
    Testimonial.findById.mockResolvedValueOnce(existing).mockReturnValueOnce(
      (() => {
        const chain = {
          populate: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue({
            _id: existing._id,
            rating: 5,
            comment: "Approved review content here",
            status: "approved",
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { _id: "u1", name: "Ada", profilePic: "", role: "member" },
            organization: null,
            moderatedAt: new Date(),
            moderatedBy: "admin1",
          }),
        };
        chain.populate.mockReturnValue(chain);
        return chain;
      })(),
    );

    const req = {
      user: { _id: "admin1", role: "admin" },
      params: { id: "507f1f77bcf86cd799439011" },
      body: { status: "approved" },
    };
    const res = mockRes();
    await updateTestimonialStatus(req, res);

    expect(existing.status).toBe("approved");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
