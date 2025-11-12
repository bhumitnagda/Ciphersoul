// frontend/src/components/Dashboard.js (FINAL WORKING VERSION)
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme, THEME_PRESETS } from "../context/ThemeContext";
import api from "../services/api";
import { encryptNote, decryptNote, countWords } from "../utils/crypto";
import ModernEditor from "./ModernEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks"; // For single newline support
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism"; // You can choose a different theme
import Analytics from "./Analytics"; // Change from { Analytics } to default import

const Code = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  return !inline && match ? (
    <SyntaxHighlighter
      style={dark} // Apply the dark theme
      language={match[1]}
      PreTag="div"
      {...props}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

// --- Sidebar Menu Components ---
const SettingsPanel = ({
  isSettingsOpen,
  closeSettings,
  logout,
  sessionTimeout,
  setSessionTimeout,
}) => {
  const { isDark, toggleTheme, currentPreset, setPreset } = useTheme();

  // debounce timer for saving session timeout to server
  const sessionSaveTimerRef = useRef(null);

  const handleSetPreset = async (presetName) => {
    setPreset(presetName);
    try {
      await api.put("/auth/preferences", { preset: presetName });
      // notify ThemeProvider to re-read persisted pref (just in case)
      window.dispatchEvent(new Event("prefsUpdated"));
    } catch (e) {
      console.error("Failed to save preset:", e);
    }
  };

  const handleToggleTheme = async () => {
    const newIsDark = !isDark;
    toggleTheme();
    try {
      await api.put("/auth/preferences", { isDark: newIsDark });
      window.dispatchEvent(new Event("prefsUpdated"));
    } catch (e) {
      console.error("Failed to save theme mode:", e);
    }
  };

  // Persist session timeout to server (debounced)
  const handleSessionTimeoutChange = (val) => {
    setSessionTimeout(val);
    if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    sessionSaveTimerRef.current = setTimeout(async () => {
      try {
        await api.put("/auth/preferences", {
          sessionTimeout: Number(val) || 0,
        });
        window.dispatchEvent(new Event("prefsUpdated"));
        console.debug("Saved sessionTimeout to server:", val);
      } catch (e) {
        console.error("Failed to save sessionTimeout:", e);
      }
    }, 800);
  };

  // Panic: delete all user notes (server-side). Confirm with user.
  const panicDeleteAllNotes = async () => {
    if (
      !window.confirm(
        "Are you sure? This will permanently delete ALL your notes and cannot be undone."
      )
    )
      return;
    try {
      const res = await api.post("/analytics/panic");
      alert(`Panic complete. Deleted ${res.data.deletedCount || 0} notes.`);
      // refresh the app (user will be sent to an empty dashboard)
      window.dispatchEvent(new Event("prefsUpdated"));
      window.location.reload();
    } catch (e) {
      console.error("Panic failed:", e);
      alert("Failed to delete notes. See console for details.");
    }
  };

  // Save preferences immediately (visible save button)
  const savePreferences = async () => {
    try {
      const body = {
        preset: currentPreset,
        isDark,
        // preserve explicit 0; fallback only if not finite
        sessionTimeout: Number.isFinite(Number(sessionTimeout))
          ? Number(sessionTimeout)
          : 0,
      };
      await api.put("/auth/preferences", body);
      // persist locally and notify other listeners
      localStorage.setItem("sessionTimeout", String(body.sessionTimeout));
      window.dispatchEvent(new Event("prefsUpdated"));
      alert("Preferences saved");
    } catch (e) {
      console.error("Failed to save preferences:", e);
      alert("Failed to save preferences. See console for details.");
    }
  };

  return (
    <div className="main-content">
      <div className="top-bar" style={{ borderBottom: "none" }}>
        <h1 className="page-title">Account Settings</h1>
        <button onClick={closeSettings}>← Back to Journal</button>
      </div>

      <div
        className="settings-panel"
        style={{ maxWidth: "800px", margin: "20px 0" }}
      >
        <h2>Theme Settings</h2>

        <div className="setting-control-group">
          <label>Theme Preset:</label>
          <div className="theme-selector">
            {Object.keys(THEME_PRESETS).map((presetName) => (
              <div
                key={presetName}
                className={`theme-card ${
                  currentPreset === presetName ? "active" : ""
                }`}
                onClick={() => handleSetPreset(presetName)}
              >
                <div
                  className="theme-preview"
                  style={{
                    background:
                      THEME_PRESETS[presetName][isDark ? "dark" : "light"]
                        .background,
                    borderColor:
                      THEME_PRESETS[presetName][isDark ? "dark" : "light"]
                        .border,
                  }}
                >
                  <div
                    style={{
                      width: "60%",
                      height: "4px",
                      background:
                        THEME_PRESETS[presetName][isDark ? "dark" : "light"]
                          .accent,
                      margin: "8px",
                      borderRadius: "2px",
                    }}
                  />
                </div>
                <div className="theme-card-title">
                  {presetName.charAt(0).toUpperCase() + presetName.slice(1)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="setting-control-group">
          <label>Mode:</label>
          <button onClick={handleToggleTheme} className="btn">
            {isDark ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>

        <h2>Security & Actions</h2>

        {/* === NEW SESSION TIMEOUT CONTROL === */}
        <div className="setting-control-group">
          <label htmlFor="session-timeout">Auto-Logout Timeout (min):</label>
          <input
            id="session-timeout"
            type="number"
            min="0"
            max="90"
            value={sessionTimeout}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              // Constrain value between 0 and 90 minutes
              if (!isNaN(val) && val >= 0 && val <= 90) {
                handleSessionTimeoutChange(val);
              }
            }}
            // Overrides the global input[type="text"] styling for a smaller field
            style={{
              width: "80px",
              margin: "0",
              flexShrink: 0,
              textAlign: "center",
            }}
            title="Set session timeout in minutes (0 to 90)"
          />
          <small
            style={{ color: "var(--color-secondary-text)", marginLeft: "10px" }}
          >
            Set to 0 to disable auto-logout.
          </small>
        </div>
        {/* =================================== */}

        {/* Visible Save button for in-dashboard settings */}
        <div style={{ marginTop: 12 }}>
          <button onClick={savePreferences} style={{ marginRight: 8 }}>
            Save Preferences
          </button>
        </div>

        <button
          onClick={logout}
          style={{ backgroundColor: "var(--color-error)", marginTop: "10px" }}
        >
          Logout (Securely Clear Key)
        </button>
        <button
          onClick={panicDeleteAllNotes}
          style={{
            backgroundColor: "#7b1f1f",
            color: "white",
            marginLeft: "12px",
            marginTop: "10px",
          }}
        >
          Panic: Delete All Notes
        </button>
        <p
          style={{
            color: "var(--color-secondary-text)",
            fontSize: "0.9em",
            marginTop: "10px",
          }}
        >
          Note: Your token is stored in **Session Storage** and will be cleared
          when you close the browser tab.
        </p>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
const Dashboard = () => {
  const { logout, decryptionPassword } = useAuth();
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [currentNoteContent, setCurrentNoteContent] = useState("");
  const [currentNoteTitle, setCurrentNoteTitle] = useState("");
  const [noteError, setNoteError] = useState("");
  const [loading, setLoading] = useState(false);

  // Editor Modes: 'edit', 'preview', or 'split'
  const [editorMode, setEditorMode] = useState("split");
  // UI State: 'journal' or 'settings'
  const [uiView, setUiView] = useState("journal");
  const [analyticsData, setAnalyticsData] = useState(null);

  // Add auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  // Add debounce state
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Add state for tracking last analytics fetch
  const [lastAnalyticsFetch, setLastAnalyticsFetch] = useState(0);

  // Add this to track save operation status
  const [isSaving, setIsSaving] = useState(false);

  // Track last-seen word counts per-note (in-memory) to compute anonymous deltas
  const lastSeenRef = React.useRef({});
  // Keep today's typed total locally to avoid double sends across reloads in the same day
  const typedKey = `typedToday_${new Date().toISOString().split("T")[0]}`;

  // Add file input ref used by the "Import" button
  const fileInputRef = useRef(null);

  // Initialize lastSeenRef after notes load
  // --- Session Timer Effect ---
  useEffect(() => {
    // sessionTimeout is in minutes, convert to milliseconds
    const timeoutMs = sessionTimeout * 60 * 1000;
    let timer;

    // Only set the timer if a valid, non-zero timeout is set.
    if (timeoutMs > 0 && decryptionPassword) {
      console.log(`Setting session timeout for ${sessionTimeout} minutes.`);
      timer = setTimeout(() => {
        alert(
          `Session expired due to ${sessionTimeout} minutes of inactivity. Please log in again.`
        );
        logout(); // Call the secure logout function
      }, timeoutMs);
    } else {
      console.log("Session auto-logout disabled.");
    }

    // Cleanup function to clear the previous timer when component unmounts
    // or dependencies (sessionTimeout, decryptionPassword) change
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [sessionTimeout, decryptionPassword, logout]);
  // ^ Rerun timer when timeout duration or login status changes

  // --- Core Function 1: Fetch and Decrypt Notes ---
  const fetchNotes = async () => {
    if (!decryptionPassword) {
      setNoteError("Decryption key is missing. Please log in again.");
      setNotes([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/notes");

      const decryptedNotes = res.data.map((note) => {
        let decryptedContent = "[ERROR: Decryption Failed]";
        try {
          const raw = decryptNote(note.content, decryptionPassword);
          if (raw !== null) {
            // Normalize: ensure first line is the title without leading '#'
            const parts = raw.split("\n");
            const rawTitle = parts[0] || "";
            const title =
              rawTitle.replace(/^\s*#\s*/, "").trim() || "Untitled Note";
            const body = parts.slice(1).join("\n");
            decryptedContent = `${title}\n${body}`;
            return {
              ...note,
              content: decryptedContent,
              title,
            };
          }
        } catch (e) {
          console.error("Decryption failed for note:", note._id, e);
        }
        return {
          ...note,
          content: decryptedContent,
          title: "Untitled Note",
        };
      });

      // Initialize lastSeenRef from decrypted contents (use plaintext counts only locally)
      const initial = {};
      decryptedNotes.forEach((n) => {
        initial[n._id] = countWords(
          `${n.title}\n${n.content.split("\n").slice(1).join("\n")}`
        );
      });
      lastSeenRef.current = initial;

      setNotes(decryptedNotes);
      setNoteError("");
    } catch (err) {
      console.error(err);
      setNoteError("Failed to load notes from the server.");
    } finally {
      setLoading(false);
    }
  };

  // Add missing fetchAnalytics function used across the component and passed into Analytics
  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/analytics/stats");
      // keep response but avoid verbose debugging output
      setAnalyticsData(res.data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  // Send anonymous per-user typed delta to server
  const sendAnonymousDelta = async (delta) => {
    if (!delta || delta <= 0) return;
    try {
      await api.post("/analytics/track", { delta });
      // persist local typed total to avoid double sending after reload
      const prev = Number(sessionStorage.getItem(typedKey) || 0);
      sessionStorage.setItem(typedKey, String(prev + delta));
    } catch (e) {
      console.error("Failed to send anonymous delta:", e);
    }
  };

  // REPLACED: merged selectNote implementation (removes duplicate definitions)
  const selectNote = (noteId) => {
    if (noteId === selectedNoteId) return;
    setLoading(true);

    const note = notes.find((n) => n._id === noteId);
    if (note) {
      const contentParts = (note.content || "").split("\n");
      const title = (contentParts[0] || "").replace(/^\s*#\s*/, "").trim();
      const content = contentParts.slice(1).join("\n");

      // initialize lastSeen for this note if missing (used for anonymous typing deltas)
      const full = `${title}\n${content}`;
      if (!lastSeenRef.current[noteId]) {
        lastSeenRef.current[noteId] = countWords(full);
      }

      setSelectedNoteId(noteId);
      setCurrentNoteTitle(title);
      setCurrentNoteContent(content);
      setLastSavedContent(`${title}\n${content}`);
      setIsDirty(false);
      setUiView("journal");
    }

    setLoading(false);
  };

  // Debounced typing watcher: count words as user types and send anonymous delta
  React.useEffect(() => {
    if (!decryptionPassword) return;
    // allow typing tracking for "new" drafts as well
    if (!selectedNoteId) return;

    const key = selectedNoteId || "new";
    const fullContent = `${currentNoteTitle}\n${currentNoteContent}`;
    const wc = countWords(fullContent);
    const prevSeen = lastSeenRef.current[key] || 0;
    const delta = Math.max(0, wc - prevSeen);
    if (delta > 0) {
      // debounce small bursts: wait 1500ms of inactivity to send
      let id = setTimeout(async () => {
        // update lastSeen immediately before sending
        lastSeenRef.current[key] = wc;
        await sendAnonymousDelta(delta);
        clearTimeout(id);
      }, 1500);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line
  }, [
    currentNoteContent,
    currentNoteTitle,
    selectedNoteId,
    decryptionPassword,
  ]);

  // --- Core Function 2: Save Note (New or Existing) ---
  const handleSaveNote = async () => {
    if (!decryptionPassword || isSaving) return;

    const fullContent = `${currentNoteTitle}\n${currentNoteContent}`;
    if (fullContent === lastSavedContent) return;

    setIsSaving(true);
    try {
      const encryptedContent = encryptNote(fullContent, decryptionPassword);

      // Compute word counts client-side and send per-note wordCount only (no per-note delta)
      const wc = countWords(fullContent || "");

      // Use lastSeenRef to compute the per-note delta to send explicitly
      const key = selectedNoteId || "new";
      const prevWordCount = Number(lastSeenRef.current[key] || 0);
      const delta = Math.max(0, wc - prevWordCount);

      const payload = {
        content: encryptedContent,
        metrics: {
          wordCount: wc,
          lastModified: new Date().toISOString(),
          // include explicit delta when positive so server reliably attributes today's words
          ...(delta > 0 ? { wordCountDelta: delta } : {}),
        },
      };

      if (selectedNoteId === "new") {
        const res = await api.post("/notes", payload);
        // Decrypt created note from server response so we can show it immediately
        const created = res.data;
        let decrypted = "[ERROR: Decryption Failed]";
        try {
          decrypted =
            decryptNote(created.content, decryptionPassword) || decrypted;
        } catch (e) {
          console.error("Failed to decrypt created note:", e);
        }
        const createdTitle =
          (decrypted.split("\n")[0] || "").trim() || "Untitled Note";
        const createdNote = {
          ...created,
          content: decrypted,
          title: createdTitle,
        };
        // Prepend to local notes so UI is immediately aware of the new note
        setNotes((prev) => [createdNote, ...prev]);
        // ensure last-seen word count is initialized for typing tracking
        lastSeenRef.current[created._id] = countWords(
          `${createdTitle}\n${decrypted}`
        );
        // select the newly created note
        selectNote(created._id);
        // refresh analytics in background
        fetchAnalytics().catch(() => {});
      } else {
        await api.put(`/notes/${selectedNoteId}`, payload);
        // Update the current note in the notes array locally using plaintext
        setNotes((prevNotes) =>
          prevNotes.map((note) =>
            note._id === selectedNoteId
              ? {
                  ...note,
                  content: fullContent,
                  title: currentNoteTitle,
                  metrics: { ...(note.metrics || {}), wordCount: wc },
                }
              : note
          )
        );
        // Update lastSeen so we don't re-count existing words as typed after save
        lastSeenRef.current[key] = wc;
      }

      setLastSavedContent(fullContent);
      setIsDirty(false);

      // Always refresh analytics to pick up server-side aggregation + anonymous deltas
      try {
        await fetchAnalytics();
        setLastAnalyticsFetch(Date.now());
      } catch (e) {
        console.error("Failed to refresh analytics after save:", e);
      }
    } catch (err) {
      console.error(err);
      setNoteError("Failed to save the note.");
    } finally {
      setIsSaving(false);
    }
  };

  // Replace auto-save effect with debounced version
  useEffect(() => {
    if (!currentNoteContent && !currentNoteTitle) return;
    if (saveTimeout) clearTimeout(saveTimeout);

    const fullContent = `${currentNoteTitle}\n${currentNoteContent}`;
    if (fullContent !== lastSavedContent) {
      setIsDirty(true);
      const timeoutId = setTimeout(() => {
        if (!isSaving) handleSaveNote();
      }, 3000);
      setSaveTimeout(timeoutId);
    }

    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [currentNoteContent, currentNoteTitle, isSaving]);

  // --- Core Function 3: Note Deletion ---
  const handleDeleteNote = async (idToDelete) => {
    if (!idToDelete || idToDelete === "new") return;

    if (
      !window.confirm(
        "Are you sure you want to permanently delete this note? This action is irreversible."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/notes/${idToDelete}`);

      // Remove from local state
      const updatedNotes = notes.filter((n) => n._id !== idToDelete);
      setNotes(updatedNotes);

      // Select the next note or start a new one
      if (updatedNotes.length > 0) {
        selectNote(updatedNotes[0]._id);
      } else {
        startNewNote();
      }
      setNoteError("");
    } catch (err) {
      console.error("Delete failed:", err);
      setNoteError("Failed to delete the note.");
    } finally {
      setLoading(false);
    }
  };

  // --- Core Function 4: Encrypted Download ---
  const handleEncryptedDownload = () => {
    if (!decryptionPassword) {
      alert("Cannot download without the decryption key in memory.");
      return;
    }

    const id = selectedNoteId;
    // Combine title and content exactly as they are in the editor for download
    const plaintext = currentNoteTitle
      ? `# ${currentNoteTitle}\n\n${currentNoteContent}`
      : currentNoteContent;

    try {
      const ciphertext = encryptNote(plaintext, decryptionPassword);
      const fileData = {
        id: id === "new" ? "temp-" + Date.now() : id,
        metadata: "Secure Anonymous Journal Note",
        encryptionAlgorithm: "AES-256 (Client-Side)",
        encryptedContent: ciphertext,
        dateDownloaded: new Date().toISOString(),
      };

      const jsonContent = JSON.stringify(fileData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secure_note_${(currentNoteTitle || "Untitled")
        .substring(0, 15)
        .replace(/\s/g, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
      setNoteError("Failed to encrypt/create download file. Check content.");
    }
  };

  // --- UI/Editing Handlers ---
  const startNewNote = () => {
    setSelectedNoteId("new");
    setCurrentNoteTitle(""); // Clear title for placeholder
    setCurrentNoteContent("");
    setUiView("journal");
    setEditorMode("edit"); // Start new notes in edit mode

    // initialize lastSeen for "new" draft so typing deltas are tracked immediately
    lastSeenRef.current["new"] = lastSeenRef.current["new"] || 0;
  };

  const handleTitleChange = (e) => {
    // strip any leading '#' the user may paste
    setCurrentNoteTitle(e.target.value.replace(/^\s*#\s*/, ""));
    setIsDirty(true);
  };

  // --- Side Effects ---
  useEffect(() => {
    if (decryptionPassword) {
      fetchNotes();
      fetchAnalytics();
    }
  }, [decryptionPassword]); // Remove fetchAnalytics from here

  useEffect(() => {
    // If notes are loaded and no note is selected, select the most recent one or start a new one
    if (notes.length > 0 && !selectedNoteId && !loading && !noteError) {
      selectNote(notes[0]._id);
    } else if (
      notes.length === 0 &&
      !selectedNoteId &&
      !loading &&
      !noteError
    ) {
      startNewNote();
    }
  }, [notes, loading, noteError]);

  // Persist session timeout to localStorage and initialize from it
  useEffect(() => {
    const stored = localStorage.getItem("sessionTimeout");
    if (stored) setSessionTimeout(Number(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("sessionTimeout", String(sessionTimeout));
  }, [sessionTimeout]);

  // Listen for prefsUpdated so sessionTimeout (saved on server) is picked up
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem("sessionTimeout");
      console.debug(
        "prefsUpdated event: sessionTimeout in localStorage:",
        stored
      );
      if (stored) setSessionTimeout(Number(stored));
    };
    window.addEventListener("prefsUpdated", handler);
    // initialize on mount as well
    handler();
    return () => window.removeEventListener("prefsUpdated", handler);
  }, []);

  // Handle import of exported encrypted JSON
  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!decryptionPassword) {
      setNoteError("Decryption key is missing. Please log in with your key.");
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // expected fields: encryptedContent, encryptionAlgorithm, metadata (optional)
      const ciphertext =
        data.encryptedContent || data.encrypted || data.content;
      if (!ciphertext) {
        alert("Imported file does not contain an encryptedContent field.");
        return;
      }
      // Attempt to decrypt to verify key correctness
      const plaintext = decryptNote(ciphertext, decryptionPassword);
      if (plaintext === null) {
        alert(
          "Failed to decrypt the imported file with your current key. Import aborted."
        );
        return;
      }
      // determine title from first line, robustly strip leading whitespace and '#'
      const rawTitle = plaintext.split("\n")[0] || "";
      const titleFromFile =
        rawTitle.replace(/^\s*#\s*/, "").trim() ||
        data.metadata ||
        "Imported Note";
      // Build payload using the encrypted content (server expects encrypted content)
      const payload = {
        content: ciphertext,
        metrics: {
          // include a client-side word count for accuracy (server interceptor recalculates if possible)
          wordCount: countWords(plaintext),
          lastModified: new Date().toISOString(),
        },
      };
      // Create the new note
      const res = await api.post("/notes", payload);
      const created = res.data;
      // Use decrypted plaintext for immediate UI display
      const decryptedContent = plaintext;
      const createdNote = {
        ...created,
        content: decryptedContent,
        title: titleFromFile,
      };
      setNotes((prev) => [createdNote, ...prev]);
      lastSeenRef.current[created._id] = countWords(
        `${titleFromFile}\n${decryptedContent}`
      );
      // select the newly created note (uses updated local notes)
      selectNote(created._id);
      alert(`Import successful. Note created: ${titleFromFile}`);
      // refresh analytics in background
      fetchAnalytics().catch(() => {});
    } catch (err) {
      console.error("Import failed:", err);
      alert(
        "Import failed. Check console for details and ensure the file format matches exports."
      );
    } finally {
      // clear the file input for next import
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Render Logic ---
  const isSplit = editorMode === "split";
  const isEdit = editorMode === "edit";
  const isPreview = editorMode === "preview";

  return (
    <div className="main-layout">
      {/* -------------------- SIDEBAR -------------------- */}
      <div className="sidebar">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <h2>CipherSoul</h2>
        </div>

        {/* New Note Button (Centered via CSS) */}
        <button
          onClick={startNewNote}
          // The width and margin are handled by App.css > .sidebar > button
        >
          + New Note
        </button>

        {/* Navigation Links */}
        <a
          href="#"
          className={`sidebar-link ${uiView === "allNotes" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setUiView("allNotes");
          }}
          style={{ marginBottom: "15px" }}
        >
          📝 All Notes
        </a>

        <a
          href="#"
          className={`sidebar-link ${uiView === "analytics" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setUiView("analytics");
          }}
        >
          📊 Analytics
        </a>

        <a
          href="#"
          className={`sidebar-link ${uiView === "settings" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setUiView("settings");
          }}
          style={{ marginBottom: "30px" }}
        >
          ⚙️ Settings
        </a>

        {/* Notes List */}
        <h4
          style={{
            color: "var(--color-secondary-text)",
            marginTop: "0",
            fontSize: "1em",
          }}
        >
          Recent Notes
        </h4>
        {loading && selectedNoteId !== "new" ? (
          <p style={{ color: "var(--color-secondary-text)" }}>
            Loading notes...
          </p>
        ) : (
          <div>
            {notes.map((note) => (
              <a
                key={note._id}
                href="#"
                className={`sidebar-link note-link ${
                  selectedNoteId === note._id ? "active" : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  selectNote(note._id);
                }}
                title={note.title}
              >
                {note.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* -------------------- MAIN CONTENT -------------------- */}

      {uiView === "allNotes" ? (
        <div className="main-content">
          <div className="top-bar" style={{ borderBottom: "none" }}>
            <h1 className="page-title">All Notes</h1>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setUiView("journal")}>Open Editor</button>
              <button
                onClick={() =>
                  fileInputRef.current && fileInputRef.current.click()
                }
              >
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
            </div>
          </div>
          <div style={{ padding: "20px 40px 0 40px" }}>
            <div className="notes-grid">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="note-card"
                  onClick={() => {
                    // open note in editor
                    selectNote(note._id);
                    setUiView("journal");
                  }}
                >
                  <div className="note-title">{note.title}</div>
                  <div className="note-excerpt">
                    {note.content.split("\n").slice(1).join(" ").slice(0, 160)}
                    {note.content.split("\n").slice(1).join(" ").length > 160
                      ? "…"
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : uiView === "settings" ? (
        <SettingsPanel
          isSettingsOpen={uiView === "settings"}
          closeSettings={() => setUiView("journal")}
          logout={logout} // Pass logout prop to SettingsPanel
          sessionTimeout={sessionTimeout} // NEW PROP
          setSessionTimeout={setSessionTimeout} // NEW PROP
        />
      ) : uiView === "analytics" ? (
        <Analytics
          data={analyticsData}
          notes={notes}
          fetchAnalytics={fetchAnalytics}
        />
      ) : (
        <div className="main-content">
          <div className="top-bar">
            {/* Title Input (Centered via CSS) */}
            <input
              className="note-title-input"
              type="text"
              placeholder="Untitled Note"
              value={currentNoteTitle}
              onChange={handleTitleChange}
            />

            {/* Add save indicator */}
            <small
              style={{
                color: "var(--color-secondary-text)",
                marginRight: "10px",
                visibility: isDirty ? "visible" : "hidden",
              }}
            >
              {loading ? "Saving..." : "Unsaved changes"}
            </small>

            {/* Mode Controls */}
            <div className="editor-mode-pills">
              <button
                onClick={() => setEditorMode("edit")}
                className={isEdit ? "active" : ""}
                title="Edit Only"
              >
                Text
              </button>
              <button
                onClick={() => setEditorMode("split")}
                className={isSplit ? "active" : ""}
                title="Live Split View"
              >
                Split
              </button>
              <button
                onClick={() => setEditorMode("preview")}
                className={isPreview ? "active" : ""}
                title="View Full Preview"
              >
                Preview
              </button>
            </div>

            <button onClick={handleSaveNote} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>

            {/* Export/Delete Buttons */}
            {selectedNoteId !== "new" && (
              <>
                <button
                  onClick={handleEncryptedDownload}
                  style={{
                    backgroundColor: "var(--color-card-bg)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                  }}
                  title="Download Encrypted JSON"
                >
                  Export
                </button>
                <button
                  onClick={() => handleDeleteNote(selectedNoteId)}
                  style={{ backgroundColor: "var(--color-error)" }}
                  title="Delete Note"
                >
                  Delete
                </button>
              </>
            )}
            <button onClick={logout} style={{ marginLeft: "10px" }}>
              Logout
            </button>
          </div>

          {noteError && <p className="error-message">{noteError}</p>}

          {/* Editor / Viewer Container */}
          <div className="editor-viewer-wrapper">
            {(isEdit || isSplit) && (
              // Editor container
              <div
                className="editor-container"
                style={{
                  width: isSplit ? "50%" : "100%",
                }}
              >
                <ModernEditor
                  content={currentNoteContent}
                  setContent={setCurrentNoteContent}
                  isSplit={isSplit}
                />
              </div>
            )}

            {(isPreview || isSplit) && (
              // Viewer container
              <div
                className="view-container markdown-preview"
                style={{ width: isSplit ? "50%" : "100%" }}
              >
                <div className="preview-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{ code: Code }}
                  >
                    {`# ${
                      currentNoteTitle || "Untitled Note"
                    }\n\n${currentNoteContent}`}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
