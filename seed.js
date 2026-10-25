// npm run seed
// Loads realistic SAMPLE data for Nagpur: real localities and landmarks, fictional PG names, owners, phone numbers and reviews.
// node seed.js               first run: creates 500 sample PGs (Nagpur 110, Pune 130, Mumbai 130, Bangalore 130)
// node seed.js --top-up      adds only the sample PGs that are missing (up to 500); keeps your edits and photos
// node seed.js --reset       wipes the sample data (accounts ending in @stayfinder.test) and recreates it
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, PG, Review, Booking } = require('./models');

const owners = [
  ['Rajesh Deshmukh', 'owner@stayfinder.test', '9000000001'],
  ['Sunita Kulkarni', 'owner2@stayfinder.test', '9000000002'],
  ['Amit Bhoyar', 'owner3@stayfinder.test', '9000000003'],
  ['Meena Joshi', 'owner4@stayfinder.test', '9000000004']
];
const tenants = [
  ['Priya Wankhede', 'tenant1@stayfinder.test'],
  ['Rohan Thakre', 'tenant2@stayfinder.test'],
  ['Sneha Patil', 'tenant3@stayfinder.test']
];

// [name, area, address/landmark, rent, deposit, gender, sharing, totalBeds, availableBeds, amenities, owner, description, rules]
const pgs = [
  ['Shree Sai Girls PG', 'Dharampeth', 'Near Dharampeth Science College', 6500, 6500, 'girls', 2, 16, 5, ['WiFi', 'Meals', 'Laundry', 'CCTV', 'Geyser', 'Housekeeping'], 0, 'Safe, quiet lane in the heart of Dharampeth. Home-style veg meals twice a day and a warden on every floor.', 'Gate closes at 10 pm. Guests only in the visitor lounge.'],
  ['Vidya Boys PG', 'Bajaj Nagar', 'Near VNIT main gate', 5500, 5000, 'boys', 3, 24, 8, ['WiFi', 'Meals', 'Power backup', 'Geyser'], 1, 'Popular with engineering students. Study room open late and mess food with a weekly menu.', 'No smoking or alcohol. Notice period of 15 days.'],
  ['Orange City Residency', 'Sitabuldi', 'Near Nagpur Railway Station', 9800, 10000, 'unisex', 1, 10, 2, ['WiFi', 'AC', 'Meals', 'Housekeeping', 'Attached bathroom', 'CCTV'], 2, 'Private AC rooms for working professionals, minutes from the railway station and the city centre.', 'ID proof and one month deposit required.'],
  ['Techie Nest Co-Living', 'Manish Nagar', 'Near Somalwada IT corridor', 8500, 8500, 'unisex', 2, 20, 6, ['WiFi', 'AC', 'Laundry', 'Parking', 'Power backup', 'CCTV'], 3, 'Co-living for young professionals with separate floors, high-speed WiFi and a common work lounge.', 'Quiet hours after 11 pm.'],
  ['Gittikhadan Student Stay', 'Gittikhadan', 'Katol Road, near Ramdeobaba University', 4800, 4000, 'boys', 3, 30, 11, ['WiFi', 'Meals', 'Power backup', 'Geyser'], 1, 'Budget-friendly PG for university students. Short walk or auto ride to campus.', 'Gate closes at 11 pm.'],
  ['Ladies Comfort Home', 'Gittikhadan', 'Katol Road, near Ramdeobaba University', 6000, 6000, 'girls', 2, 14, 3, ['WiFi', 'Meals', 'CCTV', 'Laundry', 'Geyser'], 0, 'Clean, well-lit PG for girl students with CCTV at entry and a caring owner family living on the premises.', 'No male visitors beyond the lobby.'],
  ['Raisoni Heights PG', 'Hingna Road', 'Near G.H. Raisoni College', 4500, 4000, 'boys', 3, 28, 9, ['WiFi', 'Meals', 'Parking', 'Power backup'], 2, 'Spacious rooms with cupboards and study tables. College bus stop nearby.', 'Rent due by the 5th of every month.'],
  ['Hingna Girls Residency', 'Hingna Road', 'Near G.H. Raisoni College', 5600, 5000, 'girls', 2, 18, 1, ['WiFi', 'Meals', 'CCTV', 'Housekeeping', 'Geyser'], 3, 'Safe residence for girl students with biometric entry and home-cooked food.', 'Gate closes at 9:30 pm.'],
  ['Medico Stay', 'Medical Square', 'Near Government Medical College', 7200, 7000, 'boys', 2, 14, 4, ['WiFi', 'AC', 'Meals', 'Laundry'], 1, 'Preferred by medical students and interns. Flexible mess timings for hospital duty hours.', 'Late-night entry allowed for duty hours with prior notice.'],
  ['Ajni Ladies Hostel', 'Ajni', 'Near Ajni Railway Station', 5800, 5000, 'girls', 3, 21, 7, ['WiFi', 'Meals', 'Laundry', 'CCTV', 'Geyser'], 2, 'Affordable and safe stay for girl students and working women, close to the station and bus routes.', 'No guests after 7 pm.'],
  ['Pratap Nagar Premium PG', 'Pratap Nagar', 'Near Pratap Nagar Chowk', 11000, 11000, 'unisex', 1, 8, 3, ['WiFi', 'AC', 'Meals', 'Attached bathroom', 'Housekeeping', 'Parking'], 0, 'Fully furnished private rooms with attached bathrooms, daily housekeeping and covered parking.', 'Minimum stay of 3 months.'],
  ['Trimurti Nest', 'Trimurti Nagar', 'Near Trimurti Nagar Square', 6800, 6000, 'boys', 2, 12, 5, ['WiFi', 'Meals', 'Laundry', 'Geyser', 'CCTV'], 3, 'Well-connected location with cafes and markets nearby. Twin-sharing rooms with lockers.', 'No parties or loud music.'],
  ['MIHAN Professionals Stay', 'MIHAN', 'Near MIHAN SEZ and AIIMS Nagpur', 9500, 9500, 'unisex', 1, 12, 4, ['WiFi', 'AC', 'Meals', 'Power backup', 'Parking', 'CCTV'], 2, 'Convenient for people working at MIHAN SEZ and AIIMS. Private rooms with a 24-hour power backup.', 'Monthly rent in advance.'],
  ['Wardha Road Budget PG', 'Wardha Road', 'Near Khamla Chowk', 3800, 3000, 'boys', 4, 40, 15, ['WiFi', 'Geyser'], 1, 'Simple, affordable stay with a big common room and easy bus access along Wardha Road.', 'Notice period of 10 days.'],
  ['Laxmi Nagar Girls PG', 'Laxmi Nagar', 'Near Laxmi Nagar Square', 6200, 6000, 'girls', 2, 16, 6, ['WiFi', 'Meals', 'Laundry', 'CCTV', 'Housekeeping'], 0, 'Peaceful residential area with tiffin and mess options and a friendly environment.', 'Gate closes at 10 pm.'],
  ['Sadar Heritage Stay', 'Sadar', 'Near Sadar Bazaar', 7000, 7000, 'unisex', 2, 14, 2, ['WiFi', 'Meals', 'Geyser', 'Laundry'], 3, 'Old-city charm with modern rooms, close to markets, restaurants and the railway station.', 'Separate floors for men and women.'],
  ['Ashoka Stay', 'Manish Nagar', 'Near Manish Nagar Chowk', 4500, 4000, 'boys', 4, 20, 0, ['WiFi', 'Geyser'], 1, 'Simple and affordable. Currently full, so join the waiting list by contacting the owner.', 'No smoking.']
];

