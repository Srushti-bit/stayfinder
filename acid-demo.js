// ACID + concurrency demo:  node acid-demo.js
// 1) transaction COMMIT  2) transaction ROLLBACK  3) race condition: unsafe code vs atomic update vs transactions
// Parts 1 and 2 (and the transaction round of part 3) need the replica set. See initreplset.js. Demo data is removed at the end.
require('dotenv').config();
const mongoose = require('mongoose');
const { User, PG, Booking } = require('./models');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const head = (t) => console.log('\n' + '='.repeat(68) + '\n' + t + '\n' + '='.repeat(68));
const fail = (m) => Object.assign(new Error(m), { expected: true });

// "Accept a booking": deduct a bed AND mark the booking accepted, atomically.
async function txAccept(pgId, bookingId, { crash = false } = {}) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const pg = await PG.findOneAndUpdate({ _id: pgId, availableBeds: { $gt: 0 } }, { $inc: { availableBeds: -1 } }, { session });
      if (!pg) throw fail('No beds left');
      if (crash) throw fail('Simulated failure after the bed was deducted');
      await Booking.updateOne({ _id: bookingId }, { status: 'accepted' }, { session });
    });
  } finally { await session.endSession(); }
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stayfinder');
  const owner = await User.findOne({ role: 'owner' });
  const tenants = await User.find({ role: 'tenant' }).limit(5);
  if (!owner || !tenants.length) { console.log('Run "node seed.js --reset" first so owners and tenants exist.'); process.exit(1); }
  const rs = !!(await mongoose.connection.db.admin().command({ hello: 1 })).setName;
  const ids = [];
  const mkPG = async (name, beds) => { const p = await PG.create({ owner: owner._id, name, city: 'Nagpur', area: 'Demo', rent: 5000, gender: 'unisex', sharing: 2, totalBeds: 5, availableBeds: beds }); ids.push(p._id); return p; };
  const mkBooking = (pg, i = 0) => Booking.create({ pg: pg._id, tenant: tenants[i % tenants.length]._id, owner: owner._id, moveInDate: new Date() });
  const state = async (pg, b) => `beds = ${(await PG.findById(pg._id)).availableBeds}` + (b ? `, booking = ${(await Booking.findById(b._id)).status}` : '');

  try {
    if (rs) {
      head('1. TRANSACTION COMMIT  (Atomicity + Durability)');
      const pg = await mkPG('ACID Demo PG 1', 2);
      const b1 = await mkBooking(pg);
      console.log('Before :', await state(pg, b1));
      await txAccept(pg._id, b1._id);
      console.log('After  :', await state(pg, b1), '  <- both changes saved together');

      head('2. TRANSACTION ROLLBACK  (Atomicity)');
      const b2 = await mkBooking(pg);
      console.log('Before :', await state(pg, b2));
      try { await txAccept(pg._id, b2._id, { crash: true }); } catch (e) { console.log('Error  :', e.message); }
      console.log('After  :', await state(pg, b2), '  <- the bed deduction was rolled back, nothing changed');
    } else {
      console.log('\n(Replica set not enabled, so the COMMIT / ROLLBACK demos are skipped. Run initreplset.js to enable them.)');
    }

    head('3. CONCURRENCY: 5 tenants try to book the LAST bed at the same moment');
    // a) UNSAFE: read, check, then write. Another request can slip in between = lost update / overbooking.
    const pgU = await mkPG('ACID Demo PG 3a (unsafe)', 1);
    const unsafe = async () => { const p = await PG.findById(pgU._id); if (p.availableBeds > 0) { await sleep(100); await PG.updateOne({ _id: pgU._id }, { $set: { availableBeds: p.availableBeds - 1 } }); return true; } return false; };
    const u = (await Promise.all(Array.from({ length: 5 }, unsafe))).filter(Boolean).length;
    console.log(`a) Read-check-write (no protection): ${u} of 5 bookings accepted for 1 bed  <- OVERBOOKED (lost update)`);

    // b) SAFE: one atomic conditional update
    const pgA = await mkPG('ACID Demo PG 3b (atomic)', 1);
    const atomic = async () => !!(await PG.findOneAndUpdate({ _id: pgA._id, availableBeds: { $gt: 0 } }, { $inc: { availableBeds: -1 } }));
    const a = (await Promise.all(Array.from({ length: 5 }, atomic))).filter(Boolean).length;
    console.log(`b) Atomic conditional update ($inc with availableBeds > 0): ${a} of 5 accepted, ${await state(pgA)}`);

    // c) SAFE: transactions
    if (rs) {
      const pgT = await mkPG('ACID Demo PG 3c (transactions)', 1);
      const bs = await Promise.all(Array.from({ length: 5 }, (_, i) => mkBooking(pgT, i)));
      const r = await Promise.allSettled(bs.map((b) => txAccept(pgT._id, b._id)));
      console.log(`c) Transactions: ${r.filter((x) => x.status === 'fulfilled').length} of 5 committed, ${r.filter((x) => x.status === 'rejected').length} rejected, ${await state(pgT)}`);
    }
    console.log('\nConclusion: concurrency control stops two tenants getting the same bed. Beds never go below zero.');
  } finally {
    await PG.deleteMany({ _id: { $in: ids } });
    await Booking.deleteMany({ pg: { $in: ids } });
    console.log('\n(Demo data removed.)');
    process.exit(0);
  }
})().catch((e) => { console.error('Demo failed:', e.message); process.exit(1); });