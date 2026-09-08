const express = require('express');
const router = express.Router();
const OS = require('opensubtitles-api');
const OpenSubtitles = new OS({
    useragent: 'VLCMAC', // Using a whitelisted user-agent to bypass 401 blocks
    ssl: true
});
const axios = require('axios');
const AdmZip = require('adm-zip');
const zlib = require('zlib');

// Main Search API
router.get('/', async (req, res) => {
  const { tmdbId, type, season, episode } = req.query;

  try {
    let searchParams = { tmdbid: tmdbId };
    if (type === 'tv' || type === 'series') {
      searchParams.season = season;
      searchParams.episode = episode;
    }

    const subtitles = await OpenSubtitles.search(searchParams);
    const formattedSubtitles = [];

    const serverHost = req.protocol + '://' + req.get('host');

    Object.keys(subtitles).forEach(lang => {
      const sub = subtitles[lang];
      // We wrap it in an array so we can map multiple if the API supports it later
      const options = Array.isArray(sub) ? sub : [sub];
      
      options.forEach((s, idx) => {
        formattedSubtitles.push({
          lang,
          label: `${s.langName || lang.toUpperCase()}${options.length > 1 ? ` Option ${idx + 1}` : ''}`,
          // Route the download through our proxy!
          url: `${serverHost}/api/subtitles/download?url=${encodeURIComponent(s.url)}`,
          originalUrl: s.url,
          score: s.score || 0
        });
      });
    });

    res.json({ subtitles: formattedSubtitles });
  } catch (err) {
    console.error('[Subtitles API] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Download and Unzip Proxy
router.get('/download', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    
    let rawText = '';

    // Check Magic Bytes for compression format
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
      // GZ compressed (OpenSubtitles default)
      rawText = zlib.gunzipSync(buffer).toString('utf-8');
    } else if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      // ZIP compressed
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      const srtEntry = zipEntries.find(e => e.entryName.endsWith('.srt') || e.entryName.endsWith('.vtt'));
      if (srtEntry) {
        rawText = srtEntry.getData().toString('utf-8');
      }
    } else {
      // Plain text fallback
      rawText = buffer.toString('utf-8');
    }

    if (!rawText) throw new Error('Could not extract subtitle text from archive');

    // Send as plain text (our VideoPlayer parser will handle it)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(rawText);
  } catch (err) {
    console.error('[Subtitles Proxy] Download Error:', err.message);
    res.status(500).send('Error downloading subtitle');
  }
});

module.exports = router;
