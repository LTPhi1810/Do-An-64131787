const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'Không có token, quyền truy cập bị từ chối' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Gán ID user vào request
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token không hợp lệ' });
  }
};