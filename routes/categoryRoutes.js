const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Category = require("../models/Category");

// Get all categories
router.get("/", auth, async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user.id });
    res.json(categories);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Create category
router.post("/", auth, async (req, res) => {
  try {
    const newCategory = new Category({
      user: req.user.id,
      name: req.body.name,
      color: req.body.color,
      icon: req.body.icon,
    });

    const category = await newCategory.save();
    res.json(category);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;
