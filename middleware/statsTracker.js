// backend/middleware/statsTracker.js
const Note = require("../models/Note");
const User = require("../models/User");

function countWords(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function statsTracker(req, res, next) {
  const originalSend = res.send;
  res.send = async function (data) {
    try {
      if (
        (req.method === "POST" || req.method === "PUT") &&
        req.originalUrl.includes("/notes")
      ) {
        // Prefer metrics provided in the incoming request body (client should compute before encrypting)
        const reqBody =
          req.body && typeof req.body === "object" ? req.body : null;
        const reqMetrics =
          reqBody && reqBody.metrics && typeof reqBody.metrics === "object"
            ? reqBody.metrics
            : null;

        // Parse response body if needed (fallback)
        const noteData = typeof data === "string" ? JSON.parse(data) : data;
        const resMetrics =
          noteData && noteData.metrics && typeof noteData.metrics === "object"
            ? noteData.metrics
            : null;

        // Determine note id: prefer req.params.id, then response id
        const noteId =
          req.params?.id ||
          (noteData && (noteData._id || noteData.id)
            ? noteData._id || noteData.id
            : null);

        if (!noteId) {
          console.error(
            "Stats tracking: no note id available, skipping metrics update"
          );
          return originalSend.apply(res, arguments);
        }

        // Prefer request metrics; fallback to response metrics
        const clientMetrics = reqMetrics || resMetrics || null;

        // Load previous note (to compute fallback delta if needed)
        const prevNote = await Note.findById(noteId)
          .lean()
          .catch(() => null);

        const prevWordCount =
          prevNote &&
          prevNote.metrics &&
          typeof prevNote.metrics.wordCount === "number"
            ? prevNote.metrics.wordCount
            : 0;

        const prevDailyDate =
          prevNote && prevNote.metrics && prevNote.metrics.dailyDeltaDate
            ? String(prevNote.metrics.dailyDeltaDate)
            : null;
        const prevDailyDelta =
          prevNote &&
          prevNote.metrics &&
          typeof prevNote.metrics.dailyDelta === "number"
            ? prevNote.metrics.dailyDelta
            : 0;

        const update = { $set: {}, $inc: {} };

        // Use explicit delta if provided by client; otherwise fall back to compute from wordCount
        let delta = 0;
        if (clientMetrics && typeof clientMetrics.wordCountDelta === "number") {
          delta = Math.max(0, clientMetrics.wordCountDelta);
        } else if (
          clientMetrics &&
          typeof clientMetrics.wordCount === "number"
        ) {
          delta = Math.max(0, clientMetrics.wordCount - prevWordCount);
        }

        // If client provided a numeric wordCount, set it
        if (clientMetrics && typeof clientMetrics.wordCount === "number") {
          const newWordCount = clientMetrics.wordCount;
          update.$set["metrics.wordCount"] = newWordCount;
          update.$set["metrics.readingTime"] = Math.max(
            1,
            Math.ceil(newWordCount / 200)
          );
        }

        // Accumulate per-note dailyDelta if applicable
        const todayStr = new Date().toISOString().split("T")[0];
        if (delta > 0) {
          if (prevDailyDate === todayStr) {
            update.$set["metrics.dailyDelta"] = (prevDailyDelta || 0) + delta;
          } else {
            update.$set["metrics.dailyDelta"] = delta;
          }
          update.$set["metrics.dailyDeltaDate"] = todayStr;
        } else if (prevDailyDate === todayStr && prevDailyDelta) {
          // keep existing today's delta if no new delta reported
          update.$set["metrics.dailyDelta"] = prevDailyDelta;
          update.$set["metrics.dailyDeltaDate"] = todayStr;
        }

        // Clean empty operators
        if (Object.keys(update.$set).length === 0) delete update.$set;
        if (Object.keys(update.$inc).length === 0) delete update.$inc;

        // Apply update
        await Note.findByIdAndUpdate(noteId, update, { new: true }).catch((e) =>
          console.error("StatsTracker DB update error:", e)
        );
      }
    } catch (err) {
      console.error("Stats tracking error:", err);
    }
    return originalSend.apply(res, arguments);
  };
  next();
}

module.exports = statsTracker;
