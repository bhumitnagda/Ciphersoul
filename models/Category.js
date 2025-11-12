const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: "#808080",
    },
    icon: {
      type: String,
      default: "📁",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);
