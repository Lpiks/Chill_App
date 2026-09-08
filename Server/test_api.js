const http = require('http');

http.get('http://localhost:5000/api/stream?tmdbId=tt9813792&type=series&season=1&episode=1', {
  headers: {
    // Assuming auth is disabled or we just want to see the error.
    // Wait, auth is required.
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
  });
}).on('error', err => {
  console.log('Error:', err.message);
});
