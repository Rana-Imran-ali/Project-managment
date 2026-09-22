const mongoose = require("mongoose");
const taskSchema = new mongoose.Schema(
  {
    title:{
        type: String,
        required:true,
        trim: true,
        maxlength:200,
    },
    description:{
        type:String,
        trim: true,
        default:"",
    },
    project:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true,

    },
    assignedTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "User",
        default:null,
    },
    status:{
        type:String,
        enum:["todo", "in-progress", "cmpleted"],
        default:"todo",
    },
    priority:{
        type:String,
        enum:["low", "medium", "high"],
        default:"medium",
    },
    dueDate:{
        type:Date,
        type:null,
    },

  },
  {
    timestamps: true,
  }  
);
module.exports=mongoose.model("Task", taskSchema);
