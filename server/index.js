const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();
require('./config/passport');

const app = express();
const path = require('path');

// 1. Middleware quan trọng nhất (Phải nằm trên Routes)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Nới rộng cổ chai cho phép gửi file 3D nặng
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(session({ 
  secret: process.env.SESSION_SECRET || 'phispace-secret', 
  resave: false, 
  saveUninitialized: true 
}));

app.use(passport.initialize());
app.use(passport.session());

// 2. Khai báo Routes

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/designs', require('./routes/designRoutes'));

// === CHÈN THÊM ĐOẠN CODE NÀY NGAY DƯỚI KHAI BÁO ROUTES ===
const Notification = require('./models/Notification'); // Đảm bảo đúng đường dẫn tới file bạn tạo bữa trước

// API lấy 20 thông báo mới nhất
app.get('/api/notifications', async (req, res) => {
  try {
    const notis = await Notification.find().sort({ createdAt: -1 }).limit(20);
    res.json(notis);
  } catch (error) { 
    res.status(500).json({ msg: 'Lỗi server khi lấy thông báo' }); 
  }
});

// API đánh dấu đã đọc toàn bộ thông báo
app.put('/api/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ msg: 'Đã đánh dấu đọc tất cả thông báo thành công' });
  } catch (error) { 
    res.status(500).json({ msg: 'Lỗi server khi cập nhật trạng thái thông báo' }); 
  }
});

// 3. Kết nối MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/phispace';
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.get('/', (req, res) => {
  res.send('Server PhiSpace đang chạy mượt mà!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server đang khởi hành tại cổng ${PORT}`);
});
