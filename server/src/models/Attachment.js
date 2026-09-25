const mongoose= require("mongoose");
const attachmentSchema = new  mongoose.Schema(
     {
      task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true,
      },
      originalName:{
        type: String,
        required: true,
      },
      fileName: {
        type: String,
        required: true,
      },
      filePath:{
        type : String,
        required: true,
      },
      mimeType:{
        type: String,
        required: true,
      },
      size:{
        type: Number,
        required: true,
      },
      uploadedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
     },
     {
      timestamps: true,
     }

);

module.exports= mongoose.model("Attachment", attachmentSchema);