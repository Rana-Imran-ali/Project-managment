const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default:null,
        },
        sender:{
             type: mongoose.Schema.Types.ObjectId,
             ref: "User",
             default: null,
        },
        type:{
            type:String,
            enum:[
                "task-assigned",
                "task-completed",
                "comment-added",
                "project-added",
            ],
            required: true,
        },
        message:{
            type:String,
            required:true,
            trim:true,
        },
        project:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null,
        },
        task:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },
        isRead:{
            type:Boolean,
            default:false,
        },
    },
    {
        timestamps:true,
    }
);
module.exports= mongoose.model("Notification", notificationSchema);