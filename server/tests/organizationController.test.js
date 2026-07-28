import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { createOrJoinOrganization, joinOrganization } from "../controllers/organizationController.js";
import Organization from "../models/organizationModel.js";
import userModel from "../models/userModel.js";
import AuditService from "../services/AuditService.js";
import Membership from "../models/membershipModel.js";

// Mock dependencies
const OrganizationMock = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};
jest.mock("../models/organizationModel.js", () => ({
  __esModule: true,
  default: OrganizationMock,
}));

const userModelMock = {
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn(),
};
jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: userModelMock,
}));

const AuditServiceMock = {
  logAction: jest.fn(),
};
jest.mock("../services/AuditService.js", () => ({
  __esModule: true,
  default: AuditServiceMock,
}));

jest.mock("../services/notificationService.js", () => ({
  __esModule: true,
  createAndPushNotification: jest.fn(),
}));

// Provide a fake mock for membershipModel to avoid import issues from within the controller
const MembershipMock = {
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
};
jest.mock("../models/membershipModel.js", () => ({
  __esModule: true,
  default: MembershipMock,
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createOrJoinOrganization,
  getOrganizationSettings,
  updateOrganization,
} from "../controllers/organizationController.js";
import * as OrganizationService from "../services/OrganizationService.js";

// Mock the service layer
vi.mock("../services/OrganizationService.js", () => ({
  createOrJoinOrganization: vi.fn(),
  getOrganizationSettings: vi.fn(),
  updateOrganization: vi.fn(),
}));

describe("organizationController - createOrJoinOrganization", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { id: "user123" },
      body: { name: "Test Org" },
      query: {},
      params: {},
      app: {
        get: jest.fn().mockReturnValue({}), // mock io
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should return 401 if user is not authenticated", async () => {
    req.user = null;

    await createOrJoinOrganization(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Authentication failed.",
    });
  });

  it("should return 400 if organization name is missing", async () => {
    req.body.name = "";

    await createOrJoinOrganization(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Please provide an organization name.",
    });
  });

  it("should create a new organization if it does not exist", async () => {
    // Mock that org doesn't exist
    OrganizationMock.findOne.mockResolvedValue(null);

    // Mock org creation
    const mockCreatedOrg = {
      _id: "org123",
      name: "Test Org",
      members: ["user123"],
    };
    OrganizationMock.create.mockResolvedValue(mockCreatedOrg);

    // Mock Membership creation
    MembershipMock.create.mockResolvedValue({});

    // Mock user update & find
    userModelMock.findByIdAndUpdate.mockResolvedValue(true);
    userModelMock.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "user123",
        role: "admin",
        organization: mockCreatedOrg,
        _doc: { name: "Test User" },
      }),
    });

    await createOrJoinOrganization(req, res);

    expect(OrganizationMock.findOne).toHaveBeenCalled();
    expect(OrganizationMock.create).toHaveBeenCalled();
    expect(MembershipMock.create).toHaveBeenCalledWith({
      user: "user123",
      organization: "org123",
      role: "admin",
      status: "active",
    });
    expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
      role: "admin",
      organization: "org123",
      hasCompletedOnboarding: true,
    });
    expect(AuditServiceMock.logAction).toHaveBeenCalled();
    
    const mockResult = {
      success: true,
      message: "Organization created successfully!",
      userData: {
        name: "Test User",
        role: "Admin",
        organization: {
          _id: "org123",
          name: "Test Org",
        },
      },
    };

    OrganizationService.createOrJoinOrganization.mockResolvedValue(mockResult);

    await createOrJoinOrganization(req, res);

    expect(OrganizationService.createOrJoinOrganization).toHaveBeenCalledWith(
      "user123",
      "Test Org",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Organization created successfully!",
      }),
    );
  });

  it("should join an existing organization", async () => {
    const mockResult = {
      success: true,
      message: "Joined existing organization successfully.",
      userData: {
        name: "Test User",
        role: "Member",
        organization: {
          _id: "org123",
          name: "Test Org",
        },
      },
    };

    OrganizationService.createOrJoinOrganization.mockResolvedValue(mockResult);

    await createOrJoinOrganization(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Joined existing organization successfully.",
      }),
    );
  });

  it("should return 500 on service error without statusCode", async () => {
    OrganizationService.createOrJoinOrganization.mockRejectedValue(
      new Error("Database connection failed"),
    );

    await createOrJoinOrganization(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database connection failed",
    });
  });

  it("should forward typed error status codes from the service", async () => {
    const error = new Error("Organization not found.");
    error.statusCode = 404;
    OrganizationService.createOrJoinOrganization.mockRejectedValue(error);

    await createOrJoinOrganization(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Organization not found.",
    });
  });
});

