const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
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
          const randomPassword = crypto.randomBytes(20).toString('hex');
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          user = new User({
            username: profile.displayName || email.split('@')[0],
            email,
            password: hashedPassword,
            googleId: profile.id,
          });
          await user.save();
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return done(null, { token, user: { id: user._id, username: user.username, email: user.email } });
      } catch (error) {
        return done(error);
      }
    }
  ));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
