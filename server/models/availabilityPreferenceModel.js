import mongoose from "mongoose";

const availabilityPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    weeklyHours: {
      type: [
        {
          dayOfWeek: {
            type: Number, // 0 = Sunday, 1 = Monday, etc.
            required: true,
            min: 0,
            max: 6,
          },
          startTime: {
            type: String, // HH:mm format
            default: "09:00",
          },
          endTime: {
            type: String, // HH:mm format
            default: "17:00",
          },
          isAvailable: {
            type: Boolean,
            default: true,
          },
        },
      ],
      default: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        },
        {
          dayOfWeek: 2,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        },
        {
          dayOfWeek: 3,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        },
        {
          dayOfWeek: 4,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        },
        {
          dayOfWeek: 5,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        },
      ],
    },
    meetingLoadLimit: {
      type: Number,
      default: 4, // 4 hours per day maximum by default
    },
    bufferBetweenMeetings: {
      type: Number,
      default: 0, // Minutes
    },
  },
  { timestamps: true },
);

// Ensure one preference per user per org
availabilityPreferenceSchema.index(
  { user: 1, organization: 1 },
  { unique: true },
);

const AvailabilityPreference =
  mongoose.models.AvailabilityPreference ||
  mongoose.model("AvailabilityPreference", availabilityPreferenceSchema);

export default AvailabilityPreference;
