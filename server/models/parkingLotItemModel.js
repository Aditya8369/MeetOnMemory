import mongoose from "mongoose";

const parkingLotItemSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    sourceMeetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Topic exceeds maximum length of 1000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "scheduled", "discarded"],
      default: "pending",
    },
    scheduledForMeetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes for query performance
parkingLotItemSchema.index({ organization: 1, status: 1 });
parkingLotItemSchema.index({ sourceMeetingId: 1 });

const ParkingLotItem = mongoose.model("ParkingLotItem", parkingLotItemSchema);

export default ParkingLotItem;
