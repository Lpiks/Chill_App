const mongoose = require('mongoose');
const StreamCache = require('./models/StreamCache');
require('dotenv').config({ path: './.env' });

async function checkCache() {
  await mongoose.connect(process.env.MONGODB_URI);
  const cache = await StreamCache.find().sort({ expiresAt: -1 }).limit(5);
  console.log('Recent cached streams:');
  cache.forEach(c => {
    console.log(`- Key: ${c.cacheKey}`);
    console.log(`  Provider: ${c.provider}`);
    console.log(`  URL: ${c.streamUrl}`);
    console.log(`  Headers:`, c.headers);
  });
  process.exit(0);
}

checkCache();
