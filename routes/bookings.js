const router = require('express').Router();
const mongoose = require('mongoose');
const { Booking, PG } = require('../models');
const { auth, role } = require('../middleware');

const httpErr = (status, message) => Object.assign(new Error(message), { status });

// Multi-document transactions need MongoDB running as a replica set. Detect it once;
// if it is not available the app falls back to the single-document atomic update.
let txOk = null;
async function supportsTransactions() {
  if (txOk === null) {
    try { txOk = !!(await mongoose.connection.db.admin().command({ hello: 1 })).setName; } catch { txOk = false; }
  }
  return txOk;
}

// Tenant requests a bed
router.post('/', auth, role('tenant'), async (req, res, next) => {
  try {
    const { pg: pgId, moveInDate, message } = req.body;
    if (!mongoose.isValidObjectId(pgId) || !moveInDate) return res.status(400).json({ message: 'Choose a move-in date' });
    const pg = await PG.findById(pgId);
    if (!pg) return res.status(404).json({ message: 'Listing not found' });
    if (pg.availableBeds < 1) return res.status(400).json({ message: 'No beds are available in this PG right now' });
    if (await Booking.exists({ pg: pgId, tenant: req.user.id, status: 'pending' }))
      return res.status(409).json({ message: 'You already have a pending request for this PG' });
    const b = await Booking.create({ pg: pgId, tenant: req.user.id, owner: pg.owner, moveInDate, message });
    res.status(201).json(b);
  } catch (e) { next(e); }
});

router.get('/mine', auth, role('tenant'), async (req, res, next) => {
  try { res.json(await Booking.find({ tenant: req.user.id }).sort({ createdAt: -1 }).populate('pg', 'name city area rent images contactPhone')); }
  catch (e) { next(e); }
});

router.get('/owner', auth, role('owner'), async (req, res, next) => {
  try {
    res.json(await Booking.find({ owner: req.user.id }).sort({ createdAt: -1 })
      .populate('pg', 'name city area').populate('tenant', 'name email phone'));
  } catch (e) { next(e); }
});

// Owner accepts or rejects. Accepting = deduct a bed AND mark the booking accepted, as ONE transaction (all or nothing).
router.patch('/:id', auth, role('owner'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const work = async (session) => {
      const opt = session ? { session } : {};
      const b = await Booking.findOne({ _id: req.params.id, owner: req.user.id }).session(session || null);
      if (!b) throw httpErr(404, 'Request not found');
      if (b.status !== 'pending') throw httpErr(400, 'This request was already answered');
      if (status === 'accepted') {
        // Guarded atomic update: only succeeds while a bed is free, so beds can never go below zero
        const pg = await PG.findOneAndUpdate({ _id: b.pg, availableBeds: { $gt: 0 } }, { $inc: { availableBeds: -1 } }, opt);
        if (!pg) throw httpErr(400, 'No beds left to assign');
      }
      b.status = status;
      await b.save(opt);
      return b;
    };

    let result;
    if (await supportsTransactions()) {
      const session = await mongoose.startSession();
      try { await session.withTransaction(async () => { result = await work(session); }); }
      finally { await session.endSession(); }
    } else result = await work(null);
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;