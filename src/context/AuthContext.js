// frontend/src/context/AuthContext.js (UPDATED FOR sessionStorage)
import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom"; // Add useNavigate for security redirect

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [decryptionPassword, setDecryptionPassword] = useState("");
  const navigate = useNavigate(); // Initialize navigate hook

  useEffect(() => {
    // Use sessionStorage: token is cleared when the browser/tab closes
    const token = sessionStorage.getItem("token");
    const savedPassword = sessionStorage.getItem("decryptKey"); // Add this line
    if (token) {
      setIsAuthenticated(true);
      if (savedPassword) {
        // Add this block
        setDecryptionPassword(savedPassword);
      }
    }
    setLoading(false);
  }, []);

  const applyFetchedPrefs = (prefs) => {
    try {
      // console.debug removed to reduce noise
      if (!prefs) return;
      if (prefs.preset) localStorage.setItem("themePreset", prefs.preset);
      if (typeof prefs.isDark === "boolean")
        localStorage.setItem("isDark", String(prefs.isDark));
      // Accept numeric or numeric-string values from the server
      if (prefs.sessionTimeout !== undefined && prefs.sessionTimeout !== null) {
        const st =
          typeof prefs.sessionTimeout === "number"
            ? prefs.sessionTimeout
            : parseInt(prefs.sessionTimeout, 10);
        if (Number.isFinite(st)) {
          localStorage.setItem("sessionTimeout", String(st));
        }
      }
      // notify ThemeProvider to re-read localStorage
      window.dispatchEvent(new Event("prefsUpdated"));
    } catch (e) {
      console.error("Failed to apply prefs locally:", e);
    }
  };

  const fetchAndApplyPrefs = async () => {
    try {
      const res = await api.get("/auth/preferences");
      // console.debug removed
      applyFetchedPrefs(res.data);
    } catch (e) {
      console.error("Failed to fetch user preferences:", e);
    }
  };

  // Ensure preferences are loaded on app start if a session token exists
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (token) {
      // fetch and apply prefs (no await here)
      fetchAndApplyPrefs();
    }
  }, []);

  const login = async (username, password) => {
    try {
      const res = await api.post("/auth/login", { username, password });
      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("decryptKey", password); // Add this line
      setIsAuthenticated(true);
      setDecryptionPassword(password);
      // fetch server-stored prefs and apply locally
      await fetchAndApplyPrefs();
      return true;
    } catch (err) {
      console.error(err.response ? err.response.data.msg : err);
      return false;
    }
  };

  const register = async (username, password) => {
    try {
      const res = await api.post("/auth/register", { username, password });
      sessionStorage.setItem("token", res.data.token); // Use sessionStorage
      sessionStorage.setItem("decryptKey", password); // ensure interceptor can decrypt immediately
      setIsAuthenticated(true);
      setDecryptionPassword(password); // Store password in state for decryption!
      // fetch server-stored prefs (defaults created on server) and apply locally
      await fetchAndApplyPrefs();
      return true;
    } catch (err) {
      console.error(err.response ? err.response.data.msg : err);
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem("token"); // Use sessionStorage
    sessionStorage.removeItem("decryptKey"); // Add this line
    setIsAuthenticated(false);
    setDecryptionPassword("");
    navigate("/login"); // Redirect to login after clearing state
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        decryptionPassword,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
