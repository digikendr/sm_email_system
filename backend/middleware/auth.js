const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    // Authentication successful
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to use for PDF downloads since they might be opened in new tabs 
// and we want a friendly error instead of JSON if they aren't authenticated.
const requireAuthHTML = (req, res, next) => {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.status(401).send('<h1>Unauthorized</h1><p>Please log in via the Admin Portal first.</p>');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');
    if (decoded.role !== 'admin') {
      return res.status(403).send('<h1>Forbidden</h1><p>You do not have permission to view this.</p>');
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send('<h1>Session Expired</h1><p>Please log in via the Admin Portal again.</p>');
  }
};

module.exports = { requireAuth, requireAuthHTML };
