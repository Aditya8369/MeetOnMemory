import mongoose from "mongoose";

const savedFilterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    filters: {
      type: Object,
      required: true,
      default: {},
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "#3B82F6", // blue-500
    },
    icon: {
      type: String,
      default: "Filter",
    },
    matchCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Indexes
savedFilterSchema.index({ user: 1, isPinned: -1 });
savedFilterSchema.index({ organization: 1, isShared: 1 });

const SavedFilter = mongoose.model("SavedFilter", savedFilterSchema);

export default SavedFilter;
