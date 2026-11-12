function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateDistrict(district) {
  return !!String(district || '').trim();
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ success: false, message: 'Please log in to continue.' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user_id || req.session.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  return next();
}

module.exports = {
  validateEmail,
  validateDistrict,
  requireAuth,
  requireAdmin,
};
