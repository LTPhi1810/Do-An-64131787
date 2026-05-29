const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Design = require('../models/Design');
const Setting = require('../models/Setting');
const Furniture = require('../models/FurnitureModel');

// --- CẤU HÌNH MULTER ĐỂ LƯU FILE ---
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Tự động tạo thư mục nếu chưa có
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    // Đổi tên file để không bị trùng (thêm timestamp)
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});
const upload = multer({ storage: storage });

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
router.post('/furniture', auth, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'iconFile', maxCount: 1 }]), async (req, res) => {
  try {
    const { category, name, path: base64Path, icon: base64Icon, size, scale, offset } = req.body;
    
    // Xử lý đường dẫn file 3D
    let finalPath = base64Path; // Mặc định giữ base64 nếu có (dùng cho Thêm Thủ Công nếu chưa sửa frontend)
    if (req.files && req.files['file']) {
      // Nếu có upload file vật lý, tạo URL
      finalPath = `http://localhost:5000/uploads/${req.files['file'][0].filename}`;
    }

    // Xử lý đường dẫn ảnh Icon
    let finalIcon = base64Icon; 
    if (req.files && req.files['iconFile']) {
      finalIcon = `http://localhost:5000/uploads/${req.files['iconFile'][0].filename}`;
    }

    if (!finalPath) return res.status(400).json({ msg: "Thiếu dữ liệu file 3D (.glb)" });

    // Cực kỳ quan trọng: Nếu gửi qua FormData, mảng size và offset bị biến thành chuỗi JSON, cần parse lại
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
    res.json({ msg: "Lưu thành công!", id: savedItem._id });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi ghi dữ liệu: " + err.message });
  }
});

// 3. LƯU PROJECT CỦA USER
router.get('/save', auth, async (req, res) => {
  try {
    const designs = await Design.find({ user: req.user.id });
    res.json(designs);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi lấy dữ liệu: ' + err.message });
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
    console.error('Error saving design:', err);
    res.status(500).json({ msg: 'Lỗi save: ' + err.message });
  }
});

// 4. LƯU CẤU HÌNH BANNER/SLIDES (Fixed F5 mất ảnh)
// Tìm đến đoạn định nghĩa API endpoint này trên Backend của bạn
router.post('/settings', async (req, res) => {
  try {
    // Bóc tách dữ liệu gửi từ Frontend lên, nhớ kiểm tra xem đã có authBgImage chưa
    const { bannerText, slides, categoryIcons, authBgImage } = req.body;

    // Tìm bản ghi settings hiện tại hoặc tự động tạo mới nếu chưa có (findOneAndUpdate)
    let settings = await Setting.findOne();

    if (settings) {
      // Cập nhật tất cả các trường dữ liệu
      settings.bannerText = bannerText;
      settings.slides = slides;
      settings.categoryIcons = categoryIcons;
      
      // ✨ QUAN TRỌNG: Gán dữ liệu ảnh nền đăng nhập vào đây để lưu xuống DB
      if (authBgImage !== undefined) {
        settings.authBgImage = authBgImage;
      }

      await settings.save();
    } else {
      // Trường hợp chưa có bản ghi nào trong DB thì tạo mới hoàn toàn
      settings = new Setting({
        bannerText,
        slides,
        categoryIcons,
        authBgImage
      });
      await settings.save();
    }

    return res.status(200).json({ msg: "Cập nhật cấu hình thành công!", settings });
  } catch (err) {
    console.error("Lỗi cập nhật settings backend:", err);
    return res.status(500).json({ msg: "Lỗi Server nội bộ" });
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
// 6. XÓA NGUYÊN DANH MỤC (ĐÃ THÊM KHÓA BẢO VỆ DOOR/WINDOW)
router.delete('/furniture/category/:name', auth, async (req, res) => {
  try {
    const catName = req.params.name.toLowerCase();
    // Khóa cứng ở server không cho API ngoài xóa door và window
    if (catName === 'door' || catName === 'window') {
      return res.status(403).json({ msg: 'Cấm xóa danh mục cốt lõi của cấu trúc hệ thống!' });
    }

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