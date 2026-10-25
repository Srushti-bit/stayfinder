const router = require('express').Router();
const { PG } = require('../models');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// Scores one PG from 0-100 against the tenant's preferences and explains why.
function score(pg, prefs) {
  const reasons = [];
  let total = 0;

  // Budget (35): full marks within budget, fades to 0 at 20% over
  if (pg.rent <= prefs.budget) { total += 35; reasons.push(`Rent ${pg.rent <= prefs.budget * 0.8 ? 'well ' : ''}within your budget`); }
  else {
    const over = (pg.rent - prefs.budget) / prefs.budget;
    total += 35 * clamp(1 - over / 0.2, 0, 1);
    reasons.push(`₹${(pg.rent - prefs.budget).toLocaleString('en-IN')} over your budget`);
  }

  // Amenities (25): share of your must-haves that the PG offers
  if (prefs.amenities.length) {
    const have = prefs.amenities.filter((a) => pg.amenities.includes(a));
    const missing = prefs.amenities.filter((a) => !pg.amenities.includes(a));
    total += 25 * (have.length / prefs.amenities.length);
    if (have.length) reasons.push('Has ' + have.join(', '));
    if (missing.length) reasons.push('Missing ' + missing.join(', '));
  } else total += 25;

  // Sharing (10)
  if (prefs.sharing) {
    if (pg.sharing === prefs.sharing) { total += 10; reasons.push(pg.sharing === 1 ? 'Private room' : `${pg.sharing}-sharing as you wanted`); }
    else reasons.push(`${pg.sharing === 1 ? 'Private room' : pg.sharing + '-sharing'} instead of ${prefs.sharing === 1 ? 'private' : prefs.sharing + '-sharing'}`);
  } else total += 10;

  // Rating (15): new PGs are pulled toward a neutral 3.5 so one review can't dominate
  const adj = (pg.avgRating * pg.reviewCount + 3.5 * 3) / (pg.reviewCount + 3);
  total += 15 * (adj / 5);
  if (pg.reviewCount) reasons.push(`Rated ${pg.avgRating} by ${pg.reviewCount} tenant${pg.reviewCount > 1 ? 's' : ''}`);
  else reasons.push('No reviews yet');

  // Availability (15)
  total += pg.availableBeds >= 3 ? 15 : pg.availableBeds >= 1 ? 10 : 0;
  if (pg.availableBeds <= 2) reasons.push(`Only ${pg.availableBeds} bed${pg.availableBeds > 1 ? 's' : ''} left`);

  return { score: Math.round(total), reasons };
}

// GET /api/recommend?budget=7000&gender=girls&sharing=2&amenities=WiFi,Meals&city=Nagpur
router.get('/', async (req, res, next) => {
  try {
    const budget = +req.query.budget;
    if (!(budget > 0)) return res.status(400).json({ message: 'Enter your monthly budget to get matches' });
    const prefs = {
      budget,
      sharing: +req.query.sharing || 0,
      amenities: (req.query.amenities || '').split(',').map((s) => s.trim()).filter(Boolean)
    };
    // Hard filters: a PG that is full, or for the wrong gender, is never a match
    const f = { availableBeds: { $gt: 0 } };
    if (req.query.gender) f.gender = { $in: [req.query.gender, 'unisex'] };
    if (req.query.city) f.city = new RegExp('^' + esc(req.query.city.trim()) + '$', 'i');
    const pgs = await PG.find(f).limit(300);
    const ranked = pgs
      .map((pg) => ({ pg, ...score(pg, prefs) }))
      .sort((a, b) => b.score - a.score || b.pg.avgRating - a.pg.avgRating)
      .slice(0, 12);
    res.json(ranked);
  } catch (e) { next(e); }
});

router.score = score;
module.exports = router;
