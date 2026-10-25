const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { PG, Review, Booking } = require('../models');
const { auth, role, upload } = require('../middleware');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : res.status(404).json({ message: 'Listing not found' });

// Search + filter
router.get('/', async (req, res, next) => {
  try {
    const { q, city, minRent, maxRent, gender, sharing, amenities, availableOnly, sort } = req.query;
    const f = {};
    if (city) f.city = new RegExp('^' + esc(city.trim()) + '$', 'i');
    if (q) { const r = new RegExp(esc(q.trim()), 'i'); f.$or = [{ name: r }, { area: r }, { city: r }, { address: r }]; }
    if (minRent || maxRent) f.rent = { ...(minRent && { $gte: +minRent }), ...(maxRent && { $lte: +maxRent }) };
    if (gender) f.gender = { $in: [gender, 'unisex'] };
    if (sharing) f.sharing = +sharing;
    if (amenities) f.amenities = { $all: amenities.split(',').filter(Boolean) };
    if (availableOnly === 'true') f.availableBeds = { $gt: 0 };
    const sorts = { rentAsc: { rent: 1 }, rentDesc: { rent: -1 }, rating: { avgRating: -1 }, newest: { createdAt: -1 } };
    const pgs = await PG.find(f).sort(sorts[sort] || sorts.newest).limit(300).populate('owner', 'name');
    res.json(pgs);
  } catch (e) { next(e); }
});

// Owner's own listings
router.get('/mine', auth, role('owner', 'admin'), async (req, res, next) => {
  try {
    const admin = req.user.role === 'admin';
    res.json(await PG.find(admin ? {} : { owner: req.user.id }).sort({ createdAt: -1 }).populate('owner', 'name'));
  } catch (e) { next(e); }
});

router.get('/:id', validId, async (req, res, next) => {
  try {
    const pg = await PG.findById(req.params.id).populate('owner', 'name phone');
    if (!pg) return res.status(404).json({ message: 'Listing not found' });
    const reviews = await Review.find({ pg: pg._id }).sort({ createdAt: -1 }).populate('user', 'name');
    res.json({ pg, reviews });
  } catch (e) { next(e); }
});

const pick = (b) => ({
  name: b.name, description: b.description, city: b.city, area: b.area, address: b.address,
  rent: +b.rent, deposit: +b.deposit || 0, gender: b.gender, sharing: +b.sharing,
  totalBeds: +b.totalBeds, availableBeds: Math.min(+b.availableBeds, +b.totalBeds),
  amenities: (b.amenities || '').split(',').map((s) => s.trim()).filter(Boolean),
  rules: b.rules, contactPhone: b.contactPhone
});

router.post('/', auth, role('owner', 'admin'), upload.array('images', 5), async (req, res, next) => {
  try {
    const data = pick(req.body);
    const pg = await PG.create({ ...data, owner: req.user.id, images: (req.files || []).map((f) => '/uploads/' + f.filename) });
    res.status(201).json(pg);
  } catch (e) {
    if (e.name === 'ValidationError') return res.status(400).json({ message: Object.values(e.errors)[0].message });
    next(e);
  }
});

router.put('/:id', auth, role('owner', 'admin'), validId, upload.array('images', 5), async (req, res, next) => {
  try {
    const own = { _id: req.params.id }; if (req.user.role !== 'admin') own.owner = req.user.id;
    const pg = await PG.findOne(own);
    if (!pg) return res.status(404).json({ message: 'Listing not found' });
    Object.assign(pg, pick({ ...pg.toObject(), amenities: pg.amenities.join(','), ...req.body }));
    const rm = (req.body.removeImages || '').split(',').filter((i) => pg.images.includes(i));
    if (rm.length) { pg.images = pg.images.filter((i) => !rm.includes(i)); rm.forEach((i) => fs.unlink(path.join(__dirname, '..', i), () => {})); }
    if (req.files?.length) pg.images = [...pg.images, ...req.files.map((f) => '/uploads/' + f.filename)].slice(0, 8);
    await pg.save();
    res.json(pg);
  } catch (e) { next(e); }
});

router.delete('/:id', auth, role('owner', 'admin'), validId, async (req, res, next) => {
  try {
    const own = { _id: req.params.id }; if (req.user.role !== 'admin') own.owner = req.user.id;
    const pg = await PG.findOneAndDelete(own);
    if (!pg) return res.status(404).json({ message: 'Listing not found' });
    pg.images.forEach((i) => fs.unlink(path.join(__dirname, '..', i), () => {}));
    await Promise.all([Review.deleteMany({ pg: pg._id }), Booking.deleteMany({ pg: pg._id })]);
    res.json({ message: 'Listing deleted' });
  } catch (e) { next(e); }
});

router.post('/:id/reviews', auth, role('tenant'), validId, async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: 'Choose a rating from 1 to 5' });
    if (!(await PG.exists({ _id: req.params.id }))) return res.status(404).json({ message: 'Listing not found' });
    await Review.findOneAndUpdate({ pg: req.params.id, user: req.user.id }, { rating, comment }, { upsert: true, new: true, runValidators: true });
    const [s] = await Review.aggregate([{ $match: { pg: new mongoose.Types.ObjectId(req.params.id) } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
    await PG.findByIdAndUpdate(req.params.id, { avgRating: Math.round(s.avg * 10) / 10, reviewCount: s.n });
    res.status(201).json({ message: 'Review saved' });
  } catch (e) { next(e); }
});

module.exports = router;