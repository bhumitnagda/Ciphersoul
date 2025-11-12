const mongoose = require("mongoose");

const UserSettingsSchema =
  mongoose.models.UserSettings ||
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
      },
      preset: { type: String, default: "classic" },
      isDark: { type: Boolean, default: true },
      sessionTimeout: { type: Number, default: 30 }, // minutes
    },
    { timestamps: true }
  );

module.exports =
  mongoose.models.UserSettings ||
  mongoose.model("UserSettings", UserSettingsSchema);
