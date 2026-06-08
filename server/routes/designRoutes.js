const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Design = require('../models/Design');
const Setting = require('../models/Setting');
const Furniture = require('../models/FurnitureModel');
const Notification = require('../models/Notification'); // KÉO LÊN ĐẦU FILE CHO CHẮC CHẮN

const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isGlb = file.originalname.toLowerCase().endsWith('.glb');
    return {
      folder: 'phispace',
      resource_type: isGlb ? 'raw' : 'image',
      public_id: Date.now() + '-' + file.originalname.replace(/\s+/g, '-'),
    };
  },
});

const upload = multer({ storage });

router.get('/settings', async (req, res) => {
  try {
    const settings = await Setting.findOne() || { bannerText: "PhiSpace", slides: [], categoryIcons: {} };
    const furnitures = await Furniture.find();
    const modelsGrouped = {};

    if (settings.categoryIcons) {
      Object.keys(settings.categoryIcons).forEach(cat => {
        modelsGrouped[cat] = [];
      });
    }

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
    res.status(500).json({ msg: 'Lỗi server: ' + err.message });
  }
});

// THÊM MODEL MỚI (Đã tích hợp Notification)
router.post('/furniture', auth, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'iconFile', maxCount: 1 }]), async (req, res) => {
  try {
    const { category, name, path: base64Path, icon: base64Icon, size, scale, offset } = req.body;
    let finalPath = base64Path; 
    if (req.files && req.files['file']) finalPath = `${process.env.FRONTEND_URL}/uploads/${req.files['file'][0].filename}`;

    let finalIcon = base64Icon; 
    if (req.files && req.files['iconFile']) finalIcon = `${import.meta.env.VITE_API_URL}/uploads/${req.files['iconFile'][0].filename}`;

    if (!finalPath) return res.status(400).json({ msg: "Thiếu dữ liệu file 3D (.glb)" });

    let parsedSize = [1, 1, 1];
    let parsedOffset = [0, 0, 0];
    try { 
      if (size) parsedSize = typeof size === 'string' ? JSON.parse(size) : size;
      if (offset) parsedOffset = typeof offset === 'string' ? JSON.parse(offset) : offset;
    } catch(e) {}

    const newFurniture = new Furniture({
      category, name, path: finalPath, icon: finalIcon,
      size: parsedSize, scale: scale || 1.0, offset: parsedOffset
    });

    const savedItem = await newFurniture.save();
    
    // GHI THÔNG BÁO VÀO DB
    try {
      await Notification.create({
        actionType: 'MODEL_CHANGE',
        message: `Admin ${req.user?.username || ''} đã thêm một Model 3D mới có tên "${name}".`,
        performedBy: req.user?.username || 'Admin'
      });
    } catch (e) { console.log('Lỗi ghi notification'); }

    res.json({ msg: "Lưu thành công!", id: savedItem._id });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi ghi dữ liệu: " + err.message });
  }
});

// LƯU CẤU HÌNH BANNER/SLIDES/CATEGORY ICON (Đã tích hợp Notification)
router.post('/settings', auth, async (req, res) => {
  try {
    const { bannerText, slides, categoryIcons, authBgImage } = req.body;
    let settings = await Setting.findOne();

    if (settings) {
      settings.bannerText = bannerText;
      settings.slides = slides;
      settings.categoryIcons = categoryIcons;
      if (authBgImage !== undefined) settings.authBgImage = authBgImage;
      await settings.save();
    } else {
      settings = new Setting({ bannerText, slides, categoryIcons, authBgImage });
      await settings.save();
    }

    // GHI THÔNG BÁO VÀO DB
    try {
      await Notification.create({
        actionType: 'UI_CHANGE',
        message: `Admin ${req.user?.username || ''} đã lưu các thay đổi ở trang Quản lý Giao Diện.`,
        performedBy: req.user?.username || 'Admin'
      });
    } catch (e) {}

    return res.status(200).json({ msg: "Cập nhật cấu hình thành công!", settings });
  } catch (err) {
    return res.status(500).json({ msg: "Lỗi Server nội bộ" });
  }
});

router.put('/furniture/:id', auth, async (req, res) => {
  try {
    const updatedFurniture = await Furniture.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    if (!updatedFurniture) return res.status(404).json({ msg: 'Không tìm thấy món đồ này' });
    
    // GHI THÔNG BÁO VÀO DB
    try {
      await Notification.create({
        actionType: 'MODEL_CHANGE',
        message: `Admin ${req.user?.username || ''} đã chỉnh sửa cấu hình của model "${updatedFurniture.name}".`,
        performedBy: req.user?.username || 'Admin'
      });
    } catch (e) {}

    res.json({ msg: "Cập nhật thành công!", data: updatedFurniture });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi khi cập nhật database" });
  }
});

router.delete('/furniture/:id', auth, async (req, res) => {
  try {
    const item = await Furniture.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Không tìm thấy item' });
    const name = item.name;
    await Furniture.findByIdAndDelete(req.params.id);

    try {
      await Notification.create({
        actionType: 'MODEL_CHANGE',
        message: `Admin ${req.user?.username || ''} đã xóa model "${name}" khỏi hệ thống.`,
        performedBy: req.user?.username || 'Admin'
      });
    } catch (e) {}

    res.json({ msg: 'Đã xóa item thành công' });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server khi xóa item' });
  }
});

router.delete('/furniture/category/:name', auth, async (req, res) => {
  try {
    const catName = req.params.name.toLowerCase();
    if (catName === 'door' || catName === 'window') {
      return res.status(403).json({ msg: 'Cấm xóa danh mục cốt lõi của cấu trúc hệ thống!' });
    }

    await Furniture.deleteMany({ category: req.params.name });
    res.json({ msg: `Đã xóa sạch category ${req.params.name}` });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server: ' + err.message });
  }
});

router.post('/furniture/rename-category', auth, async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    await Furniture.updateMany(
      { category: oldName },
      { $set: { category: newName } }
    );
    res.json({ msg: "Đổi tên category thành công!" });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server khi đổi tên: ' + err.message });
  }
});

router.get('/save', auth, async (req, res) => {
  try {
    const designs = await Design.find({ user: req.user.id });
    res.json(designs);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi lấy dữ liệu' });
  }
});

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
    res.status(500).json({ msg: 'Lỗi save' });
  }
});

module.exports = router;