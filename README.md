# StayFinder

**Smart PG discovery and management platform.** Tenants search, compare and request beds in paying-guest (PG) accommodation across Nagpur, Pune, Mumbai and Bangalore. Owners list and manage their PGs, and an admin can manage every listing.

Built as an Advanced Databases mini project to demonstrate **NoSQL design, indexing and query optimization, and transactions with concurrency control** on MongoDB.

## Features

- **Tenants:** search with filters (city, rent range, boys/girls, sharing, amenities, free beds), ranked "best match" recommendations, bed requests with a move-in date, ratings and reviews
- **Owners:** add, edit and delete listings with photo uploads, accept or reject bed requests
- **Admin:** edit or delete any listing
- **Security:** bcrypt-hashed passwords, JWT sessions, role-based access (tenant, owner, admin)
- **Data:** 500 sample PGs across 4 cities (areas and landmarks are real, PG names, owners and reviews are fictional)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT, bcrypt |
| Uploads | Multer |

## Advanced database concepts

### 1. NoSQL data modelling
Four collections: `users`, `pgs`, `reviews`, `bookings`. Amenities and images are **embedded** arrays inside each PG, while reviews and bookings are **referenced** by ObjectId because they grow and have their own lifecycle. Rating averages are computed with an **aggregation** (`$group`) and stored on the PG for fast reads. The relational design was normalized to BCNF before mapping it to documents.

### 2. Indexing and query optimization
Compound, multikey and unique indexes are defined in `models.js`. `benchmark.js` runs the same search on 100,000 generated PGs with and without an index:

| | No index | Index `{city, gender, rent}` |
|---|---|---|
| Plan (`explain()`) | `SORT > COLLSCAN` | `LIMIT > FETCH > IXSCAN` |
| Documents examined | 100,000 | 22 |
| Average time | 98.5 ms | 1.6 ms (about 61x faster) |

The index costs about 0.9 MB for 21.5 MB of data.

### 3. Transactions and concurrency control
Accepting a bed request deducts a bed and marks the booking accepted inside one multi-document **transaction**. `acid-demo.js` shows:

- **Commit:** both changes are saved together
- **Rollback:** a failure after the deduction undoes it
- **Race condition:** 5 tenants request the last bed at once. Unprotected read-check-write code accepts all 5 (overbooking); a guarded atomic update or a transaction accepts exactly 1

<!-- Add screenshots to docs/screenshots and uncomment:
## Screenshots
![Home](docs/screenshots/home.png)
![Benchmark](docs/screenshots/benchmark.png)
![ACID demo](docs/screenshots/acid-demo.png)
-->

## Getting started

### Requirements
- Node.js 18 or newer
- MongoDB Community Server (running locally)

### Install and run
```bash
git clone https://github.com/<your-username>/stayfinder.git
cd stayfinder
npm install
cp .env.example .env        # on Windows: copy .env.example .env
# edit .env and set JWT_SECRET to a long random string
node seed.js                # creates the 500 sample PGs and demo accounts
npm start
```
Open http://localhost:5000

### Enable transactions (optional)
Transactions need MongoDB to run as a replica set. Add this to `mongod.cfg` and restart the MongoDB service:
```yaml
replication:
  replSetName: rs0
```
Then run `node initreplset.js` once and set this in `.env`:
```
MONGO_URI=mongodb://127.0.0.1:27017/stayfinder?replicaSet=rs0
```
Without a replica set the app still works and falls back to a guarded atomic update.

### Useful scripts
| Command | What it does |
|---|---|
| `node seed.js` | Create sample data (first run) |
| `node seed.js --top-up` | Add any missing sample PGs, keeping your edits |
| `node seed.js --reset` | Wipe and recreate the sample data |
| `node viewdb.js [collection] [n]` | Show collections and documents |
| `node benchmark.js` | Index benchmark on 100,000 documents |
| `node acid-demo.js` | Commit, rollback and concurrency demo |

### Demo accounts (local use only)
| Role | Email | Password |
|---|---|---|
| Admin | admin@stayfinder.test | admin123 |
| Owner | owner@stayfinder.test | owner123 |
| Tenant | tenant1@stayfinder.test | tenant123 |

## Project structure
```
server.js          Express app and MongoDB connection
models.js          Mongoose schemas and indexes
middleware.js      JWT auth, roles, image upload
routes/            auth, pgs, bookings, recommend
public/            HTML pages, CSS, client-side JavaScript
seed.js            Sample data generator
benchmark.js       Indexing demo
acid-demo.js       Transactions and concurrency demo
initreplset.js     One-time replica set setup
viewdb.js          Database viewer
```

## Limitations and future scope
- Triggers (change streams) and MongoDB views are not implemented yet
- Text search uses a case-insensitive pattern match, which can't use the city index as efficiently as an exact match
- Planned: AI review summaries, natural-language search, map view, deployment on MongoDB Atlas

## Author
Built by Srushti Lohakare.
