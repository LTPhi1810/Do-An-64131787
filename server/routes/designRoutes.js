const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Design = require('../models/Design');
const Setting = require('../models/Setting');
const Furniture = require('../models/FurnitureModel');

// 1. TẢI CẤU HÌNH & MODELS
router.get('/settings', async (req, res) => {
  try {
    const settings = await Setting.findOne() || { bannerText: "PhiSpace", slides: [], categoryIcons: {} };
    const furnitures = await Furniture.find();
    const modelsGrouped = {};

    // 1. Đọc tất cả Category đã được lưu trong settings trước
    if (settings.categoryIcons) {
      Object.keys(settings.categoryIcons).forEach(cat => {
        modelsGrouped[cat] = [];
      });
    }

    // 2. Sau đó mới nhét item vào
    furnitures.forEach(f => {
      if (!modelsGrouped[f.category]) modelsGrouped[f.category] = [];
      modelsGrouped[f.category].push(f);
    });

    res.json({
      bannerText: settings.bannerText,
      slides: settings.slides,
      categoryIcons: settings.categoryIcons,
      models: modelsGrouped 
    });
  } catch (err) {
    console.error('Error loading settings:', err);
    res.status(500).json({ msg: 'Lỗi server: ' + err.message });
  }
});

// 2. LƯU MODEL 3D
router.post('/furniture', auth, async (req, res) => {
  try {
    // Đảm bảo không truyền thiếu trường trống gây lỗi schema offset của MongoDB
    const { category, name, path, icon, size, scale, offset } = req.body;
    
    if (!path) {
      return res.status(400).json({ msg: "Thiếu dữ liệu file 3D (.glb)" });
    }

    const newFurniture = new Furniture({
      category,
      name,
      path, // Chuỗi base64 nặng
      icon,
      size: size || [1, 1, 1],
      scale: scale || 1.0,
      offset: offset || [0, 0, 0]
    });

    const savedItem = await newFurniture.save();
    
    // TRẢ VỀ CẢ ID ĐỂ FRONTEND CẬP NHẬT TRÁNH LỖI UNDEFINED KHI SỬA
    res.json({ msg: "Lưu thành công!", id: savedItem._id });
  } catch (err) {
    console.error('Error saving furniture:', err);
    // Trả về thông báo lỗi chi tiết thay vì để sập ngầm
    res.status(500).json({ msg: "Lỗi ghi dữ liệu lớn: " + err.message });
  }
});

// 3. LƯU PROJECT CỦA USER
router.post('/save', auth, async (req, res) => {
  try {
    const { slotIndex, items, roomConfig } = req.body;
    let design = await Design.findOne({ user: req.user.id, slotIndex });
    if (design) {
      design.items = items;
      design.roomConfig = roomConfig;
      design.updatedAt = Date.now();
    } else {
      design = new Design({ user: req.user.id, slotIndex, items, roomConfig });
    }
    await design.save();
    res.json({ msg: `Đã lưu vào File ${slotIndex + 1}!` });
  } catch (err) {
    console.error('Error saving design:', err);
    res.status(500).json({ msg: 'Lỗi save: ' + err.message });
  }
});

// 4. LƯU CẤU HÌNH BANNER/SLIDES (Fixed F5 mất ảnh)
router.post('/settings', auth, async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (settings) {
      settings = await Setting.findByIdAndUpdate(settings._id, req.body, { new: true, strict: false });
    } else {
      settings = new Setting(req.body);
      settings.set('slides', req.body.slides, { strict: false });
      await settings.save();
    }
    res.json({ msg: 'Lưu settings thành công', settings });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ msg: 'Lỗi settings: ' + err.message });
  }
});

router.put('/furniture/:id', auth, async (req, res) => {
  try {
    const updatedFurniture = await Furniture.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Trả về dữ liệu sau khi đã sửa
    );
    if (!updatedFurniture) return res.status(404).json({ msg: 'Không tìm thấy món đồ này' });
    res.json({ msg: "Cập nhật thành công!", data: updatedFurniture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Lỗi khi cập nhật database" });
  }
});

// 5. XÓA ITEM LẺ
router.delete('/furniture/:id', auth, async (req, res) => {
  try {
    const result = await Furniture.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ msg: 'Không tìm thấy item' });
    res.json({ msg: 'Đã xóa item thành công' });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ msg: 'Lỗi server khi xóa item: ' + err.message });
  }
});

// 6. XÓA NGUYÊN DANH MỤC
router.delete('/furniture/category/:name', auth, async (req, res) => {
  try {
    const result = await Furniture.deleteMany({ category: req.params.name });
    res.json({ msg: `Đã xóa sạch category ${req.params.name}` });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ msg: 'Lỗi server: ' + err.message });
  }
});

router.post('/furniture/rename-category', auth, async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    
    // Cập nhật tất cả item có category cũ sang category mới
    await Furniture.updateMany(
      { category: oldName },
      { $set: { category: newName } }
    );

    res.json({ msg: "Đổi tên category thành công!" });
  } catch (err) {
    console.error('Error renaming category:', err);
    res.status(500).json({ msg: 'Lỗi server khi đổi tên: ' + err.message });
  }
});

module.exports = router;