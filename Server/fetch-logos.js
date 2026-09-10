const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Ensure we grab the TMDB API Key

const TMDB_API_KEY = process.env.TMDB_API_KEY;

const networks = [
  { id: 49, name: 'HBO' },
  { id: 2552, name: 'Apple TV+' },
  { id: 2739, name: 'Disney+' },
  { id: 1024, name: 'Amazon Prime' }
];

async function fetchLogos() {
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY is missing from .env');
    return;
  }

  for (const network of networks) {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/network/${network.id}?api_key=${TMDB_API_KEY}`);
      const data = await response.json();
      console.log(`✅ ${network.name}: https://image.tmdb.org/t/p/w500${data.logo_path}`);
    } catch (error) {
      console.error(`❌ Error fetching ${network.name}:`, error.message);
    }
  }
}

fetchLogos();