// [pgIndex, tenantIndex, rating, comment]
const reviews = [
  [0, 0, 5, 'Food is genuinely like home and the warden is very supportive. Felt safe from day one.'],
  [0, 2, 4, 'Clean rooms and good location. Water heating in the morning can take a while.'],
  [1, 1, 4, 'Great for VNIT students. Mess food is decent and the study room is a lifesaver in exam weeks.'],
  [1, 1, 4, ''],
  [2, 0, 5, 'Worth every rupee. Spotless rooms, strong WiFi and very close to the station.'],
  [2, 1, 4, 'Quiet and professional. A bit pricey but the facilities justify it.'],
  [3, 0, 4, 'Good WiFi and a great work lounge. Parking space can get tight on weekends.'],
  [3, 1, 5, 'Best co-living I have tried in Nagpur. Management responds quickly to issues.'],
  [4, 1, 3, 'Okay for the price. Rooms are basic and the food is average, but it is close to campus.'],
  [5, 2, 5, 'The owner family treats us like their own. CCTV and strict timings give my parents peace of mind.'],
  [5, 0, 4, 'Nice food and clean washrooms. Rooms are a little small.'],
  [6, 1, 4, 'Spacious rooms and a good mess. Power backup works well.'],
  [7, 2, 4, 'Biometric entry makes it very safe. Rent is reasonable for the facilities.'],
  [8, 1, 5, 'Mess timings suit hospital duty. AC rooms are a big plus in summer.'],
  [9, 0, 3, 'Safe and close to the station, but the rooms get crowded with 3 people.'],
  [10, 2, 5, 'Premium in every way. Housekeeping is excellent and the rooms look like the photos.'],
  [11, 1, 4, 'Good location and friendly roommates. Laundry service is reliable.'],
  [12, 0, 4, 'Convenient for MIHAN offices. Power never goes out and the food is good.'],
  [13, 1, 3, 'Very cheap and works for short stays. Do not expect much privacy in 4-sharing.'],
  [14, 2, 4, 'Peaceful neighbourhood and tasty tiffin. Would recommend for girl students.'],
  [15, 0, 4, 'Great old-city location. Rooms are modern, though the lane is a little noisy at night.']
];


