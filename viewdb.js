// View the StayFinder database from JavaScript.
//   node viewdb.js              -> lists every collection with its document count
//   node viewdb.js pgs          -> shows the first 3 documents of the "pgs" collection
//   node viewdb.js reviews 10   -> shows the first 10 documents of "reviews"
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stayfinder');
  const db = mongoose.connection.db;
  const [, , name, n] = process.argv;

  if (!name) {
    console.log(`\nDatabase: ${db.databaseName}\n`);
    for (const c of await db.listCollections().toArray()) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`  ${c.name.padEnd(12)} ${String(count).padStart(4)} documents`);
    }
    console.log('\nTip: node viewdb.js pgs 3\n');
  } else {
    const docs = await db.collection(name).find().limit(+n || 3).toArray();
    docs.forEach((d) => { if (d.password) d.password = '*** bcrypt hash hidden ***'; });
    console.log(`\nCollection "${name}": showing ${docs.length} document(s)\n`);
    console.dir(docs, { depth: null, colors: true });
    console.log('Indexes:', JSON.stringify((await db.collection(name).indexes()).map((i) => i.key)));
  }
  process.exit(0);
})().catch((e) => { console.error('Could not read the database:', e.message); process.exit(1); });