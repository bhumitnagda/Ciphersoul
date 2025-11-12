const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Note = require("../models/Note");
const mongoose = require("mongoose");

// Define lightweight per-user daily stat model (inline to avoid adding new files)
const UserDailyStatSchema =
  mongoose.models.UserDailyStat ||
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      date: { type: String, required: true }, // YYYY-MM-DD
      words: { type: Number, default: 0 },
    },
    { timestamps: true }
  );
const UserDailyStat =
  mongoose.models.UserDailyStat ||
  mongoose.model("UserDailyStat", UserDailyStatSchema);

// New endpoint: accept anonymous daily word delta (no note identifiers)
router.post("/track", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const delta = Number(req.body.delta) || 0;
    if (!delta || delta <= 0)
      return res.status(400).json({ msg: "Invalid delta" });

    const date = req.body.date || new Date().toISOString().split("T")[0];

    await UserDailyStat.findOneAndUpdate(
      { user: userId, date },
      { $inc: { words: delta } },
      { upsert: true, new: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("Track Error:", err);
    return res.status(500).json({ msg: "Track failed" });
  }
});

router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Analytics request for user:", userId);

    // Fetch all user notes
    const notes = await Note.find({ user: userId });
    const totalNotes = notes.length;

    // Time range: last N days (365 days heatmap)
    const DAYS = 365;
    const now = new Date();

    // Use UTC-based "today" to avoid timezone shifts (ensure server and client align on day keys)
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    // Initialize day map for last DAYS days in chronological order (oldest -> newest)
    const dayMap = new Map();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().split("T")[0];
      dayMap.set(key, { wordCount: 0, editCount: 0 });
    }

    // Helper to get day key from a date-like value (normalize to UTC date string)
    const dayKeyFrom = (value) => {
      if (!value) return null;
      const d = new Date(value);
      if (isNaN(d)) return null;
      const utc = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      );
      return utc.toISOString().split("T")[0];
    };

    // Aggregate notes into dayMap (per-note dailyDelta)
    let totalWords = 0;
    notes.forEach((note) => {
      const metrics =
        note.metrics && typeof note.metrics === "object" ? note.metrics : null;

      const wordsTotal =
        metrics && typeof metrics.wordCount === "number"
          ? metrics.wordCount
          : 0;
      if (Number.isFinite(wordsTotal)) totalWords += wordsTotal;

      if (
        metrics &&
        typeof metrics.dailyDelta === "number" &&
        metrics.dailyDelta > 0 &&
        metrics.dailyDeltaDate
      ) {
        const dateStr = dayKeyFrom(metrics.dailyDeltaDate);
        if (dateStr && dayMap.has(dateStr)) {
          const prev = dayMap.get(dateStr);
          dayMap.set(dateStr, {
            wordCount: prev.wordCount + metrics.dailyDelta,
            editCount: prev.editCount + 1,
          });
        }
      } else {
        // fallback: tag edit day
        const lastModified =
          metrics?.lastModified || note.updatedAt || note.createdAt;
        const key = dayKeyFrom(lastModified);
        if (key && dayMap.has(key)) {
          const prev = dayMap.get(key);
          dayMap.set(key, {
            wordCount: prev.wordCount + 0,
            editCount: prev.editCount + 1,
          });
        }
      }
    });

    // Merge anonymous per-user daily stats into dayMap
    const dayKeys = Array.from(dayMap.keys());
    const userStats = await UserDailyStat.find({
      user: userId,
      date: { $in: dayKeys },
    }).lean();

    
   // console.debug("Analytics: fetched userStats", {
  //    userStatsCount: userStats.length,
    //  sample: userStats.slice(0, 4),
   // });
    

    userStats.forEach((doc) => {
      if (doc && doc.date && Number(doc.words)) {
        const prev = dayMap.get(doc.date);
        if (prev) {
          dayMap.set(doc.date, {
            wordCount: prev.wordCount + doc.words,
            editCount: prev.editCount, // anonymous deltas don't imply edits
          });
        }
      }
    });

    // dayKeys in chronological order (oldest -> newest)
    const dayKeysAsc = Array.from(dayMap.keys());

    // Build heatmap array (oldest -> newest)
    const heatmap = dayKeysAsc.map((date) => {
      const { wordCount, editCount } = dayMap.get(date) || {
        wordCount: 0,
        editCount: 0,
      };
      return { date, wordCount, editCount };
    });

    // Debug: log the range of dates returned in heatmap and presence of today (UTC)
    console.debug("Analytics: heatmap range", {
      firstDate: heatmap.length ? heatmap[0].date : "<none>",
      lastDate: heatmap.length ? heatmap[heatmap.length - 1].date : "<none>",
      todayUTC: today.toISOString().split("T")[0],
      todayIncluded: heatmap.some(
        (h) => h.date === today.toISOString().split("T")[0]
      ),
    });

    // dailyStats (newest -> oldest)
    const dailyStats = Array.from(dayMap, ([date, stats]) => ({
      _id: date,
      ...stats,
    })).sort((a, b) => b._id.localeCompare(a._id));

    // Today words: sum of dailyDelta values recorded for today across notes
    const todayKey = today.toISOString().split("T")[0];
    const todayWords = dayMap.get(todayKey)?.wordCount || 0;

    // Compute current streak (scan backwards from today) using daily added words presence
    let currentStreak = 0;
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const wc = dayMap.get(key)?.wordCount || 0;
      if (wc > 0) currentStreak++;
      else break;
    }

    // Compute best streak by scanning oldest -> newest
    let bestStreak = 0;
    let running = 0;
    for (const key of dayKeysAsc) {
      const wc = dayMap.get(key)?.wordCount || 0;
      if (wc > 0) {
        running++;
        if (running > bestStreak) bestStreak = running;
      } else {
        running = 0;
      }
    }

    // Consistency: number of days written in last 7 days
    let last7DaysWritten = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      if ((dayMap.get(key)?.wordCount || 0) > 0) last7DaysWritten++;
    }

    // Build achievements
    const achievements = [
      {
        id: "firstNote",
        title: "First Note",
        description: "Create your first note",
        requirement: 1,
        progress: totalNotes,
        unlocked: totalNotes >= 1,
      },
      {
        id: "wordsmith-1k",
        title: "Wordsmith (1k)",
        description: "Write 1,000 words total",
        requirement: 1000,
        progress: totalWords,
        unlocked: totalWords >= 1000,
      },
      {
        id: "wordsmith-5k",
        title: "Wordsmith (5k)",
        description: "Write 5,000 words total",
        requirement: 5000,
        progress: totalWords,
        unlocked: totalWords >= 5000,
      },
      {
        id: "streak-3",
        title: "3-Day Streak",
        description: "Write for 3 consecutive days",
        requirement: 3,
        progress: currentStreak,
        unlocked: currentStreak >= 3,
      },
      {
        id: "streak-7",
        title: "7-Day Streak",
        description: "Write for 7 consecutive days",
        requirement: 7,
        progress: currentStreak,
        unlocked: currentStreak >= 7,
      },
      {
        id: "best-streak",
        title: "Best Streak",
        description: "Your longest writing streak",
        requirement: 1,
        progress: bestStreak,
        unlocked: bestStreak >= 1,
      },
      {
        id: "consistency-week",
        title: "Consistent One-Week",
        description: "Write on at least 4 days this week",
        requirement: 4,
        progress: last7DaysWritten,
        unlocked: last7DaysWritten >= 4,
      },
    ];

    const response = {
      stats: {
        currentStreak,
        bestStreak,
        totalNotes,
        totalWords,
        todayWords,
        heatmap, // oldest -> newest (words added per day)
        dailyStats, // newest -> oldest
        achievements,
      },
    };

    console.log("Analytics computed for user:", userId);
    res.json(response);
  } catch (err) {
    console.error("Analytics Error:", err);
    // Stable fallback response
    res.json({
      stats: {
        currentStreak: 0,
        bestStreak: 0,
        totalNotes: 0,
        totalWords: 0,
        todayWords: 0,
        heatmap: [],
        dailyStats: [],
        achievements: [],
      },
    });
  }
});

// Panic endpoint: delete all notes for the authenticated user (use with extreme caution)
router.post("/panic", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.warn(`Panic: user ${userId} requested deletion of all notes`);
    const result = await Note.deleteMany({ user: userId });
    // Optionally remove related daily stats
    await UserDailyStat.deleteMany({ user: userId }).catch(() => null);
    return res.json({
      ok: true,
      deletedCount: result.deletedCount || 0,
      msg: "All user notes (and daily stats) deleted",
    });
  } catch (err) {
    console.error("Panic delete error:", err);
    return res.status(500).json({ ok: false, msg: "Panic delete failed" });
  }
});

module.exports = router;
