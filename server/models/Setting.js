const mongoose = require('mongoose');
const SettingSchema = new mongoose.Schema({
  bannerText: String,
  slides: Array,
  models: Object,
  categoryIcons: Object
});
module.exports = mongoose.model('Setting', SettingSchema);