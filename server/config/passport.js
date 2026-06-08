const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification'); // Thêm dòng này để gọi Thông báo
const { loadConfig } = require('../controllers/smtpController');

const config = loadConfig();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || config.googleClientId;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || config.googleClientSecret;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || config.googleCallbackUrl || 'http://localhost:5000/api/auth/google/callback';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(null, false, { message: 'Email không tìm thấy từ Google.' });

        let user = await User.findOne({ email });
        if (!user) {
          // 👉 Gán chuỗi đặc biệt để không bị lỗi Mongoose 'required'
          user = new User({
            username: profile.displayName || email.split('@')[0],
            email,
            password: 'OAUTH_USER_NO_PASSWORD', 
            googleId: profile.id,
            role: 'user'
          });
          await user.save();

          // Kích hoạt thông báo khi có User đăng nhập bằng Google lần đầu
          try {
            await Notification.create({
              actionType: 'NEW_USER',
              message: `Người dùng "${user.username}" vừa tham gia hệ thống thông qua tài khoản Google.`,
              performedBy: 'System'
            });
          } catch (e) {}
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return done(null, { token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
      } catch (error) {
        return done(error);
      }
    }
  ));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;