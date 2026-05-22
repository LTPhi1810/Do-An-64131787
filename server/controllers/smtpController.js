const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const configPath = path.join(__dirname, '../smtpConfig.json');

const loadConfig = () => {
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) || {};
  } catch (error) {
    return {};
  }
};

const writeConfigToFile = (config) => {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
};

const getTransport = async () => {
  const config = loadConfig();
  const host = process.env.SMTP_HOST || config.host;
  const port = Number(process.env.SMTP_PORT || config.port || 587);
  const user = process.env.SMTP_USER || config.user;
  const pass = process.env.SMTP_PASS || config.pass;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : config.secure === true;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP chưa được cấu hình đầy đủ.');
  }

  return nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
};

module.exports = {
  loadConfig,
  // ️ Ẩn thông tin nhạy cảm khi gửi về Client
  getConfig: (req, res) => {
    try {
      const config = loadConfig();
      return res.json({
        host: config.host || '',
        port: config.port || '587',
        secure: config.secure || false,
        fromName: config.fromName || 'PhiSpace',
        googleCallbackUrl: config.googleCallbackUrl || 'http://localhost:5000/api/auth/google/callback',
        // Trả về rỗng để che giấu dữ liệu cũ
        user: '', 
        pass: '', 
        googleClientId: '', 
        googleClientSecret: ''
      });
    } catch (err) {
      console.error(' Lỗi getConfig:', err);
      res.status(500).json({ msg: 'Lỗi lấy cấu hình' });
    }
  },

  //  Chỉ cập nhật những trường Admin có nhập (khác rỗng)
  saveConfig: (req, res) => {
    try {
      const current = loadConfig();
      const updated = {
        ...current,
        host: req.body.host,
        port: req.body.port,
        secure: req.body.secure,
        fromName: req.body.fromName,
        googleCallbackUrl: req.body.googleCallbackUrl
      };

      // ️ Logic Chặn ghi đè chuỗi rỗng
      if (req.body.user && req.body.user.trim() !== "") updated.user = req.body.user;
      if (req.body.pass && req.body.pass.trim() !== "") updated.pass = req.body.pass;
      if (req.body.googleClientId && req.body.googleClientId.trim() !== "") updated.googleClientId = req.body.googleClientId;
      if (req.body.googleClientSecret && req.body.googleClientSecret.trim() !== "") updated.googleClientSecret = req.body.googleClientSecret;

      writeConfigToFile(updated);
      return res.json({ msg: 'Cấu hình SMTP đã được cập nhật an toàn.' });
    } catch (err) {
      console.error(' Lỗi saveConfig:', err);
      res.status(500).json({ msg: 'Lỗi lưu cấu hình' });
    }
  },
  getTransport,
};