// ---------- Generated listings (deterministic, so every run produces the same data) ----------
owners.push(
  ['Prakash Meshram', 'owner5@stayfinder.test', '9000000005'], ['Vandana Raut', 'owner6@stayfinder.test', '9000000006'],
  ['Sanjay Wankhede', 'owner7@stayfinder.test', '9000000007'], ['Kavita Dhote', 'owner8@stayfinder.test', '9000000008'],
  ['Nitin Gawai', 'owner9@stayfinder.test', '9000000009'], ['Shobha Ingle', 'owner10@stayfinder.test', '9000000010'],
  ['Dinesh Pande', 'owner11@stayfinder.test', '9000000011'], ['Rekha Thakre', 'owner12@stayfinder.test', '9000000012']);
tenants.push(
  ['Aarav Mishra', 'tenant4@stayfinder.test'], ['Kavya Raut', 'tenant5@stayfinder.test'], ['Nikhil Gawande', 'tenant6@stayfinder.test'],
  ['Pooja Meshram', 'tenant7@stayfinder.test'], ['Harsh Bhagat', 'tenant8@stayfinder.test'], ['Ritu Sahu', 'tenant9@stayfinder.test'],
  ['Karan Ingle', 'tenant10@stayfinder.test']);
const tenantGender = ['F', 'M', 'F', 'M', 'F', 'M', 'F', 'M', 'F', 'M'];

