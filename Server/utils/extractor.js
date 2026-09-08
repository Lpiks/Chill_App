const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function extractStream(tmdbId, type, season, episode) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    // Sources to try in order
    const sources = [
      {
        name: 'VidLink',
        url: type === 'movie' 
          ? `https://vidlink.pro/movie/${tmdbId}`
          : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
      },
      {
        name: 'VidSrc.to',
        url: type === 'movie' 
          ? `https://vidsrc.to/embed/movie/${tmdbId}`
          : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      },
      {
        name: 'MultiEmbed',
        url: type === 'movie'
          ? `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`
          : `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
      }
    ];

    for (const source of sources) {
      console.log(`[Extractor] Trying ${source.name}: ${source.url}`);
      let streamUrl = null;

      // Intercept m3u8
      const intercept = (request) => {
        const url = request.url();
        if ((url.includes('.m3u8') || url.includes('.mp4')) && !url.includes('thumbnails') && !url.includes('ads')) {
          streamUrl = url;
        }
      };

      page.on('request', intercept);

      try {
        await page.goto(source.url, { waitUntil: 'networkidle0', timeout: 20000 });
        
        // Wait up to 10 seconds for the stream to appear
        let attempts = 0;
        while (!streamUrl && attempts < 10) {
          // If VidSrc.to, try to click the center of the page to trigger playback
          if (source.name.includes('VidSrc') && attempts === 2) {
             await page.mouse.click(SCREEN_WIDTH / 2 || 400, SCREEN_HEIGHT / 2 || 300);
          }
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }

        if (streamUrl) {
          console.log(`[Extractor] Found stream on ${source.name}: ${streamUrl}`);
          const headers = {
            'Referer': source.name === 'VidLink' ? 'https://vidlink.pro/' : 
                       source.name === 'VidSrc.to' ? 'https://vidsrc.to/' : 
                       'https://multiembed.mov/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
          };
          return { streamUrl, quality: 'Auto', provider: source.name, headers };
        }
      } catch (err) {
        console.log(`[Extractor] ${source.name} failed or timed out`);
      } finally {
        page.off('request', intercept);
      }
    }

    return null;

  } catch (error) {
    console.error('[Extractor] Error:', error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { extractStream };
