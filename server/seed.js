// Usage:  npm run seed          -> creates (or promotes) the admin account
//         npm run seed:demo     -> also creates a few demo classmates
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const withDemo = process.argv.includes('--demo');

async function ensureUser({ name, email, password, role }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (existing.role !== role) {
      existing.role = role;
      await existing.save();
    }
    console.log(`= ${email} already exists (role: ${role})`);
    return;
  }
  await User.create({ name, email, password, role });
  console.log(`+ created ${email} (role: ${role})`);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatbuddy');

  await ensureUser({
    name: 'Admin',
    email: process.env.ADMIN_EMAIL || 'admin@chatbuddy.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'admin',
  });

  if (withDemo) {
    for (const name of ['Aarav Sharma', 'Diya Verma', 'Kabir Singh', 'Meera Nair']) {
      await ensureUser({ name, email: `${name.split(' ')[0].toLowerCase()}@chatbuddy.com`, password: 'Pass@123', role: 'user' });
    }
    console.log('Demo users share the password: Pass@123');
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
