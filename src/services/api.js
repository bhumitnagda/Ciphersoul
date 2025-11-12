// frontend/src/services/api.js

import axios from "axios";
import { decryptNote, countWords } from "../utils/crypto"; // new import

const api = axios.create({
  baseURL: "http://localhost:5000/api", // Ensure this matches your backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach the session token to every request and attach metrics for notes
api.interceptors.request.use(
  (config) => {
    // *** FIX: Get token from sessionStorage instead of localStorage ***
    const token = sessionStorage.getItem("token");

    if (token) {
      config.headers["x-auth-token"] = token;
    }

    // Attach metrics for note create/update requests so server-side analytics can use them
    try {
      const method = (config.method || "").toLowerCase();
      if (
        (method === "post" || method === "put") &&
        config.url &&
        config.url.includes("/notes")
      ) {
        // Ensure data is an object
        const payload =
          config.data && typeof config.data === "object"
            ? { ...config.data }
            : {};
        const content = payload.content;

        if (content) {
          // Try to decrypt using decryptKey stored in sessionStorage (set on login)
          const decryptKey = sessionStorage.getItem("decryptKey");
          let plaintext = null;
          if (decryptKey) {
            try {
              plaintext = decryptNote(content, decryptKey);
            } catch (e) {
              plaintext = null;
            }
          }

          // If decryption failed, assume content might already be plaintext (fallback)
          if (
            !plaintext &&
            typeof content === "string" &&
            content.length < 20000
          ) {
            // Heuristic: if content is short it might be plaintext; otherwise leave wordCount 0
            plaintext = content;
          }

          const wc = plaintext ? countWords(plaintext) : 0;
          payload.metrics = payload.metrics || {};
          payload.metrics.wordCount = wc;
          payload.metrics.lastModified = new Date().toISOString();

          config.data = payload;
        }
      }
    } catch (err) {
      // Don't block the request on metrics errors
      console.error("Failed to attach metrics to request:", err);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("decryptKey");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
