// backend/routes/noteRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Import the auth middleware
const Note = require("../models/Note"); // Import the Note model

// @route   PUT api/notes/:id
// @desc    Update an existing note (content only)
// @access  Private (requires token)
router.put("/:id", auth, async (req, res) => {
  const { content } = req.body;

  // Basic validation
  if (!content) {
    return res
      .status(400)
      .json({ msg: "Note content is required for update." });
  }

  try {
    // Find the note by ID and ensure it belongs to the authenticated user
    let note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, // Find by note ID and user ID
      { $set: { content: content } }, // Set the new encrypted content
      { new: true } // Return the updated document
    );

    if (!note) {
      // Note wasn't found or didn't belong to the user
      return res
        .status(404)
        .json({ msg: "Note not found or authorization failed." });
    }

    res.json(note);
  } catch (err) {
    console.error("Note Update Error:", err.message);
    // MongoDB ID validation failure will also land here
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Invalid Note ID format." });
    }
    res.status(500).send("Server Error during note update.");
  }
});

// @route   POST api/notes
// @desc    Create a new encrypted note
// @access  Private (requires token)
router.post("/", auth, async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ msg: "Note content is required." });
  }

  try {
    // 1. Create a new Note instance using the user ID from the 'auth' middleware
    const newNote = new Note({
      user: req.user.id, // req.user.id comes from the JWT payload
      content: content, // The content is already encrypted by the frontend
    });

    // 2. Save to database
    const note = await newNote.save();
    res.json(note);
  } catch (err) {
    // Log the detailed error for debugging (this is why you got the 500)
    console.error("Note Save Error:", err.message);
    res.status(500).send("Server Error during note save.");
  }
});

// @route   GET api/notes
// @desc    Get all encrypted notes for the current user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ date: -1 });
    // The notes are sent to the frontend *still encrypted*.
    res.json(notes);
  } catch (err) {
    console.error("Note Fetch Error:", err.message);
    res.status(500).send("Server Error during note retrieval.");
  }
});

// @route   DELETE api/notes/:id
// @desc    Delete a note
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    // Find the note by ID and ensure it belongs to the authenticated user
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!note) {
      return res
        .status(404)
        .json({ msg: "Note not found or user unauthorized." });
    }

    res.json({ msg: "Note successfully deleted" });
  } catch (err) {
    console.error("Note Delete Error:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Invalid Note ID format." });
    }
    res.status(500).send("Server Error during note deletion.");
  }
});

module.exports = router; // Make sure this is at the end
