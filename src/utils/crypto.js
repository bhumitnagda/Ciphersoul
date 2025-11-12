// frontend/src/utils/crypto.js
import CryptoJS from "crypto-js";

// The key used for encryption/decryption MUST be derived from the user's password.
// For security, we should never store or send this key to the server.

/**
 * Encrypts data using AES-256 with a key derived from the password and username.
 * @param {string} data - The plaintext data to encrypt (the note content).
 * @param {string} encryptionKey - The encryption key in the format "password:username".
 * @returns {string} The ciphertext in a string format.
 */
export const encryptNote = (data, encryptionKey) => {
  const [password, username] = encryptionKey.split(":");
  const key = `${password}:${username}`; // Combine password and username
  return CryptoJS.AES.encrypt(data, key).toString();
};

/**
 * Decrypts ciphertext using AES-256 with the user's password and username as the key.
 * @param {string} ciphertext - The encrypted data from the server.
 * @param {string} encryptionKey - The encryption key in the format "password:username".
 * @returns {string | null} The decrypted plaintext or null if decryption fails.
 */
export const decryptNote = (ciphertext, encryptionKey) => {
  try {
    const [password, username] = encryptionKey.split(":");
    const key = `${password}:${username}`; // Combine password and username
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    return plaintext || null;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};

// New: client-side word counter to compute metrics before encryption.
// Usage: const wc = countWords(plainTextContent);
export const countWords = (str = "") => {
  if (typeof str !== "string") return 0;
  return str
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};
