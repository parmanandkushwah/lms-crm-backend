const crypto = require('crypto');
const { User } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { sendPasswordReset, sendWelcome } = require('../services/emailService');
const { success } = require('../utils/response');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !user.is_active)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user);
    await user.update({ refresh_token: refreshToken, last_login: new Date() });

    success(res, { data: { user, accessToken, refreshToken } }, 'Login successful');
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findByPk(decoded.id);
    if (!user || user.refresh_token !== refreshToken)
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const tokens = generateTokens(user);
    await user.update({ refresh_token: tokens.refreshToken });
    success(res, { data: tokens }, 'Token refreshed');
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    await req.user.update({ refresh_token: null });
    success(res, {}, 'Logged out successfully');
  } catch (err) { next(err); }
};

exports.me = async (req, res) => {
  success(res, { data: req.user }, 'Profile fetched');
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, email, newPassword, confirmPassword } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (newPassword) {
      if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      if (newPassword !== confirmPassword)
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      updates.password = newPassword;
    }
    if (req.file) updates.avatar = `/uploads/avatars/${req.file.filename}`;
    await req.user.update(updates);
    success(res, { data: req.user }, 'Profile updated');
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const valid = await req.user.comparePassword(currentPassword);
    if (!valid)
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    await req.user.update({ password: newPassword });
    success(res, {}, 'Password changed successfully');
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) return success(res, {}, 'If that email exists, a reset link has been sent');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await user.update({ reset_token: token, reset_token_expires: expires });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordReset(user.email, user.name, resetUrl);
    success(res, {}, 'Password reset email sent');
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ where: { reset_token: token } });
    if (!user || user.reset_token_expires < new Date())
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    await user.update({ password, reset_token: null, reset_token_expires: null });
    success(res, {}, 'Password reset successfully');
  } catch (err) { next(err); }
};
