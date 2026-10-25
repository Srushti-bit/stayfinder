require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/pgs', require('./routes/pgs'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/recommend', require('./routes/recommend'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  console.error(err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Each image must be under 3 MB' });
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stayfinder')
  .then(() => app.listen(PORT, () => console.log(`StayFinder running at http://localhost:${PORT}`)))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
