import mongoose from "mongoose";
import PhysicalResource from "../models/physicalResourceModel.js";
import ResourceBooking from "../models/resourceBookingModel.js";
import resourceBookingService from "../services/resourceBookingService.js";

describe("ResourceBookingService Time Overlap Tests", () => {
  let resource;
  let organizationId = new mongoose.Types.ObjectId();
  let meetingId = new mongoose.Types.ObjectId();
  let meetingId2 = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    // Setup in-memory db or connect to test DB if applicable
    // Note: Assuming a test database connection is established by Jest setup.
  });

  beforeEach(async () => {
    // Clean up
    await PhysicalResource.deleteMany({});
    await ResourceBooking.deleteMany({});

    resource = await PhysicalResource.create({
      name: "Conference Room A",
      type: "room",
      capacity: 10,
      location: "HQ",
      organization: organizationId,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("should create a booking successfully if time is available", async () => {
    const startTime = new Date("2026-10-01T13:00:00Z");
    const endTime = new Date("2026-10-01T14:00:00Z");

    const booking = await resourceBookingService.createBooking(
      resource._id,
      meetingId,
      startTime,
      endTime,
      organizationId,
    );

    expect(booking).toBeDefined();
    expect(booking.resourceId.toString()).toBe(resource._id.toString());
  });

  it("should fail to create a booking if it overlaps exactly", async () => {
    const startTime = new Date("2026-10-01T13:00:00Z");
    const endTime = new Date("2026-10-01T14:00:00Z");

    await resourceBookingService.createBooking(
      resource._id,
      meetingId,
      startTime,
      endTime,
      organizationId,
    );

    await expect(
      resourceBookingService.createBooking(
        resource._id,
        meetingId2,
        startTime,
        endTime,
        organizationId,
      ),
    ).rejects.toThrow("Resource is not available during the requested time.");
  });

  it("should fail to create a booking if it overlaps partially (starts earlier, ends during)", async () => {
    await resourceBookingService.createBooking(
      resource._id,
      meetingId,
      new Date("2026-10-01T13:30:00Z"),
      new Date("2026-10-01T14:30:00Z"),
      organizationId,
    );

    await expect(
      resourceBookingService.createBooking(
        resource._id,
        meetingId2,
        new Date("2026-10-01T13:00:00Z"),
        new Date("2026-10-01T14:00:00Z"),
        organizationId,
      ),
    ).rejects.toThrow("Resource is not available during the requested time.");
  });

  it("should fail to create a booking if it overlaps partially (starts during, ends later)", async () => {
    await resourceBookingService.createBooking(
      resource._id,
      meetingId,
      new Date("2026-10-01T13:00:00Z"),
      new Date("2026-10-01T14:00:00Z"),
      organizationId,
    );

    await expect(
      resourceBookingService.createBooking(
        resource._id,
        meetingId2,
        new Date("2026-10-01T13:30:00Z"),
        new Date("2026-10-01T14:30:00Z"),
        organizationId,
      ),
    ).rejects.toThrow("Resource is not available during the requested time.");
  });

  it("should fail to create a booking if it encompasses an existing booking", async () => {
    await resourceBookingService.createBooking(
      resource._id,
      meetingId,
      new Date("2026-10-01T13:30:00Z"),
      new Date("2026-10-01T14:00:00Z"),
      organizationId,
    );

    await expect(
      resourceBookingService.createBooking(
        resource._id,
        meetingId2,
        new Date("2026-10-01T13:00:00Z"),
        new Date("2026-10-01T14:30:00Z"),
        organizationId,
      ),
    ).rejects.toThrow("Resource is not available during the requested time.");
  });

  it("should create a booking successfully if it is adjacent to an existing booking", async () => {
    await resourceBookingService.createBooking(
      resource._id,
      meetingId,
      new Date("2026-10-01T13:00:00Z"),
      new Date("2026-10-01T14:00:00Z"),
      organizationId,
    );

    const booking = await resourceBookingService.createBooking(
      resource._id,
      meetingId2,
      new Date("2026-10-01T14:00:00Z"),
      new Date("2026-10-01T15:00:00Z"),
      organizationId,
    );

    expect(booking).toBeDefined();
  });
});
