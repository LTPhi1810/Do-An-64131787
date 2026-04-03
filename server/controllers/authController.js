const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Kiểm tra xem user đã tồn tại chưa
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Email này đã được sử dụng!' });

        // 2. Mã hóa mật khẩu (Đừng bao giờ lưu mật khẩu thô!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Tạo user mới
        user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // Gửi trả về cả token và user
        res.status(201).json({ 
            token, 
            user: { id: user._id, username: user.username, email: user.email },
            msg: 'Đăng ký và đăng nhập thành công!' 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server rồi Phi ơi!');
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kiểm tra Email
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Email không tồn tại!' });

        // 2. So sánh mật khẩu (Giải mã cái đống loằng ngoằng trong Database để so)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Mật khẩu không đúng!' });

        // 3. Tạo Token (Cái vé để React biết User đã đăng nhập)
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' } // Vé có hạn trong 1 tiếng
        );

        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email },
            msg: 'Chào mừng Phi quay trở lại PhiSpace!'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server rồi Phi ơi!');
    }
};