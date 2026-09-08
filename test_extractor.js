const { extractStream } = require('./Server/utils/extractor');

async function run() {
  console.log('Testing extraction...');
  // Testing with TMDB ID 603 (The Matrix)
  const result = await extractStream(603, 'movie', null, null);
  console.log('Result:', result);
  process.exit(0);
}

run();
