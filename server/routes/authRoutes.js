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

router.post('/change-password', authController.changePassword);

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
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ msg: 'Không tìm thấy người dùng!' });
    
    if (targetUser.username === 'admin') {
      return res.status(403).json({ msg: 'Cấm xóa tài khoản Admin hệ thống!' });
    }

    const deletedName = targetUser.username;
    await User.findByIdAndDelete(req.params.id);

    // Kích hoạt thông báo khi Admin xoá user
    const Notification = require('../models/Notification');
    try {
      await Notification.create({
        actionType: 'USER_CHANGE',
        message: `Admin ${req.user?.username || ''} đã xoá vĩnh viễn tài khoản "${deletedName}".`,
        performedBy: req.user?.username || 'Admin'
      });
    } catch (e) {}

    res.json({ msg: 'Đã xóa người dùng thành công' });
  } catch (err) { res.status(500).json({ msg: 'Lỗi server' }); }
});

// Cập nhật Vai trò (Role)
// Cập nhật Toàn diện User (Dành cho Admin)
router.put('/users/:id', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ msg: 'Không tìm thấy người dùng!' });
    
    // Bảo vệ Admin gốc
    if (targetUser.username === 'admin' && req.body.username !== 'admin') {
      return res.status(403).json({ msg: 'Không được đổi tên hoặc quyền của Super Admin!' });
    }

    // Cập nhật thông tin cơ bản
    targetUser.username = req.body.username || targetUser.username;
    targetUser.email = req.body.email || targetUser.email;
    targetUser.role = req.body.role || targetUser.role;

    // Nếu Admin có nhập mật khẩu mới để ép đổi pass
    if (req.body.password && req.body.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      targetUser.password = await bcrypt.hash(req.body.password, salt);
    }

    await targetUser.save();

    // Sinh thông báo
    const Notification = require('../models/Notification');
    try {
      await Notification.create({
        actionType: 'USER_CHANGE',
        message: `Admin ${req.user?.username || ''} đã chỉnh sửa hồ sơ của tài khoản "${targetUser.username}".`,
        performedBy: req.user?.username || 'Admin'
      });
    } catch (e) {}

    res.json({ msg: 'Cập nhật thông tin tài khoản thành công' });
  } catch (err) { res.status(500).json({ msg: 'Lỗi server' }); }
});

// Admin Tạo Tài khoản Mới
router.post('/users', auth, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'Email này đã được sử dụng!' });
    
    user = new User({ username, email, password, role });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt); // Mã hóa password trước khi lưu
    await user.save();

    // 👇 CHÈN THÊM DÒNG NÀY VÀO ĐÂY ĐỂ TẠO THÔNG BÁO XỊN XÒ VÀO COMPONENT ĐÃ TẠO
    const Notification = require('../models/Notification'); // Import tạm model Notification tại đây
    await Notification.create({
      actionType: 'NEW_USER',
      message: `Quản trị viên đã tạo mới tài khoản "${username}" với vai trò [${role || 'user'}].`,
      performedBy: req.user?.username || 'Admin' // Lấy tên admin thực hiện qua middleware auth
    });

    res.json({ msg: 'Tạo người dùng thành công' });
  } catch (err) { res.status(500).json({ msg: 'Lỗi server: ' + err.message }); }
});


// === CHÈN THÊM ĐOẠN API ĐỔI MẬT KHẨU NÀY VÀO ĐÂY (TRÊN MODULE.EXPORTS) ===
router.post('/change-password', async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ msg: 'Không tìm thấy tài khoản này.' });

    // So sánh mật khẩu cũ bằng hàm compare của bcrypt giống như lúc đăng nhập
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Mật khẩu cũ không chính xác!' });

    // Nếu khớp thì tiến hành mã hoá mật khẩu mới và lưu
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Tự động sinh ra 1 thông báo hệ thống bảo mật khi đổi pass thành công
    const Notification = require('../models/Notification');
    await Notification.create({
      actionType: 'USER_CHANGE',
      message: `Tài khoản "${username}" vừa thay đổi mật khẩu bảo mật hệ thống.`,
      performedBy: username
    });

    res.json({ msg: 'Đổi mật khẩu thành công!' });
  } catch (error) { 
    res.status(500).json({ msg: 'Lỗi hệ thống khi đổi mật khẩu.' }); 
  }
});
// =======================================================================

router.get('/user-status/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ msg: 'Không tìm thấy user' });
    
    // Đã thay đổi: Kiểm tra xem pass có phải là chuỗi giả của Google không
    const hasPassword = !!(user.password && user.password !== 'OAUTH_USER_NO_PASSWORD');
    res.json({ hasPassword });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;