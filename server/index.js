const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();
require('./config/passport');

const app = express();

// 1. Middleware quan trọng nhất (Phải nằm trên Routes)
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));

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

// 3. Kết nối MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/phispace';
mongoose.connect(mongoURI)
  .then(() => console.log(' Đã kết nối MongoDB thành công!'))
  .catch(err => console.error(' Lỗi kết nối MongoDB:', err));

app.get('/', (req, res) => {
  res.send('Server PhiSpace đang chạy mượt mà!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server đang khởi hành tại cổng ${PORT}`);
});