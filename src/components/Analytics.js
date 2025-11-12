import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaFire, FaPen, FaCrown, FaTrophy } from "react-icons/fa";

const Analytics = ({ data, notes = [], fetchAnalytics }) => {
  // Now includes monthLabels that align with week columns
  const [heatmapData, setHeatmapData] = useState({
    weeks: [],
    labels: [],
    monthLabels: [],
  });

  // New: tooltip state for portal (avoids clipping from ancestor overflow)
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: "",
  });
  const heatmapRef = useRef(null);

  useEffect(() => {
    // no-op: avoid noisy analytics logs in console
  }, [data]);

  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  useEffect(() => {
    if (!data?.stats) return;
    generateHeatmapData();
    // eslint-disable-next-line
  }, [data]);

  const getLevel = (count) => {
    if (!count || count === 0) return 0;
    if (count < 50) return 1;
    if (count < 200) return 2;
    if (count < 500) return 3;
    return 4;
  };

  const generateHeatmapData = () => {
    // Build calendar-year heatmap (Jan 1 -> Dec 31) so months always start at Jan
    const now = new Date();
    const year = now.getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Create a lookup from server-provided heatmap or dailyStats
    const activitySource =
      data?.stats?.heatmap ||
      (data?.stats?.dailyStats || [])
        .slice()
        .reverse()
        .map((d) => ({ date: d._id, wordCount: d.wordCount || 0 }));

    const activityMap = new Map(
      (activitySource || []).map((item) => [item.date, item.wordCount || 0])
    );

    // If server didn't include today's day, try to find it in dailyStats explicitly
    const todayKey = new Date().toISOString().split("T")[0];
    if (!activityMap.has(todayKey) && data?.stats?.dailyStats) {
      const found = (data.stats.dailyStats || []).find(
        (d) => d._id === todayKey
      );
      if (found) {
        activityMap.set(todayKey, found.wordCount || 0);
      } else {
        // Ensure today's key exists so UI shows current day (zero if absent)
        activityMap.set(todayKey, activityMap.get(todayKey) || 0);
      }
    }

    // Build days for calendar year (Jan 1 -> Dec 31)
    const daysArr = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateISO = new Date(d).toISOString().split("T")[0];
      const count = activityMap.get(dateISO) || 0;
      daysArr.push({ date: dateISO, count, level: getLevel(count) });
    }

    // Prepend empty days so first column starts on Sunday
    const firstDayOfWeek = startDate.getDay(); // 0=Sunday
    const prefix = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      prefix.push({ date: "", count: 0, level: -1 });
    }
    const fullDays = prefix.concat(daysArr);

    // Chunk into weeks (columns)
    const weeks = [];
    for (let i = 0; i < fullDays.length; i += 7) {
      const week = fullDays.slice(i, i + 7);
      while (week.length < 7) week.push({ date: "", count: 0, level: -1 });
      weeks.push(week);
    }

    // Build month labels aligned with each week column.
    const monthLabels = new Array(weeks.length).fill("");
    const seen = new Set();
    const monthsNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi];
      // choose the first date in the week that belongs to the current calendar year
      // this avoids picking dates from the previous year (e.g. 2024-12-31) as the first label
      const firstThisYear = week.find(
        (d) => d.date && new Date(d.date).getFullYear() === year
      );
      if (firstThisYear) {
        const m = new Date(`${firstThisYear.date}T00:00:00`).getMonth();
        if (!seen.has(m)) {
          monthLabels[wi] = monthsNames[m];
          seen.add(m);
        }
      }
    }

    // (removed heatmap debug logging to reduce console noise)

    // attach tooltip text to each cell via data-tooltip when rendering below
    setHeatmapData({
      weeks,
      labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      monthLabels,
    });
  };

  // show tooltip (on mouse enter)
  const showTooltip = (e, text) => {
    if (!text) return;
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      text,
    });
  };

  // update tooltip position (on mouse move)
  const moveTooltip = (e) => {
    setTooltip((t) => (t.visible ? { ...t, x: e.clientX, y: e.clientY } : t));
  };

  // hide tooltip
  const hideTooltip = () => {
    setTooltip((t) => (t.visible ? { ...t, visible: false } : t));
  };

  if (!data?.stats) {
    return <div>Loading analytics...</div>;
  }

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className="main-content">
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <FaFire className="stat-icon" style={{ color: "#FF6B6B" }} />
          <div>
            <h3>Current Streak</h3>
            <p className="stat-value">{data.stats.currentStreak} days</p>
          </div>
        </div>

        <div className="stat-card">
          <FaPen className="stat-icon" style={{ color: "#4ECDC4" }} />
          <div>
            <h3>Today's Words</h3>
            <p className="stat-value">{data.stats.todayWords || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <FaCrown className="stat-icon" style={{ color: "#FFD93D" }} />
          <div>
            <h3>Total Notes</h3>
            <p className="stat-value">{data.stats.totalNotes || 0}</p>
          </div>
        </div>
      </div>

      <div className="heatmap-container">
        <h2>Writing Activity</h2>

        {/* heatmap wrapper (keep same layout). attach ref to wrapper */}
        <div className="heatmap-wrapper" ref={heatmapRef}>
          <div className="day-labels">
            {heatmapData.labels.map((day) => (
              <div key={day} className="day-label">
                {day}
              </div>
            ))}
          </div>

          <div className="weeks-container">
            {heatmapData.weeks.map((week, i) => (
              <div key={i} className="week">
                {week.map((day, j) => {
                  const tooltipText = day.date
                    ? `${new Date(
                        `${day.date}T00:00:00`
                      ).toLocaleDateString()}: ${day.count} words`
                    : "";
                  return (
                    <div
                      key={`${i}-${j}`}
                      className={`heatmap-cell level-${day.level}`}
                      data-tooltip={tooltipText}
                      aria-label={tooltipText}
                      onMouseEnter={(e) => showTooltip(e, tooltipText)}
                      onMouseMove={moveTooltip}
                      onMouseLeave={hideTooltip}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* month labels remain visually the same and render after weeks */}
        <div className="month-labels">
          {heatmapData.monthLabels.map((m, i) => (
            <div key={i} className="month-label">
              {m}
            </div>
          ))}
        </div>

        <div className="heatmap-legend">
          <span>Less</span>
          {[-1, 0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`heatmap-cell level-${level}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Portal tooltip rendered outside the clipped heatmap container */}
      {tooltip.visible &&
        createPortal(
          <div
            className="heatmap-tooltip"
            role="tooltip"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 12,
            }}
          >
            {tooltip.text}
          </div>,
          document.body
        )}

      {/* Achievements Section */}
      <div className="achievements-section">
        <h2>Achievements</h2>
        <div className="achievements-grid">
          {(data?.stats?.achievements || []).map((achievement) => (
            <div
              key={achievement.id}
              className={`achievement-card ${
                achievement.unlocked ? "unlocked" : ""
              }`}
            >
              {!achievement.unlocked && <div className="achievement-overlay" />}
              <div className="achievement-icon">
                <FaTrophy
                  style={{
                    color: achievement.unlocked ? "#FFD700" : "#666666",
                  }}
                />
              </div>
              <h4>{achievement.title}</h4>
              <p>{achievement.description}</p>
              <div className="achievement-progress-bar">
                <div
                  className="achievement-progress"
                  style={{
                    width: `${
                      (achievement.progress / achievement.requirement) * 100
                    }%`,
                    backgroundColor: achievement.unlocked
                      ? "#4CAF50"
                      : "#666666",
                  }}
                />
              </div>
              <small>
                {achievement.progress} / {achievement.requirement}
              </small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
