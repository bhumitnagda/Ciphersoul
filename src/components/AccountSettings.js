// frontend/src/components/AccountSettings.js

import React, { useEffect, useState } from "react";
import { useTheme, THEME_PRESETS } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import api from "../services/api";

const AccountSettings = () => {
  const { isDark, currentPreset, toggleTheme, setPreset } = useTheme();
  const { logout } = useAuth();

  // Local editable state
  const [preset, setPresetLocal] = useState(currentPreset || "classic");
  const [darkMode, setDarkModeLocal] = useState(Boolean(isDark));
  const [timeout, setTimeoutValue] = useState(() => {
    const stored = localStorage.getItem("sessionTimeout");
    return stored ? Number(stored) : 30;
  });
  const [loading, setLoading] = useState(false);

  // Load server prefs on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get("/auth/preferences");
        console.debug("AccountSettings: fetched prefs from server:", res.data);
        if (!mounted) return;
        const prefs = res.data || {};
        if (prefs.preset) setPresetLocal(prefs.preset);
        if (typeof prefs.isDark === "boolean") setDarkModeLocal(prefs.isDark);
        if (typeof prefs.sessionTimeout === "number")
          setTimeoutValue(prefs.sessionTimeout);
        // Ensure ThemeContext reflects server (apply immediately)
        if (prefs.preset && prefs.preset !== currentPreset) {
          setPreset(prefs.preset);
        }
        if (typeof prefs.isDark === "boolean" && prefs.isDark !== isDark) {
          toggleTheme(); // flips ThemeContext
        }
      } catch (e) {
        console.error("Failed to load preferences:", e);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [setPreset, toggleTheme, currentPreset, isDark]);

  const savePreferences = async () => {
    setLoading(true);
    try {
      const timeoutNum = Number(timeout);
      const body = {
        preset,
        isDark: darkMode,
        // Preserve 0 explicitly; only fallback if the value is not a finite number
        sessionTimeout: Number.isFinite(timeoutNum) ? timeoutNum : 30,
      };
      console.debug("AccountSettings: saving prefs to server:", body);
      const res = await api.put("/auth/preferences", body);
      console.debug("AccountSettings: save response:", res.data);
      // update local ThemeContext immediately
      setPreset(preset);
      if (darkMode !== isDark) toggleTheme();
      localStorage.setItem("sessionTimeout", String(body.sessionTimeout));
      // notify ThemeProvider/listeners to re-read prefs if needed
      window.dispatchEvent(new Event("prefsUpdated"));
    } catch (e) {
      console.error("Failed to save preferences:", e);
    } finally {
      setLoading(false);
    }
  };

  // Panic: delete all user notes (server-side). Confirm with user.
  const panicDeleteAllNotes = async () => {
    if (
      !window.confirm(
        "Are you sure? This will permanently delete ALL your notes and cannot be undone."
      )
    )
      return;
    setLoading(true);
    try {
      const res = await api.post("/analytics/panic");
      alert(`Panic complete. Deleted ${res.data.deletedCount || 0} notes.`);
      // refresh the app (user will be sent to an empty dashboard)
      window.dispatchEvent(new Event("prefsUpdated"));
      window.location.reload();
    } catch (e) {
      console.error("Panic failed:", e);
      alert("Failed to delete notes. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h1 className="page-title">Account Settings</h1>
        <Link to="/" style={{ textDecoration: "none" }}>
          <button
            style={{
              backgroundColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            ← Back to Journal
          </button>
        </Link>
      </div>

      <div className="settings-panel">
        <h2>Theming Preferences</h2>

        <div className="setting-control-group" style={{ alignItems: "center" }}>
          <label style={{ marginRight: 12 }}>Theme Preset:</label>
          <select
            value={preset}
            onChange={(e) => setPresetLocal(e.target.value)}
            style={{ width: 200 }}
          >
            {Object.keys(THEME_PRESETS).map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-control-group" style={{ alignItems: "center" }}>
          <label style={{ marginRight: 12 }}>Mode:</label>
          <button
            onClick={() => setDarkModeLocal((s) => !s)}
            className="btn"
            style={{ width: 140 }}
          >
            {darkMode ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>

        <div style={{ height: 12 }} />

        <h2>Security & Session</h2>
        <div className="setting-control-group" style={{ alignItems: "center" }}>
          <label htmlFor="session-timeout">Session timeout (minutes):</label>
          <input
            id="session-timeout"
            className="timeout-input"
            type="number"
            min="0" // changed from 1 -> 0 so user can disable auto-logout
            max="1440"
            value={timeout}
            onChange={(e) => setTimeoutValue(Number(e.target.value))}
            style={{ width: "120px" }}
          />
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={savePreferences} disabled={loading}>
            {loading ? "Saving..." : "Save Preferences"}
          </button>
          <button
            onClick={panicDeleteAllNotes}
            style={{ backgroundColor: "#7b1f1f", color: "white" }}
            title="Delete all notes permanently"
          >
            Panic: Delete All Notes
          </button>
          <button
            onClick={logout}
            style={{ backgroundColor: "var(--color-error)" }}
          >
            Logout (Securely Clear Key)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