describe("organizationController - getOrganizationSettings & updateOrganization", () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { id: "user123" },
      body: {},
      query: {},
      params: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it("getOrganizationSettings should call service and return 200", async () => {
    const mockPayload = {
      success: true,
      organization: { _id: "org123", name: "Acme" },
      userRole: "owner",
      canEdit: true,
    };
    OrganizationService.getOrganizationSettings.mockResolvedValue(mockPayload);

    await getOrganizationSettings(req, res);

    expect(OrganizationService.getOrganizationSettings).toHaveBeenCalledWith(
      "user123",
      null,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("updateOrganization should call service and return updated organization", async () => {
    req.params.id = "org123";
    req.body = { name: "Updated Acme", contactEmail: "contact@acme.com" };

    const mockResult = {
      success: true,
      message: "Organization settings updated successfully.",
      organization: { _id: "org123", name: "Updated Acme" },
    };
    OrganizationService.updateOrganization.mockResolvedValue(mockResult);

    await updateOrganization(req, res);

    expect(OrganizationService.updateOrganization).toHaveBeenCalledWith(
      "user123",
      "org123",
      req.body,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("should join existing organization and create Membership record", async () => {
    // Mock that org exists
    const mockExistingOrg = {
      _id: "org456",
      name: "Test Org",
      members: [],
      createdBy: "admin123",
    };
    OrganizationMock.findOne.mockResolvedValue(mockExistingOrg);

    // Mock Membership upsert
    MembershipMock.findOneAndUpdate.mockResolvedValue({});

    // Mock org save
    mockExistingOrg.save = jest.fn().mockResolvedValue(mockExistingOrg);

    // Mock user update & find
    userModelMock.findByIdAndUpdate.mockResolvedValue(true);
    userModelMock.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "user123",
        role: "member",
        organization: mockExistingOrg,
        _doc: { name: "Test User" },
      }),
    });

    await createOrJoinOrganization(req, res);

    expect(OrganizationMock.findOne).toHaveBeenCalled();
    expect(MembershipMock.findOneAndUpdate).toHaveBeenCalledWith(
      { user: "user123", organization: "org456" },
      {
        user: "user123",
        organization: "org456",
        role: "member",
        status: "active",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
      role: "member",
      organization: "org456",
      hasCompletedOnboarding: true,
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Joined existing organization successfully.",
      })
    );
  });
});

describe("organizationController - joinOrganization", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { id: "user123" },
      body: { organizationId: "org456" },
      app: {
        get: jest.fn().mockReturnValue({}), // mock io
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should join organization by ID and create Membership record", async () => {
    // Mock org exists
    const mockOrg = {
      _id: "org456",
      name: "Test Org",
      members: [],
      createdBy: "admin123",
    };
    OrganizationMock.findById.mockResolvedValue(mockOrg);

    // Mock Membership upsert
    MembershipMock.findOneAndUpdate.mockResolvedValue({});

    // Mock org save
    mockOrg.save = jest.fn().mockResolvedValue(mockOrg);

    // Mock user update & find
    userModelMock.findByIdAndUpdate.mockResolvedValue(true);
    userModelMock.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "user123",
        role: "member",
        organization: mockOrg,
      }),
    });

    await joinOrganization(req, res);

    expect(OrganizationMock.findById).toHaveBeenCalledWith("org456");
    expect(MembershipMock.findOneAndUpdate).toHaveBeenCalledWith(
      { user: "user123", organization: "org456" },
      {
        user: "user123",
        organization: "org456",
        role: "member",
        status: "active",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
      role: "member",
      organization: "org456",
      hasCompletedOnboarding: true,
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Joined organization successfully.",
      })
    );
  });

  it("should prevent duplicate Membership records when already a member", async () => {
    // Mock org exists with user already in members
    const mockOrg = {
      _id: "org456",
      name: "Test Org",
      members: ["user123"],
      createdBy: "admin123",
    };
    OrganizationMock.findById.mockResolvedValue(mockOrg);

    // Mock Membership upsert (should still be called but won't duplicate due to unique index)
    MembershipMock.findOneAndUpdate.mockResolvedValue({});

    // Mock user update & find
    userModelMock.findByIdAndUpdate.mockResolvedValue(true);
    userModelMock.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "user123",
        role: "member",
        organization: mockOrg,
      }),
    });

    await joinOrganization(req, res);

    // Membership.findOneAndUpdate should still be called with upsert
    expect(MembershipMock.findOneAndUpdate).toHaveBeenCalledWith(
      { user: "user123", organization: "org456" },
      {
        user: "user123",
        organization: "org456",
        role: "member",
        status: "active",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
