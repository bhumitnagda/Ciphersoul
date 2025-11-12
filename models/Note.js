// backend/models/Note.js
const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema(
  {
    // Store the ID of the user who owns this note
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Store the ENCRYPTED content (no unique constraint needed here)
    content: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
      },
    ],
    version: [
      {
        content: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metrics: {
      wordCount: { type: Number, default: 0 },
      readingTime: { type: Number, default: 0 },
      editCount: { type: Number, default: 0 },
      lastModified: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now },
    },
    status: {
      isCompleted: { type: Boolean, default: false },
      priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
      },
      dueDate: Date,
      reminderSet: Boolean,
    },
    security: {
      lastAccessed: Date,
      accessCount: { type: Number, default: 0 },
      modificationHistory: [
        {
          timestamp: Date,
          ipAddress: String,
          userAgent: String,
        },
      ],
      version: { type: Number, default: 1 },
      isLocked: { type: Boolean, default: false },
      encryptionStrength: {
        type: Number,
        default: 0, // Calculated based on content patterns
      },
      accessHistory: [
        {
          timestamp: Date,
          deviceFingerprint: String, // Hashed device identifier
          accessType: {
            type: String,
            enum: ["read", "edit", "export", "delete"],
          },
        },
      ],
      modificationPatterns: {
        averageEditTime: Number,
        lastModified: Date,
        editCount: { type: Number, default: 0 },
        unusualActivityFlags: [String],
      },
      backupStatus: {
        lastBackup: Date,
        backupCount: { type: Number, default: 0 },
        isEncrypted: { type: Boolean, default: true },
      },
      privacyScore: {
        type: Number,
        default: 100, // Decreases based on potential privacy risks
      },
    },
  },
  { timestamps: true }
); // Add timestamps for createdAt/updatedAt

// Update pre-save middleware to properly track metrics
NoteSchema.pre("save", async function (next) {
  if (this.isModified("content")) {
    // Calculate real word count by splitting on whitespace and filtering empty strings
    const words = this.content.split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;
    const now = new Date();

    // Ensure metrics object exists with all required fields
    this.metrics = {
      wordCount: wordCount,
      readingTime: Math.ceil(wordCount / 200),
      editCount: (this.metrics?.editCount || 0) + 1,
      lastModified: now,
      createdAt: this.metrics?.createdAt || now,
    };

    // Track daily activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Store daily stats in the metrics
    if (!this.metrics.dailyStats) {
      this.metrics.dailyStats = [];
    }

    const todayStats = this.metrics.dailyStats.find(
      (stat) => new Date(stat.date).getTime() === today.getTime()
    );

    if (todayStats) {
      todayStats.wordCount = wordCount;
      todayStats.editCount = (todayStats.editCount || 0) + 1;
    } else {
      this.metrics.dailyStats.push({
        date: today,
        wordCount,
        editCount: 1,
      });
    }
  }
  next();
});

// Add security monitoring middleware
NoteSchema.pre("save", function (next) {
  // Update security metrics
  this.security.privacyScore = calculatePrivacyScore(this);
  this.security.encryptionStrength = calculateEncryptionStrength(this);
  next();
});

function calculatePrivacyScore(note) {
  let score = 100;

  // Check for personal information patterns
  const personalInfoPatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email addresses
    /\b\d{16,19}\b/, // Potential credit card numbers
    /\b(?:\d[ -]*?){3,4}[ -]*?\d{4}\b/, // Various number patterns
  ];

  personalInfoPatterns.forEach((pattern) => {
    if (pattern.test(note.content)) score -= 15;
  });

  // Check access patterns
  const recentAccesses = note.security.accessHistory || [];
  if (recentAccesses.length > 10) score -= 5;

  // Check modification frequency
  if (note.security.modificationPatterns.editCount > 20) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function calculateEncryptionStrength(note) {
  let strength = 100;

  // Check content length (longer content needs stronger encryption)
  if (note.content.length < 100) strength -= 10;

  // Check backup status
  if (!note.security.backupStatus.isEncrypted) strength -= 30;

  // Check modification patterns
  if (note.security.modificationPatterns.unusualActivityFlags.length > 0) {
    strength -= 15;
  }

  return Math.max(0, Math.min(100, strength));
}

module.exports = mongoose.model("Note", NoteSchema);
