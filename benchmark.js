// Index benchmark:  node benchmark.js [documents]   (default 100000)   |   add --cleanup to delete the test collection afterwards
// Shows the SAME query on a big collection WITHOUT and WITH an index, using explain("executionStats").
require('dotenv').config();
const mongoose = require('mongoose');

const N = +process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 100000;
const CITIES = ['Nagpur', 'Pune', 'Mumbai', 'Nashik', 'Aurangabad', 'Amravati', 'Kolhapur', 'Solapur'];
const GENDERS = ['boys', 'girls', 'unisex'];
const AMEN = ['WiFi', 'Meals', 'AC', 'Laundry', 'Power backup', 'Geyser', 'Parking', 'CCTV'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const stagesOf = (p, out = []) => { if (!p) return out; out.push(p.stage); if (p.inputStage) stagesOf(p.inputStage, out); (p.inputStages || []).forEach((s) => stagesOf(s, out)); return out; };
const planOf = (ex) => { const w = ex.queryPlanner.winningPlan; return stagesOf(w.queryPlan || w).filter(Boolean).join(' > '); };

const QUERY = { city: 'Nagpur', gender: 'girls', rent: { $gte: 5000, $lte: 8000 }, availableBeds: { $gt: 0 } };
const SORT = { rent: 1 };

async function measure(coll, label) {
  const ex = await coll.find(QUERY).sort(SORT).limit(20).explain('executionStats');
  const es = ex.executionStats;
  await coll.find(QUERY).sort(SORT).limit(20).toArray();            // warm-up
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) await coll.find(QUERY).sort(SORT).limit(20).toArray();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 20;
  return { Scenario: label, 'Plan used': planOf(ex), 'Keys examined': es.totalKeysExamined, 'Docs examined': es.totalDocsExamined, 'Docs returned': es.nReturned, 'Avg time (ms)': +ms.toFixed(2) };
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stayfinder');
  const db = mongoose.connection.db;
  const coll = db.collection('pg_benchmark');
  await coll.drop().catch(() => {});

  console.log(`\nInserting ${N.toLocaleString()} test PG documents into "pg_benchmark"...`);
  for (let done = 0; done < N; done += 5000) {
    const docs = [];
    for (let i = done; i < Math.min(N, done + 5000); i++) {
      docs.push({ name: `Benchmark PG ${i}`, city: pick(CITIES), area: 'Area ' + (i % 40), gender: pick(GENDERS), sharing: 1 + Math.floor(Math.random() * 4),
        rent: 3000 + Math.floor(Math.random() * 12000), availableBeds: Math.floor(Math.random() * 11),
        amenities: AMEN.filter(() => Math.random() < 0.4), avgRating: +(1 + Math.random() * 4).toFixed(1) });
    }
    await coll.insertMany(docs, { ordered: false });
  }

  console.log('\nQuery: ', JSON.stringify(QUERY), ' sorted by rent, first 20 results\n');
  const before = await measure(coll, '1. No index');
  await coll.createIndex({ city: 1, gender: 1, rent: 1 }, { name: 'idx_city_gender_rent' });
  const after = await measure(coll, '2. Index {city, gender, rent}');
  console.table([before, after]);

  const st = await db.command({ collStats: 'pg_benchmark' });
  console.log(`Speed-up: ${(before['Avg time (ms)'] / Math.max(after['Avg time (ms)'], 0.01)).toFixed(1)}x faster, and ${before['Docs examined'].toLocaleString()} -> ${after['Docs examined'].toLocaleString()} documents examined.`);
  console.log(`Collection size: ${(st.size / 1048576).toFixed(1)} MB, total index size: ${(st.totalIndexSize / 1048576).toFixed(1)} MB (the cost of indexing: extra disk space and slower writes).\n`);

  if (process.argv.includes('--cleanup')) { await coll.drop(); console.log('Test collection deleted.'); }
  else console.log('Collection "pg_benchmark" kept so you can open it in Compass. Re-run with --cleanup to delete it.');
  process.exit(0);
})().catch((e) => { console.error('Benchmark failed:', e.message); process.exit(1); });