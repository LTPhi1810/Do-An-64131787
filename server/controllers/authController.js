const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getTransport, loadConfig } = require('./smtpController');
const Notification = require('../models/Notification'); // Đảm bảo đã require model Notification ở đầu file

const getFromAddress = () => {
  const config = loadConfig();
  const fromName = process.env.EMAIL_FROM_NAME || config.fromName || 'PhiSpace';
  const fromEmail = process.env.SMTP_USER || config.user || 'no-reply@phispace.com';
  return `${fromName} <${fromEmail}>`;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transport = await getTransport();
  return transport.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });
};

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Kiểm tra xem user đã tồn tại chưa
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Email này đã được sử dụng!' });

        // 2. Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Tạo user mới
        user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // 👇 TỰ ĐỘNG LƯU THÔNG BÁO XỊN XÒ VÀO DATABASE KHI CÓ USER ĐĂNG KÝ MỚI
        try {
            await Notification.create({
                actionType: 'NEW_USER',
                message: `Người dùng mới "${username}" vừa đăng ký tài khoản thành công qua hệ thống.`,
                performedBy: 'System'
            });
        } catch (notiErr) {
            console.error('Lỗi tạo thông báo đăng ký:', notiErr);
        }

        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // Gửi trả về cả token và user
        res.status(201).json({ 
            token, 
            user: { id: user._id, username: user.username, email: user.email, role: user.role || 'user' },
            msg: 'Đăng ký và đăng nhập thành công!' 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server!');
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Email không tồn tại!' });

        const token = crypto.randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpiry = Date.now() + 3600000;
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/?resetToken=${token}&resetEmail=${encodeURIComponent(email)}`;
        const subject = 'PhiSpace - Yêu cầu đặt lại mật khẩu';
        const html = `
          <p>Xin chào ${user.username},</p>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <p>Nhấp vào liên kết bên dưới để tạo mật khẩu mới (hết hạn trong 1 giờ):</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        `;

        await sendEmail({ to: email, subject, html });
        res.json({ msg: 'Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Không thể gửi email. Kiểm tra cấu hình SMTP.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) {
            return res.status(400).json({ msg: 'Thiếu thông tin để đặt lại mật khẩu.' });
        }

        const user = await User.findOne({ email, resetToken: token });
        if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
            return res.status(400).json({ msg: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetToken = '';
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ msg: 'Đã cập nhật mật khẩu mới. Mời bạn đăng nhập lại.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Lỗi server khi đổi mật khẩu.' });
    }
};

exports.googleCallback = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (!req.user || !req.user.token) {
        return res.redirect(`${frontendUrl}/?googleError=1`);
    }

    const redirect = new URL(frontendUrl);
    redirect.searchParams.set('googleToken', req.user.token);
    redirect.searchParams.set('googleEmail', encodeURIComponent(req.user.user.email));
    redirect.searchParams.set('googleName', encodeURIComponent(req.user.user.username));
    return res.redirect(redirect.toString());
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kiểm tra Email
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Email không tồn tại!' });

        // 2. So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Mật khẩu không đúng!' });

        // 3. Tạo Token
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
            msg: 'Chào mừng quay trở lại PhiSpace!'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server!');
    }
};

// 👇 THÊM HÀM XỬ LÝ ĐỔI MẬT KHẨU NÀY VÀO CUỐI FILE ĐỂ FRONTEND GỌI ĐẾN
exports.changePassword = async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ msg: 'Không tìm thấy tài khoản này.' });

        // Logic check: Bỏ qua check mật khẩu cũ nếu đó là tài khoản Google (đang dùng pass giả)
        if (user.password && user.password !== "OAUTH_USER_NO_PASSWORD") {
            if (!oldPassword) return res.status(400).json({ msg: 'Vui lòng nhập mật khẩu cũ!' });
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) return res.status(400).json({ msg: 'Mật khẩu cũ không chính xác!' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        const Notification = require('../models/Notification');
        try {
            await Notification.create({
                actionType: 'USER_CHANGE',
                message: `Tài khoản "${username}" vừa thiết lập/thay đổi mật khẩu bảo mật hệ thống thành công.`,
                performedBy: username
            });
        } catch (e) {}

        res.json({ msg: 'Đổi mật khẩu thành công!' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ msg: 'Lỗi hệ thống khi đổi mật khẩu.' }); 
    }
};