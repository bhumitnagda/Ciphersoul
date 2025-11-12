// frontend/src/context/ThemeContext.js

import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// Update THEME_PRESETS to be inside the file but outside the component
export const THEME_PRESETS = {
  classic: {
    dark: {
      accent: "#64b5f6",
      text: "#cccccc",
      secondaryText: "#a0a0a0",
      background: "#1e1e1e",
      cardBg: "#282828",
      border: "#383838",
    },
    light: {
      accent: "#1976d2",
      text: "#333333",
      secondaryText: "#666666",
      background: "#f5f5f5",
      cardBg: "#ffffff",
      border: "#dddddd",
    },
  },
  forest: {
    dark: {
      accent: "#4caf50",
      text: "#d0d9d0",
      secondaryText: "#a5b5a5",
      background: "#1a2416",
      cardBg: "#243024",
      border: "#2d392d",
    },
    light: {
      accent: "#2e7d32",
      text: "#2d3a2d",
      secondaryText: "#5c715c",
      background: "#f1f8f1",
      cardBg: "#ffffff",
      border: "#e0e9e0",
    },
  },
  ocean: {
    dark: {
      accent: "#00acc1",
      text: "#d0e3f0",
      secondaryText: "#a5c3d9",
      background: "#0a192f",
      cardBg: "#162844",
      border: "#1e3557",
    },
    light: {
      accent: "#0097a7",
      text: "#2c4356",
      secondaryText: "#557a9e",
      background: "#f5f9fc",
      cardBg: "#ffffff",
      border: "#e1eaf5",
    },
  },
  sunset: {
    dark: {
      accent: "#ff5722",
      text: "#f0d5d0",
      secondaryText: "#d9b5a5",
      background: "#2f1216",
      cardBg: "#441a1f",
      border: "#572024",
    },
    light: {
      accent: "#f4511e",
      text: "#3a2f2d",
      secondaryText: "#7c6761",
      background: "#fff5f2",
      cardBg: "#ffffff",
      border: "#ffe0d5",
    },
  },
  purple: {
    dark: {
      accent: "#9c27b0",
      text: "#e1d4e6",
      secondaryText: "#b39dbc",
      background: "#2d1b33",
      cardBg: "#3d2747",
      border: "#4a2e57",
    },
    light: {
      accent: "#7b1fa2",
      text: "#2a2a2a",
      secondaryText: "#666666",
      background: "#f7f2f9",
      cardBg: "#ffffff",
      border: "#e6d7eb",
    },
  },
  mint: {
    dark: {
      accent: "#26a69a",
      text: "#d4e6e4",
      secondaryText: "#a5c3c0",
      background: "#1b2928",
      cardBg: "#243432",
      border: "#2d403e",
    },
    light: {
      accent: "#00897b",
      text: "#2c3433",
      secondaryText: "#5c6e6c",
      background: "#f2f7f7",
      cardBg: "#ffffff",
      border: "#e0ebea",
    },
  },
  coffee: {
    dark: {
      accent: "#795548",
      text: "#e6e0dd",
      secondaryText: "#bdb4b0",
      background: "#211d1b",
      cardBg: "#2d2825",
      border: "#38322e",
    },
    light: {
      accent: "#5d4037",
      text: "#2d2826",
      secondaryText: "#6e645f",
      background: "#f7f5f4",
      cardBg: "#ffffff",
      border: "#ebe7e5",
    },
  },
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState({
    preset: localStorage.getItem("themePreset") || "classic",
    isDark: localStorage.getItem("isDark") === "true",
  });

  const applyTheme = () => {
    const { preset, isDark } = currentTheme;
    const themeColors = THEME_PRESETS[preset][isDark ? "dark" : "light"];

    Object.entries(themeColors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );
  };

  // Save theme preferences to localStorage
  useEffect(() => {
    localStorage.setItem("themePreset", currentTheme.preset);
    localStorage.setItem("isDark", currentTheme.isDark);
    applyTheme();
  }, [currentTheme]);

  // Listen for external updates to preferences (e.g. after login, or prefs saved)
  useEffect(() => {
    const handler = () => {
      const preset = localStorage.getItem("themePreset") || "classic";
      const isDark = localStorage.getItem("isDark") === "true";
      setCurrentTheme((prev) => ({ ...prev, preset, isDark }));
      // applyTheme will run via the effect above when currentTheme changes
    };
    window.addEventListener("prefsUpdated", handler);
    return () => window.removeEventListener("prefsUpdated", handler);
  }, []);

  const toggleTheme = () => {
    setCurrentTheme((prev) => ({
      ...prev,
      isDark: !prev.isDark,
    }));
  };

  const setPreset = (presetName) => {
    if (THEME_PRESETS[presetName]) {
      setCurrentTheme((prev) => ({
        ...prev,
        preset: presetName,
      }));
    }
  };

  const value = {
    isDark: currentTheme.isDark,
    currentPreset: currentTheme.preset,
    toggleTheme,
    setPreset,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
