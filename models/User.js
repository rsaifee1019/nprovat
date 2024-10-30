const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'editor', 'admin'], default: 'user' },
    bio: { type: String, maxlength: 500 },
    avatar: String,
    joinDate: { type: Date, default: Date.now },
    lastLogin: Date,
    isVerified: {
        type: Boolean,
        default: false
      },
      verificationToken: String,
      verificationTokenExpires: Date
    });



module.exports = mongoose.model('User', userSchema);
