const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { signToken, auth } = require('../middleware');

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
    const user = await User.create({
      name, email, phone,
      password: await bcrypt.hash(password, 10),
      role: role === 'owner' ? 'owner' : 'tenant'
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.password)))
      return res.status(401).json({ message: 'Incorrect email or password' });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(user));
  } catch (e) { next(e); }
});

module.exports = router;