let _s = 20261016;
const rnd = () => { _s |= 0; _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// [area, address, what it is near, rent multiplier]
const AREAS = [
  ['Dharampeth', 'Near Dharampeth Science College', 'Dharampeth Science College', 1.15], ['Bajaj Nagar', 'Near VNIT main gate', 'VNIT', 1.05],
  ['Gittikhadan', 'Katol Road, near Ramdeobaba University', 'Ramdeobaba University', 0.95], ['Hingna Road', 'Near G.H. Raisoni College', 'G.H. Raisoni College', 0.85],
  ['Medical Square', 'Near Government Medical College', 'Government Medical College', 1.0], ['Sitabuldi', 'Near Nagpur Railway Station', 'Nagpur Railway Station', 1.15],
  ['Manish Nagar', 'Near Manish Nagar Chowk', 'Manish Nagar Chowk', 1.0], ['Somalwada', 'Wardha Road, near the IT corridor', 'the Wardha Road IT corridor', 1.05],
  ['MIHAN', 'Near MIHAN SEZ and AIIMS Nagpur', 'MIHAN SEZ and AIIMS Nagpur', 1.1], ['Pratap Nagar', 'Near Pratap Nagar Chowk', 'Pratap Nagar Chowk', 1.2],
  ['Trimurti Nagar', 'Near Trimurti Nagar Square', 'Trimurti Nagar Square', 1.0], ['Ajni', 'Near Ajni Railway Station', 'Ajni Railway Station', 0.95],
  ['Sadar', 'Near Sadar Bazaar', 'Sadar Bazaar', 1.0], ['Laxmi Nagar', 'Near Laxmi Nagar Square', 'Laxmi Nagar Square', 1.1],
  ['Wardha Road', 'Near Khamla Chowk', 'Khamla Chowk', 0.9], ['Ramdaspeth', 'Near Ramdaspeth Square', 'Ramdaspeth Square', 1.2],
  ['Sakkardara', 'Near Sakkardara Chowk', 'Sakkardara Chowk', 0.95], ['Narendra Nagar', 'Near Narendra Nagar Square', 'Narendra Nagar Square', 1.0],
  ['Nandanvan', 'Near Nandanvan Main Road', 'Nandanvan Main Road', 0.9], ['Mankapur', 'Near Mankapur Chowk', 'Mankapur Chowk', 0.95],
  ['Besa', 'Near Besa Square', 'Besa Square', 0.8], ['Khamla', 'Near Khamla Chowk', 'Khamla Chowk', 1.05],
  ['Civil Lines', 'Near Civil Lines Chowk', 'Civil Lines Chowk', 1.2], ['Shankar Nagar', 'Near Shankar Nagar Square', 'Shankar Nagar Square', 1.1],
  ['Dhantoli', 'Near Dhantoli Chowk', 'Dhantoli Chowk', 1.1], ['Kamptee Road', 'Near Kamptee Road bus stop', 'the Kamptee Road bus stop', 0.85],
  ['Koradi Road', 'Near Koradi Naka', 'Koradi Naka', 0.85], ['Amravati Road', 'Near Amravati Road bus stop', 'the Amravati Road bus stop', 0.9]
];
const NAMES = {
  boys: [['Vidya', 'Sai', 'Gajanan', 'Shivam', 'Om Sai', 'Mauli', 'Krishna', 'Raghav', 'Sanskar', 'Aadarsh', 'Yash', 'Tirupati', 'Balaji', 'Samarth', 'Arya', 'Ganesh', 'Swami', 'Anand', 'Siddhi', 'Prime'], ['Boys PG', 'Boys Hostel', 'Student Stay', 'Residency', 'PG House', 'Nest']],
  girls: [['Shree Sai', 'Sakhi', 'Gayatri', 'Ananya', 'Saraswati', 'Lakshmi', 'Tulsi', 'Mitali', 'Kasturi', 'Aarohi', 'Riddhi', 'Sanvi', 'Janhavi', 'Pratibha', 'Vaishnavi', 'Surbhi', 'Shivanya', 'Anushka', 'Rutuja', 'Isha'], ['Girls PG', 'Ladies Hostel', 'Girls Residency', "Women's PG", 'Comfort Home', 'Nest']],
  unisex: [['Orange City', 'Urban', 'Skyline', 'Metro', 'Zenith', 'Cityscape', 'Nagpur', 'Elite', 'Horizon', 'Greenfield', 'Brightway', 'Apex', 'Lotus', 'Maple', 'Harmony'], ['Residency', 'Co-Living', 'Stay', 'Suites', 'Homes', 'PG']]
};
const FEATS = ['Study tables and cupboards in every room.', 'Mess with a weekly menu.', 'Quiet lanes and easy bus access.', 'Biometric entry and CCTV at the gate.', 'Terrace for drying clothes and evening hangouts.', 'RO drinking water and 24-hour water supply.', 'Close to cafes, markets and coaching centres.', 'Friendly owner who lives in the same building.', 'Spacious, well-ventilated rooms.', 'Weekly cleaning of rooms and washrooms.'];
const RULES = ['Gate closes at 10 pm.', 'No smoking or alcohol.', 'Notice period of 15 days.', 'Rent due by the 5th of each month.', 'Guests allowed only in the lobby.', 'Quiet hours after 10:30 pm.', 'ID proof and one month deposit required.', 'No cooking in rooms.'];
const COMMENTS = {
  5: ['Excellent stay. Clean rooms, good food and a very responsive owner.', 'Felt at home from day one. Highly recommended.', 'Great value for money. WiFi and water supply are reliable.', 'Safe, well-managed and the location is perfect for me.'],
  4: ['Good overall. Rooms are clean and the food is decent.', 'Nice place with friendly people. Could improve the WiFi speed a little.', 'Comfortable stay and fair rent for the area.', 'Well maintained. Hot water in the morning is sometimes slow.'],
  3: ['Average. Fine for the price but do not expect too much.', 'Rooms are okay but a bit crowded. Food is average.', 'Decent for a short stay. Maintenance could be quicker.'],
  2: ['Rooms are small and the food needs improvement. Okay only for a tight budget.', 'Not great. Frequent power cuts and slow responses to complaints.']
};

const used = new Set(pgs.map((p) => p[0]));
const TARGET = 110;
while (pgs.length < TARGET) {
  const [area, address, near, mult] = pick(AREAS);
  const gender = pick(['boys', 'boys', 'girls', 'girls', 'unisex']);
  const sharing = gender === 'unisex' ? pick([1, 1, 2, 2]) : pick([1, 2, 2, 3, 3, 4]);
  const [pre, suf] = NAMES[gender];
  const name = `${pick(pre)} ${pick(suf)}`;
  if (used.has(name)) continue;
  used.add(name);

  const am = new Set(['WiFi', 'Geyser']);
  shuffle(['Meals', 'Laundry', 'CCTV', 'Power backup', 'Parking', 'Housekeeping']).slice(0, 1 + Math.floor(rnd() * 4)).forEach((a) => am.add(a));
  if (sharing === 1 && rnd() < 0.7) am.add('Attached bathroom');
  if ((sharing <= 2 && rnd() < 0.35) || (sharing === 1 && rnd() < 0.5)) am.add('AC');
  if (gender === 'girls') am.add('CCTV');
  const amenities = [...am];

  const base = { 1: 9000, 2: 6600, 3: 5200, 4: 4000 }[sharing];
  let rent = base * mult * (0.92 + rnd() * 0.2) + (am.has('AC') ? 1400 : 0);
  rent = Math.min(14500, Math.max(3200, Math.round(rent / 100) * 100));
  const deposit = Math.round((rent * (rnd() < 0.5 ? 1 : 0.6)) / 500) * 500;
  const total = Math.min(40, sharing * pick([4, 5, 6, 8, 10, 12]));
  const avail = rnd() < 0.08 ? 0 : Math.min(total, 1 + Math.floor(rnd() * total * 0.5));
  const who = gender === 'boys' ? 'students and young men' : gender === 'girls' ? 'girl students and working women' : 'working professionals';
  const f1 = pick(FEATS), f2 = pick(FEATS.filter((x) => x !== f1));
  const description = `${sharing === 1 ? 'Private-room' : sharing + '-sharing'} stay for ${who}, close to ${near}. ${f1} ${f2}`;
  const r1 = pick(RULES), r2 = pick(RULES.filter((x) => x !== r1));
  const rules = [r1, r2, gender === 'unisex' && sharing > 1 ? 'Separate floors for men and women.' : ''].filter(Boolean).join(' ');
  pgs.push([name, area, address, rent, deposit, gender, sharing, total, avail, amenities, Math.floor(rnd() * owners.length), description, rules]);

  // Sample reviews from tenants of a suitable gender
  const eligible = shuffle(tenantGender.map((g, i) => [g, i]).filter(([g]) => gender === 'unisex' || (gender === 'girls' ? g === 'F' : g === 'M')).map(([, i]) => i));
  const n = pick([0, 1, 1, 2, 2, 3, 4]);
  eligible.slice(0, n).forEach((t) => {
    const rating = pick([5, 5, 5, 4, 4, 4, 4, 3, 3, 2]);
    reviews.push([pgs.length - 1, t, rating, pick(COMMENTS[rating])]);
  });
}

// ---------- More cities: Pune, Mumbai and Bangalore ----------
// Generated AFTER the Nagpur data, so the Nagpur listings stay exactly the same on every run.
const NAGPUR_COUNT = pgs.length, NAGPUR_OWNERS = owners.length, NAGPUR_TENANTS = tenants.length;
owners.push(
  ['Mangesh Kale', 'owner13@stayfinder.test', '9000000013'], ['Swati Deshpande', 'owner14@stayfinder.test', '9000000014'], ['Rohit Pawar', 'owner15@stayfinder.test', '9000000015'],
  ['Imran Shaikh', 'owner16@stayfinder.test', '9000000016'], ['Neha Mehta', 'owner17@stayfinder.test', '9000000017'], ['Vinod Naik', 'owner18@stayfinder.test', '9000000018'],
  ['Ramesh Gowda', 'owner19@stayfinder.test', '9000000019'], ['Lakshmi Iyer', 'owner20@stayfinder.test', '9000000020'], ['Suresh Reddy', 'owner21@stayfinder.test', '9000000021']);
tenants.push(
  ['Anjali Nair', 'tenant11@stayfinder.test'], ['Siddharth Rao', 'tenant12@stayfinder.test'], ['Meera Kulkarni', 'tenant13@stayfinder.test'],
  ['Aditya Shah', 'tenant14@stayfinder.test'], ['Divya Menon', 'tenant15@stayfinder.test'], ['Rahul Singh', 'tenant16@stayfinder.test']);
tenantGender.push('F', 'M', 'F', 'M', 'F', 'M');

// [area, address, near, rent multiplier]
const PUNE = [
  ['Kothrud', 'Near MIT World Peace University', 'MIT World Peace University', 1.3], ['Hinjewadi', 'Near Rajiv Gandhi Infotech Park', 'Rajiv Gandhi Infotech Park', 1.4],
  ['Kharadi', 'Near EON IT Park', 'EON IT Park', 1.45], ['Hadapsar', 'Near Magarpatta City', 'Magarpatta City', 1.3],
  ['Deccan Gymkhana', 'Near Fergusson College', 'Fergusson College', 1.5], ['Shivajinagar', 'Near Pune Railway Station', 'Pune Railway Station', 1.45],
  ['Viman Nagar', 'Near Viman Nagar Chowk', 'Viman Nagar Chowk', 1.5], ['Baner', 'Near Baner Road', 'Baner Road', 1.45],
  ['Wakad', 'Near Wakad Chowk', 'Wakad Chowk', 1.25], ['Aundh', 'Near Aundh Gaon', 'Aundh Gaon', 1.4],
  ['Karve Nagar', 'Near Karve Nagar Chowk', 'Karve Nagar Chowk', 1.25], ['Pimpri-Chinchwad', 'Near Pimpri Railway Station', 'Pimpri Railway Station', 1.15]];
const MUMBAI = [
  ['Powai', 'Near IIT Bombay', 'IIT Bombay', 2.0], ['Andheri East', 'Near SEEPZ', 'SEEPZ', 1.9], ['Vile Parle', 'Near NMIMS Vile Parle', 'NMIMS Vile Parle', 2.1],
  ['Matunga', 'Near ICT Matunga', 'ICT Matunga', 2.0], ['Dadar', 'Near Dadar Station', 'Dadar Station', 2.1], ['Goregaon', 'Near Film City Road', 'Film City Road', 1.8],
  ['Malad', 'Near Malad Station', 'Malad Station', 1.7], ['Borivali', 'Near Borivali Station', 'Borivali Station', 1.55], ['Kurla', 'Near Kurla Station', 'Kurla Station', 1.6],
  ['Ghatkopar', 'Near Ghatkopar Station', 'Ghatkopar Station', 1.7], ['Chembur', 'Near Chembur Station', 'Chembur Station', 1.75], ['Mulund', 'Near Mulund Station', 'Mulund Station', 1.55],
  ['Churchgate', 'Near Churchgate Station', 'Churchgate Station', 2.4], ['Vashi (Navi Mumbai)', 'Near Vashi Station', 'Vashi Station', 1.5]];
const BANGALORE = [
  ['Koramangala', 'Near Forum Mall', 'Forum Mall', 1.75], ['Indiranagar', 'Near 100 Feet Road', '100 Feet Road', 1.8], ['HSR Layout', 'Near HSR Layout Sector 1', 'HSR Layout Sector 1', 1.65],
  ['Whitefield', 'Near ITPL', 'ITPL', 1.55], ['Electronic City', 'Near Infosys Electronic City campus', 'Electronic City', 1.35], ['Marathahalli', 'Near Marathahalli Bridge', 'Marathahalli Bridge', 1.5],
  ['BTM Layout', 'Near BTM Layout 2nd Stage', 'BTM Layout 2nd Stage', 1.5], ['Jayanagar', 'Near Jayanagar 4th Block', 'Jayanagar 4th Block', 1.55], ['Bellandur', 'Near Outer Ring Road, Bellandur', 'Outer Ring Road', 1.7],
  ['Hebbal', 'Near Hebbal Flyover', 'Hebbal Flyover', 1.4], ['Malleshwaram', 'Near Malleshwaram 8th Cross', 'Malleshwaram 8th Cross', 1.5], ['JP Nagar', 'Near JP Nagar 6th Phase', 'JP Nagar 6th Phase', 1.45],
  ['Banashankari', 'Near Banashankari Temple', 'Banashankari Temple', 1.35], ['Rajajinagar', 'Near Rajajinagar Metro Station', 'Rajajinagar Metro Station', 1.4]];

const usedCity = new Set();
function genCity(city, areas, count, ownerPool, tenantPool) {
  let made = 0;
  while (made < count) {
    const [area, address, near, mult] = pick(areas);
    const gender = pick(['boys', 'boys', 'girls', 'girls', 'unisex']);
    const sharing = gender === 'unisex' ? pick([1, 1, 2, 2]) : pick([1, 2, 2, 3, 3, 4]);
    const [pre, suf] = NAMES[gender];
    const name = `${pick(pre)} ${pick(suf)}`;
    if (usedCity.has(city + '|' + name)) continue;
    usedCity.add(city + '|' + name);

    const am = new Set(['WiFi', 'Geyser']);
    shuffle(['Meals', 'Laundry', 'CCTV', 'Power backup', 'Parking', 'Housekeeping']).slice(0, 1 + Math.floor(rnd() * 4)).forEach((a) => am.add(a));
    if (sharing === 1 && rnd() < 0.7) am.add('Attached bathroom');
    if ((sharing <= 2 && rnd() < 0.35) || (sharing === 1 && rnd() < 0.5)) am.add('AC');
    if (gender === 'girls') am.add('CCTV');
    const amenities = [...am];

    const base = { 1: 9000, 2: 6600, 3: 5200, 4: 4000 }[sharing];
    let rent = base * mult * (0.92 + rnd() * 0.2) + (am.has('AC') ? 1400 * Math.min(mult, 1.6) : 0);
    rent = Math.min(26000, Math.max(4500, Math.round(rent / 100) * 100));
    const deposit = Math.round((rent * (rnd() < 0.5 ? 1 : 0.6)) / 500) * 500;
    const total = Math.min(40, sharing * pick([4, 5, 6, 8, 10, 12]));
    const avail = rnd() < 0.08 ? 0 : Math.min(total, 1 + Math.floor(rnd() * total * 0.5));
    const who = gender === 'boys' ? 'students and young men' : gender === 'girls' ? 'girl students and working women' : 'working professionals';
    const f1 = pick(FEATS), f2 = pick(FEATS.filter((x) => x !== f1));
    const description = `${sharing === 1 ? 'Private-room' : sharing + '-sharing'} stay for ${who}, close to ${near}. ${f1} ${f2}`;
    const r1 = pick(RULES), r2 = pick(RULES.filter((x) => x !== r1));
    const rules = [r1, r2, gender === 'unisex' && sharing > 1 ? 'Separate floors for men and women.' : ''].filter(Boolean).join(' ');
    pgs.push([name, area, address, rent, deposit, gender, sharing, total, avail, amenities, pick(ownerPool), description, rules, city]);

    const eligible = shuffle(tenantPool.filter((i) => gender === 'unisex' || (gender === 'girls' ? tenantGender[i] === 'F' : tenantGender[i] === 'M')));
    eligible.slice(0, pick([0, 1, 1, 2, 2, 3])).forEach((t) => {
      const rating = pick([5, 5, 5, 4, 4, 4, 4, 3, 3, 2]);
      reviews.push([pgs.length - 1, t, rating, pick(COMMENTS[rating])]);
    });
    made++;
  }
}
const newTenants = [10, 11, 12, 13, 14, 15];
genCity('Pune', PUNE, 40, [12, 13, 14], newTenants);
genCity('Mumbai', MUMBAI, 40, [15, 16, 17], newTenants);
genCity('Bangalore', BANGALORE, 40, [18, 19, 20], newTenants);

// Batch 2 (brings the total to 500): more owners and tenants, then 90 more PGs per city
owners.push(
  ['Pradeep Joshi', 'owner22@stayfinder.test', '9000000022'], ['Anita Bhosale', 'owner23@stayfinder.test', '9000000023'], ['Kiran Jadhav', 'owner24@stayfinder.test', '9000000024'],
  ['Farhan Khan', 'owner25@stayfinder.test', '9000000025'], ['Pooja Desai', 'owner26@stayfinder.test', '9000000026'], ['Sandeep Patil', 'owner27@stayfinder.test', '9000000027'],
  ['Venkatesh Rao', 'owner28@stayfinder.test', '9000000028'], ['Deepa Nair', 'owner29@stayfinder.test', '9000000029'], ['Manjunath Hegde', 'owner30@stayfinder.test', '9000000030']);
tenants.push(
  ['Tanvi Joshi', 'tenant17@stayfinder.test'], ['Omkar Patil', 'tenant18@stayfinder.test'], ['Nisha Verma', 'tenant19@stayfinder.test'],
  ['Arjun Iyer', 'tenant20@stayfinder.test'], ['Sakshi More', 'tenant21@stayfinder.test'], ['Yash Kamble', 'tenant22@stayfinder.test']);
tenantGender.push('F', 'M', 'F', 'M', 'F', 'M');
const allNewTenants = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
genCity('Pune', PUNE, 90, [12, 13, 14, 21, 22, 23], allNewTenants);
genCity('Mumbai', MUMBAI, 90, [15, 16, 17, 24, 25, 26], allNewTenants);
genCity('Bangalore', BANGALORE, 90, [18, 19, 20, 27, 28, 29], allNewTenants);

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stayfinder');

  const reset = process.argv.includes('--reset');
  const topUp = ['--top-up', '--add-more', '--add-cities'].some((f) => process.argv.includes(f));
  const hasSample = await User.exists({ email: /@stayfinder\.test$/ });

  if (!topUp && hasSample && !reset) {
    console.log('Sample data already exists, so nothing was changed (your edits and photos are safe).');
    console.log('To ADD the missing sample PGs (up to 500) without touching anything:  node seed.js --top-up');
    console.log('To wipe everything and recreate it (erases edits and photo links):    node seed.js --reset');
    return process.exit(0);
  }
  if (topUp && !hasSample) { console.log('No sample data yet. Run "node seed.js" first.'); return process.exit(0); }

  if (!topUp) {
    // Remove previous sample data
    const old = await User.find({ email: /@stayfinder\.test$/ });
    const oldIds = old.map((u) => u._id);
    const oldPgs = (await PG.find({ owner: { $in: oldIds } })).map((p) => p._id);
    await Promise.all([
      Review.deleteMany({ $or: [{ pg: { $in: oldPgs } }, { user: { $in: oldIds } }] }),
      Booking.deleteMany({ $or: [{ pg: { $in: oldPgs } }, { tenant: { $in: oldIds } }] }),
      PG.deleteMany({ _id: { $in: oldPgs } })
    ]);
    await User.deleteMany({ _id: { $in: oldIds } });
  }

  // Which sample PGs are missing? (matched by name + city, so running this twice never duplicates anything)
  const have = new Set((await PG.find({}, 'name city')).map((p) => p.name + '|' + p.city));
  const todo = pgs.map((row, i) => [row, i]).filter(([row]) => !have.has(row[0] + '|' + (row[13] || 'Nagpur')));
  if (!todo.length) { console.log(`All ${pgs.length} sample PGs already exist. Nothing changed.`); return process.exit(0); }

  // Create any missing sample users, then look every one up by e-mail
  const emails = [...owners.map((o) => o[1]), ...tenants.map((t) => t[1])];
  const haveUsers = new Set((await User.find({ email: { $in: emails } }, 'email')).map((u) => u.email));
  const ownerPw = await bcrypt.hash('owner123', 10), tenantPw = await bcrypt.hash('tenant123', 10);
  await User.insertMany([
    ...owners.filter((o) => !haveUsers.has(o[1])).map(([name, email, phone]) => ({ name, email, phone, role: 'owner', password: ownerPw })),
    ...tenants.filter((t) => !haveUsers.has(t[1])).map(([name, email]) => ({ name, email, role: 'tenant', password: tenantPw }))
  ]);
  if (!(await User.exists({ email: 'admin@stayfinder.test' }))) await User.create({ name: 'StayFinder Admin', email: 'admin@stayfinder.test', role: 'admin', password: await bcrypt.hash('admin123', 10) });
  const byEmail = new Map((await User.find({ email: { $in: emails } })).map((u) => [u.email, u]));

  const pgDocs = await PG.insertMany(todo.map(([row]) => {
    const [name, area, address, rent, deposit, gender, sharing, totalBeds, availableBeds, amenities, o, description, rules, city = 'Nagpur'] = row;
    return { name, area, address, rent, deposit, gender, sharing, totalBeds, availableBeds, amenities, description, rules, city, owner: byEmail.get(owners[o][1])._id, contactPhone: owners[o][2] };
  }));
  const docOf = new Map(todo.map(([, i], k) => [i, pgDocs[k]]));

  const seen = new Set();
  const revDocs = reviews.filter(([p, t]) => docOf.has(p) && !seen.has(p + '-' + t) && seen.add(p + '-' + t))
    .map(([p, t, rating, comment]) => ({ pg: docOf.get(p)._id, user: byEmail.get(tenants[t][1])._id, rating, comment }));
  await Review.insertMany(revDocs);

  for (const pg of pgDocs) {
    const rs = revDocs.filter((r) => String(r.pg) === String(pg._id));
    if (rs.length) await PG.findByIdAndUpdate(pg._id, { reviewCount: rs.length, avgRating: Math.round((rs.reduce((a, r) => a + r.rating, 0) / rs.length) * 10) / 10 });
  }

  console.log(`Added ${pgDocs.length} PGs with ${revDocs.length} reviews. Total PGs in the database: ${await PG.countDocuments()}.`);
  console.log('Admin login:  admin@stayfinder.test / admin123   (can edit every PG)');
  console.log('Owner login:  owner@stayfinder.test / owner123   (also owner2 ... owner30)');
  console.log('Tenant login: tenant1@stayfinder.test / tenant123 (also tenant2 ... tenant22)');
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });