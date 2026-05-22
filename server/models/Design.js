const mongoose = require('mongoose');

const DesignSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slotIndex: { type: Number, required: true }, // Khe save số mấy (0 -> 4)
  items: { type: Array, default: [] },
  roomConfig: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Design', DesignSchema);