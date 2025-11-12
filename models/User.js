// backend/models/User.js

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // --- Use 'username' for unique identification ---
    username: {
        type: String,
        required: true,
        unique: true, // Crucial: Ensures only one user can have this username
        trim: true,
    },
    // The journal does not use email, so we exclude it or define it without a unique constraint.
    // If you included an 'email' field in your model previously, it should NOT be marked 'unique'
    // if it can be null or empty. It's safer to remove it if not needed.
    
    password: { // This is the encrypted password/decryption key stored securely
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

UserSchema.pre('save', function (next) {
    if (this.isModified('username') && typeof this.username === 'string') {
        this.username = this.username.trim().toLowerCase();
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);