import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  // State to manage form input
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");

  const navigate = useNavigate();
  // Get the register function from the authentication context
  const { register } = useAuth();

  const checkPasswordStrength = (password) => {
    if (password.length < 6) {
      return "Weak";
    }
    if (
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[@$!%*?&#]/.test(password)
    ) {
      return "Strong";
    }
    return "Moderate";
  };

  const onPasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 1. Client-side validation
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (passwordStrength === "Weak") {
      setError("Password is too weak. Use a stronger password.");
      return;
    }

    // IMPORTANT SECURITY NOTE: The password is your encryption key!
    // The user must be reminded that this password is the ONLY way to decrypt their notes.
    // 2. Attempt to register and log in
    const encryptionKey = `${password}:${username}`; // Append username to the password
    const success = await register(username, encryptionKey);

    if (success) {
      // Navigate to the dashboard on successful registration/login
      navigate("/");
    } else {
      // The AuthContext handles API errors and returns false on failure
      setError("Registration failed. Username may already be taken.");
    }
  };

  return (
    <div className="auth-container">
      {" "}
      {/* <-- New Container Class */}
      <h2>Register for Secure Journal with CiperSoul</h2>
      <p>
        Your **Password** is your **Decryption Key**. If you forget it, your
        notes are permanently lost.
      </p>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (Your Encryption Key)"
          value={password}
          onChange={onPasswordChange}
          required
        />
        <p>
          Password Strength: <strong>{passwordStrength}</strong>
        </p>
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">Register & Secure My Key</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <p style={{ marginTop: "20px", textAlign: "center" }}>
        Already have a key? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default Register;
