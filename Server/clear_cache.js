const mongoose = require('mongoose');
const StreamCache = require('./models/StreamCache');
require('dotenv').config({ path: './.env' });

async function clearCache() {
  await mongoose.connect(process.env.MONGODB_URI);
  await StreamCache.deleteMany({});
  console.log('Stream cache cleared.');
  process.exit(0);
}

clearCache();
