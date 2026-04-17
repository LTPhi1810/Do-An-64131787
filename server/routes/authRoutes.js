const express = require('express');
const passport = require('passport');
require('../config/passport');
const router = express.Router();
const authController = require('../controllers/authController');
const smtpController = require('../controllers/smtpController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/smtp-config', smtpController.getConfig);
router.post('/smtp-config', smtpController.saveConfig);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/api/auth/google/failure', session: false }), authController.googleCallback);
router.get('/google/failure', (req, res) => res.status(400).json({ msg: 'Đăng nhập Google không thành công.' }));

module.exports = router;