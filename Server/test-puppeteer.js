const puppeteer = require('puppeteer');

async function test() {
  console.log('Starting Puppeteer test...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser launched!');
    const page = await browser.newPage();
    console.log('Page created!');
    const testUrl = 'https://multiembed.mov/directstream.php?video_id=272&tmdb=1';
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    console.log('Navigated to MultiEmbed!');
    
    // Wait for m3u8
    let streamUrl = null;
    page.on('request', (request) => {
      if (request.url().includes('.m3u8')) {
        streamUrl = request.url();
        console.log('Found m3u8:', streamUrl);
      }
    });

    await new Promise(r => setTimeout(r, 10000));
    console.log('Test finished. Stream found:', !!streamUrl);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    if (browser) await browser.close();
  }
}

test();
