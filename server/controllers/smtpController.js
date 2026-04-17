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

const saveConfig = (config) => {
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
    throw new Error('SMTP chưa được cấu hình đầy đủ. Vui lòng cấu hình SMTP trong Admin.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
};

module.exports = {
  loadConfig,
  saveConfig,
  getConfig: (req, res) => {
    const config = loadConfig();
    return res.json({
      host: config.host || '',
      port: config.port || '587',
      user: config.user || '',
      pass: config.pass || '',
      secure: config.secure || false,
      fromName: config.fromName || 'PhiSpace',
      googleClientId: config.googleClientId || '',
      googleClientSecret: config.googleClientSecret || '',
      googleCallbackUrl: config.googleCallbackUrl || 'http://localhost:5000/api/auth/google/callback'
    });
  },
  saveConfig: (req, res) => {
    const { host, port, user, pass, secure, fromName, googleClientId, googleClientSecret, googleCallbackUrl } = req.body;
    saveConfig({ host, port, user, pass, secure, fromName, googleClientId, googleClientSecret, googleCallbackUrl });
    return res.json({ msg: 'Cấu hình SMTP và Google OAuth đã được lưu.' });
  },
  getTransport,
};