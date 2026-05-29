const express = require('express');
const passport = require('passport');
require('../config/passport');
const router = express.Router();
const authController = require('../controllers/authController');
const smtpController = require('../controllers/smtpController');
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/smtp-config', smtpController.getConfig);
router.post('/smtp-config', smtpController.saveConfig);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/api/auth/google/failure', session: false }), authController.googleCallback);
router.get('/google/failure', (req, res) => res.status(400).json({ msg: 'Đăng nhập Google không thành công.' }));

router.get('/users', auth, async (req, res) => {
  try {
    // Chỉ lấy ra các trường cần thiết, giấu password đi
    const users = await User.find().select('-password'); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server khi lấy danh sách user' });
  }
});

router.delete('/users/:id', auth, async (req, res) => {
  try {
    // Tìm user xem có phải tài khoản admin tối cao không
    const targetUser = await User.findById(req.params.id);
    if (targetUser && targetUser.username === 'admin') {
      return res.status(403).json({ msg: 'Cấm xóa tài khoản Admin hệ thống!' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Đã xóa người dùng thành công' });
  } catch (err) { res.status(500).json({ msg: 'Lỗi server' }); }
});

// Cập nhật Vai trò (Role)
router.put('/users/:id/role', auth, async (req, res) => {
  try {
    // Tìm user xem có phải tài khoản admin tối cao không
    const targetUser = await User.findById(req.params.id);
    if (targetUser && targetUser.username === 'admin') {
      return res.status(403).json({ msg: 'Cấm thay đổi quyền của tài khoản Admin hệ thống!' });
    }

    await User.findByIdAndUpdate(req.params.id, { role: req.body.role });
    res.json({ msg: 'Cập nhật phân quyền thành công' });
  } catch (err) { res.status(500).json({ msg: 'Lỗi server' }); }
});

// Admin Tạo Tài khoản Mới
router.post('/users', auth, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) return res.status(400).json({ msg: 'Username hoặc Email đã tồn tại' });
    
    user = new User({ username, email, password, role });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt); // Mã hóa password trước khi lưu
    await user.save();
    res.json({ msg: 'Tạo người dùng thành công' });
  } catch (err) { res.status(500).json({ msg: 'Lỗi server: ' + err.message }); }
});

module.exports = router;