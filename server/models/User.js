const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  googleId: { type: String, default: '' },
  role: { type: String, default: 'user' },
  resetToken: { type: String, default: '' },
  resetTokenExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);