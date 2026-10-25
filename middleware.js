const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '7d' });

const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again' });
  }
};

const role = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have permission to do this' });

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'uploads'),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG or WEBP images are allowed'))
});

module.exports = { signToken, auth, role, upload };
