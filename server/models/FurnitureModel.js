const mongoose = require('mongoose');
const FurnitureSchema = new mongoose.Schema({
  category: String, // 'Chair', 'Bed'...
  name: String,
  path: String, // Chứa mã Base64 của file .glb
  icon: String,
  size: Array,
  scale: Number,
  offset: Array,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Furniture', FurnitureSchema);