const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(

    {
        name: {
            type:String,
            required: true,
            trim: true,

        },

        email:{
            type: String,
            required: true,
            unique: true,
            lowercase:true,
            trim: true,
        },

         password:{
            type:String,
            required: true,
         },
         role:{
            type:String,
            enum:["admin","manager", "member"],
            default: "member",

         },

    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias for backward compatibility with 'avater'
userSchema.virtual("avater")
  .get(function () {
    return this.avatar;
  })
  .set(function (v) {
    this.avatar = v;
  });

const User = mongoose.model("User", userSchema);
module.exports = User;