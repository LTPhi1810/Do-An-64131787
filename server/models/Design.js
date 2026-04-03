const mongoose = require('mongoose');

const DesignSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: "Thiết kế của tôi" },
  items: { type: Array, required: true },
  roomConfig: { type: Object, default: { width: 10, length: 10 } },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Design', DesignSchema);