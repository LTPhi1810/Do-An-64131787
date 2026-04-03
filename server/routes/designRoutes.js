const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Design = require('../models/Design');

// LƯU (Hoặc cập nhật nếu đã có)
router.post('/save', auth, async (req, res) => {
  try {
    const { items, roomConfig } = req.body;
    let design = await Design.findOne({ user: req.user.id });

    if (design) {
      design.items = items;
      design.roomConfig = roomConfig;
      design.updatedAt = Date.now();
    } else {
      design = new Design({ user: req.user.id, items, roomConfig });
    }
    await design.save();
    res.json({ msg: 'Đã lưu tự động vào MongoDB!' });
  } catch (err) { res.status(500).send('Lỗi server'); }
});

// TẢI
router.get('/load', auth, async (req, res) => {
  try {
    const design = await Design.findOne({ user: req.user.id });
    res.json(design);
  } catch (err) { res.status(500).send('Lỗi server'); }
});

module.exports = router;