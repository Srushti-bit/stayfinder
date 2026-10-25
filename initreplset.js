// Run ONCE:  node initreplset.js
// Turns your local MongoDB into a single-node replica set (rs0). MongoDB needs this for transactions and change streams.
// Your existing data is kept.
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://127.0.0.1:27017/?directConnection=true', { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const admin = client.db('admin');
    try {
      const s = await admin.command({ replSetGetStatus: 1 });
      console.log(`Replica set "${s.set}" is already running. Nothing to do.`);
    } catch (e) {
      if (e.code === 94 || e.codeName === 'NotYetInitialized') {
        await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] } });
        console.log('Replica set "rs0" initiated.');
        console.log('Now open your .env file and set:\n  MONGO_URI=mongodb://127.0.0.1:27017/stayfinder?replicaSet=rs0\nthen restart the app (npm start).');
      } else if (e.code === 76 || /replSet|replication/i.test(e.message)) {
        console.log('MongoDB was started WITHOUT replication enabled.');
        console.log('Add these two lines at the bottom of mongod.cfg, restart the MongoDB service, then run this script again:\n\nreplication:\n  replSetName: rs0\n');
      } else throw e;
    }
  } catch (e) {
    console.error('Could not reach MongoDB:', e.message);
  } finally { await client.close(); }
})();