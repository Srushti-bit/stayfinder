const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ---------- Schemas ---------- */
const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['tenant', 'owner', 'admin'], default: 'tenant' },
  phone: { type: String, trim: true }
}, { timestamps: true });

const pgSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  rent: { type: Number, required: true, min: 0 },
  deposit: { type: Number, default: 0 },
  gender: { type: String, enum: ['boys', 'girls', 'unisex'], required: true },
  sharing: { type: Number, enum: [1, 2, 3, 4], required: true },
  totalBeds: { type: Number, required: true, min: 1 },
  availableBeds: { type: Number, required: true, min: 0 },
  amenities: [String],
  rules: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  images: [String],
  avgRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

const reviewSchema = new Schema({
  pg: { type: Schema.Types.ObjectId, ref: 'PG', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true }
}, { timestamps: true });

const bookingSchema = new Schema({
  pg: { type: Schema.Types.ObjectId, ref: 'PG', required: true },
  tenant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  moveInDate: { type: Date, required: true },
  message: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

/* ---------- Indexes (query optimization) ---------- */
// PG search: equality fields first, then the range/sort field (the "ESR" rule)
pgSchema.index({ city: 1, rent: 1 });                 // city + rent range / sort by rent
pgSchema.index({ gender: 1, sharing: 1, rent: 1 });   // stay type + sharing + rent
pgSchema.index({ amenities: 1 });                     // multikey index on the amenities array
pgSchema.index({ owner: 1 });                         // owner's own listings
pgSchema.index({ avgRating: -1 });                    // "top rated" sorting
// Reviews: one review per tenant per PG, and fast "latest reviews of a PG"
reviewSchema.index({ pg: 1, user: 1 }, { unique: true });
reviewSchema.index({ pg: 1, createdAt: -1 });
// Bookings: tenant's requests, owner's inbox, duplicate-pending check
bookingSchema.index({ tenant: 1, status: 1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ pg: 1, tenant: 1, status: 1 });

const User = mongoose.model('User', userSchema);
const PG = mongoose.model('PG', pgSchema);
const Review = mongoose.model('Review', reviewSchema);
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { User, PG, Review, Booking };