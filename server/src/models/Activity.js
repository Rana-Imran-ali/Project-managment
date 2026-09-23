const mongoose= require("mongoose");
const activitySchema = new mongoose.Schema(
    {
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        project:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        task:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },
        action:{
            type: String,
            enum:[
                "project-created",
                "project-updated",
                "project-deleted",
                "task-created",
                "task-updated",
                "task-completed",
                "task-deleted",
                "comment-added",
                "comment-updated",
                "comment-deleted",
                "task-assigned",
            ],
            required: true,
        },
        description:{
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);
module.exports = mongoose.model("Activity", activitySchema);