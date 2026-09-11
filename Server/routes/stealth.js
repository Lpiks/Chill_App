const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

// Add stealth and adblocker
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const getVidLinkUrl = (tmdbId, type, season, episode) => {
  const isTv = type === 'tv' || type === 'series';
  return `https://vidlink.pro/${isTv ? 'tv' : 'movie'}/${tmdbId}${isTv ? `/${season}/${episode}` : ''}`;
};

const getVidSrcUrl = (tmdbId, type, season, episode) => {
  const isTv = type === 'tv' || type === 'series';
  return `https://vidsrc.to/embed/${isTv ? 'tv' : 'movie'}/${tmdbId}${isTv ? `/${season}/${episode}` : ''}`;
};

// @route   GET /api/stealth
router.get('/', async (req, res) => {
  const { tmdbId, type, season, episode, provider } = req.query;

  if (!tmdbId || !type) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  let targetUrl = getVidLinkUrl(tmdbId, type, season, episode);
  if (provider === 'vidsrc') {
    targetUrl = getVidSrcUrl(tmdbId, type, season, episode);
  }

  console.log(`[Stealth Extractor] Starting Puppeteer for: ${targetUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();

    // Set explicit viewport so mouse clicks work
    await page.setViewport({ width: 1280, height: 720 });

    // Set a solid User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let streamUrl = null;
    let extractedSubtitles = [];

    // Helper to deduplicate subtitles by lang
    const addSubtitle = (url, label, lang) => {
      if (!url || !lang) return;
      if (!extractedSubtitles.find(s => s.lang === lang)) {
        extractedSubtitles.push({ url, label: label || lang, lang });
      }
    };

    // Intercept network requests to catch the .m3u8
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();

      // Log fetch/xhr to see what Vidlink is actually requesting
      if (resourceType === 'fetch' || resourceType === 'xhr') {
        if (!url.includes('google') && !url.includes('analytics') && !url.includes('ad')) {
          console.log(`[Network] ${resourceType}: ${url.substring(0, 100)}...`);
        }
      }

      // We found the master playlist!
      if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('.mpd') || url.includes('/playlist.m3u8') || url.includes('master.m3u8')) {
        // Skip blob URLs or obvious ad URLs
        if (!url.startsWith('blob:') && !url.includes('ad')) {
          streamUrl = url;
          console.log(`[Stealth Extractor] CAUGHT STREAM FROM REQUEST: ${url}`);
        }
      }

      // Optimize: block images, fonts, CSS so the page loads faster
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        // Allow media just in case, but block the rest
        if (resourceType !== 'media') {
          request.abort();
          return;
        }
      }

      request.continue();
    });

    // Intercept responses to catch hidden APIs and Subtitle JSONs
    page.on('response', async (response) => {
      const url = response.url();

      // Catch secret APIs for m3u8
      if (url.includes('vsembed.ru/vs_src.php')) {
        try {
          console.log(`[Stealth Extractor] Intercepted secret API: ${url}`);
          const text = await response.text();
          const match = text.match(/https?:\/\/[^\s"'<>]+\.(m3u8|mpd)/);
          if (match && !streamUrl) {
            streamUrl = match[0];
            console.log(`[Stealth Extractor] CAUGHT STREAM FROM API: ${streamUrl}`);
          }
        } catch (e) { }
      }

      // Catch subtitle JSON responses
      const resourceType = response.request().resourceType();
      if (resourceType === 'fetch' || resourceType === 'xhr') {
        try {
          const text = await response.text();
          if (text.includes('.vtt') || text.includes('.srt')) {
            const data = JSON.parse(text);

            const searchForTracks = (obj) => {
              if (!obj || typeof obj !== 'object') return;
              if (Array.isArray(obj)) {
                obj.forEach(searchForTracks);
              } else {
                if (obj.file && (obj.file.includes('.vtt') || obj.file.includes('.srt'))) {
                  addSubtitle(obj.file, obj.label || obj.language, obj.srclang || obj.language || (obj.label && obj.label.substring(0, 2).toLowerCase()));
                }
                if (obj.src && (obj.src.includes('.vtt') || obj.src.includes('.srt'))) {
                  addSubtitle(obj.src, obj.label || obj.language, obj.srclang || obj.language || (obj.label && obj.label.substring(0, 2).toLowerCase()));
                }
                Object.values(obj).forEach(searchForTracks);
              }
            };

            searchForTracks(data);
          } else if (text.includes('"tracks"') || text.includes('"subtitles"')) {
            console.log(`[Subtitle Debug] Found tracks keyword in API: ${url}`);
            console.log(`[Subtitle Debug] Payload: ${text.substring(0, 300)}`);
            // Blindly regex for anything looking like a vtt file
            const vttRegex = /https?:\/\/[^\s"'<>]+\.(vtt|srt)/gi;
            let vttMatch;
            while ((vttMatch = vttRegex.exec(text)) !== null) {
              addSubtitle(vttMatch[0], 'Auto ' + extractedSubtitles.length, 'auto' + extractedSubtitles.length);
            }
          }
        } catch (e) { }
      }
    });

    // Go to the page (catch timeout so we don't throw an error if the site keeps loading ads)
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      console.log(`[Stealth Extractor] Page load took too long, but continuing...`);
    }

    // Wait a little bit to see if it loads automatically
    await new Promise(r => setTimeout(r, 4000));

    // If we haven't found it yet, try clicking play buttons on the page and inside iframes
    if (!streamUrl) {
      console.log(`[Stealth Extractor] Attempting to click play buttons...`);

      const clickPlay = async (frame) => {
        try {
          await frame.evaluate(() => {
            const playBtns = document.querySelectorAll('*[class*="play"], *[id*="play"], .vjs-big-play-button, .jw-display-icon-display, .plyr__control--overlaid');
            playBtns.forEach(btn => btn.click());
          });
        } catch (e) {
          // Ignore frame evaluation errors
        }
      };

      // Click main frame and all child iframes
      await clickPlay(page.mainFrame());
      for (const frame of page.frames()) {
        await clickPlay(frame);
      }

      // Bruteforce: Click exactly in the dead center of the screen
      await page.mouse.click(1280 / 2, 720 / 2);
      await new Promise(r => setTimeout(r, 500));
      await page.mouse.click(1280 / 2, 720 / 2); // Double tap just in case

      // Wait 10 more seconds for the click to trigger the .m3u8 fetch
      for (let i = 0; i < 100; i++) {
        if (streamUrl) break;
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Give the video player time to initialize tracks!
    await new Promise(r => setTimeout(r, 2000));

    // Try to extract subtitles from HTML DOM or Embedded scripts as a last resort
    try {
      const getTracksFromFrame = async (frame) => {
        try {
          return await frame.evaluate(() => {
            let tracks = [];

            // 1. Check DOM tracks
            document.querySelectorAll('track').forEach(t => {
              if (t.src) {
                tracks.push({
                  url: t.src,
                  label: t.label || t.srclang || 'Unknown',
                  lang: t.srclang || (t.label && t.label.substring(0, 2).toLowerCase()) || 'unk'
                });
              }
            });

            // 2. Check JWPlayer
            if (typeof window.jwplayer === 'function') {
              try {
                const jw = window.jwplayer();
                if (jw && typeof jw.getConfig === 'function') {
                  const config = jw.getConfig();
                  if (config && config.tracks) {
                    config.tracks.forEach(t => {
                      if (t.file && t.kind === 'captions') {
                        tracks.push({
                          url: t.file,
                          label: t.label || t.name || 'Unknown',
                          lang: t.srclang || t.language || (t.label && t.label.substring(0, 2).toLowerCase()) || 'unk'
                        });
                      }
                    });
                  }
                }
              } catch (e) { }
            }

            // 3. Search window object for anything resembling tracks or subtitles
            try {
              const searchObj = (obj, depth = 0) => {
                if (depth > 3 || !obj || typeof obj !== 'object') return;
                Object.values(obj).forEach(val => {
                  if (val && typeof val === 'object') {
                    if (Array.isArray(val)) {
                      val.forEach(v => {
                        if (v && v.file && typeof v.file === 'string' && (v.file.includes('.vtt') || v.file.includes('.srt'))) {
                          tracks.push({
                            url: v.file,
                            label: v.label || 'Unknown',
                            lang: v.srclang || (v.label && v.label.substring(0, 2).toLowerCase()) || 'unk'
                          });
                        }
                      });
                    }
                    searchObj(val, depth + 1);
                  }
                });
              };
              if (window.__NUXT__) searchObj(window.__NUXT__);
              if (window.config) searchObj(window.config);
            } catch (e) { }

            return tracks;
          });
        } catch (e) {
          return [];
        }
      };

      // Extract from main frame
      let allTracks = await getTracksFromFrame(page.mainFrame());

      // Extract from all child iframes
      for (const frame of page.frames()) {
        const frameTracks = await getTracksFromFrame(frame);
        allTracks = allTracks.concat(frameTracks);
      }

      allTracks.forEach(t => addSubtitle(t.url, t.label, t.lang));

      // 4. Raw HTML Regex backup
      const html = await page.content();
      const regex = /\{[^}]*?(file|src)["']?\s*:\s*["']([^"']+?\.(vtt|srt))[^}]*?label["']?\s*:\s*["']([^"']+)["']/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
        addSubtitle(match[2], match[4], match[4].substring(0, 2).toLowerCase());
      }
    } catch (e) { }

    if (streamUrl) {
      console.log(`[Stealth Extractor] Success! Found ${extractedSubtitles.length} subtitles.`);
      res.json({ success: true, streamUrl, subtitles: extractedSubtitles });
    } else {
      console.log(`[Stealth Extractor] Failed to find .m3u8 within timeout. Taking screenshot...`);
      await page.screenshot({ path: 'puppeteer-debug.png' });
      console.log(`[Stealth Extractor] Screenshot saved as puppeteer-debug.png in your server folder.`);
      res.status(404).json({ success: false, error: 'Stream not found' });
    }

  } catch (error) {
    console.error(`[Stealth Extractor] Error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

module.exports = router;
