const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    filename: {
      type: String,
      required: true,
    },

    mimetype: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
    },

    path: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Attachment", attachmentSchema);