const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Note = require("../models/Note"); // <-- Import Note model
const auth = require("../middleware/auth"); // <-- Import auth middleware
const UserSettings = require("../models/UserSettings"); // <-- new

// @route   POST api/auth/register
// @desc    Register new user
router.post("/register", async (req, res) => {
  let { username, password } = req.body;
  username = typeof username === "string" ? username.trim().toLowerCase() : "";
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: "User already exists" });

    user = new User({ username, password });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      async (err, token) => {
        if (err) throw err;
        // create default settings for the new user
        try {
          await UserSettings.findOneAndUpdate(
            { user: user.id },
            {
              $setOnInsert: {
                preset: "classic",
                isDark: true,
                sessionTimeout: 30,
              },
            },
            { upsert: true }
          );
        } catch (e) {
          console.error("Failed to create default user settings:", e);
        }
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post("/login", async (req, res) => {
  let { username, password } = req.body;
  username = typeof username === "string" ? username.trim().toLowerCase() : "";
  try {
    let user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "Invalid Credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid Credentials" });

    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   DELETE api/auth/delete
// @desc    Delete user account and all their notes
// @access  Private
router.delete("/delete", auth, async (req, res) => {
  try {
    // 1. Delete all notes associated with the user
    await Note.deleteMany({ user: req.user.id });

    // 2. Delete the user account
    await User.findByIdAndDelete(req.user.id);

    res.json({
      msg: "User account and all associated data have been permanently deleted.",
    });
  } catch (err) {
    console.error("Account Deletion Error:", err.message);
    res.status(500).send("Server error during account deletion.");
  }
});

// New: get user preferences
router.get("/preferences", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const prefs = await UserSettings.findOne({ user: userId }).lean();
    if (!prefs) {
      return res.json({ preset: "classic", isDark: true, sessionTimeout: 30 });
    }
    return res.json({
      preset: prefs.preset || "classic",
      isDark: typeof prefs.isDark === "boolean" ? prefs.isDark : true,
      sessionTimeout:
        typeof prefs.sessionTimeout === "number" ? prefs.sessionTimeout : 30,
    });
  } catch (err) {
    console.error("Get preferences error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// New: update user preferences
router.put("/preferences", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preset, isDark, sessionTimeout } = req.body;
    const update = {};
    if (typeof preset === "string") update.preset = preset;
    if (typeof isDark === "boolean") update.isDark = isDark;
    if (typeof sessionTimeout === "number")
      update.sessionTimeout = sessionTimeout;

    const prefs = await UserSettings.findOneAndUpdate(
      { user: userId },
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return res.json({ ok: true, prefs });
  } catch (err) {
    console.error("Update preferences error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
