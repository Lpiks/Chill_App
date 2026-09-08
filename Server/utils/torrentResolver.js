const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const REAL_DEBRID_API_KEY = process.env.REAL_DEBRID_API_KEY;

async function resolveTorrentio(imdbId, type, season, episode) {
  try {
    const identifier = type === 'movie' ? imdbId : `${imdbId}:${season}:${episode}`;
    // Fetching with french language filter
    const url = `https://torrentio.strem.fun/providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrent9,nyaasi,tokyotosho,yame|language=french/stream/${type}/${identifier}.json`;
    
    console.log(`[Torrentio] Searching: ${url}`);
    const res = await fetch(url);
    const data = await res.json();

    if (!data.streams || data.streams.length === 0) return [];

    const resolvedStreams = [];

    for (const stream of data.streams.slice(0, 5)) { // Process top 5 results
      const quality = detectQuality(stream.title || stream.name || '');
      
      if (stream.url) {
        resolvedStreams.push({
          streamUrl: stream.url,
          quality,
          provider: 'Torrentio'
        });
      } else if (stream.infoHash && REAL_DEBRID_API_KEY) {
        const rdStream = await unrestrictWithRD(stream.infoHash);
        if (rdStream) {
          resolvedStreams.push({
            ...rdStream,
            quality
          });
        }
      }
    }

    return resolvedStreams;
  } catch (error) {
    console.error('[Torrentio] Error:', error);
    return [];
  }
}

function detectQuality(title) {
  if (title.includes('2160p') || title.includes('4K')) return '4K';
  if (title.includes('1080p')) return '1080p';
  if (title.includes('720p')) return '720p';
  return '480p';
}

async function unrestrictWithRD(infoHash) {
  try {
    // 1. Add Magnet
    const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REAL_DEBRID_API_KEY}` },
      body: new URLSearchParams({ magnet: `magnet:?xt=urn:btih:${infoHash}` })
    });
    const addData = await addRes.json();
    if (!addData.id) return null;

    // 2. Select Files (Fast-track)
    await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${addData.id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REAL_DEBRID_API_KEY}` },
      body: new URLSearchParams({ files: 'all' })
    });

    // 3. Get Info & Unrestrict
    const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${addData.id}`, {
      headers: { 'Authorization': `Bearer ${REAL_DEBRID_API_KEY}` }
    });
    const infoData = await infoRes.json();

    if (!infoData.links || infoData.links.length === 0) return null;

    const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REAL_DEBRID_API_KEY}` },
      body: new URLSearchParams({ link: infoData.links[0] })
    });
    const unrestrictData = await unrestrictRes.json();

    return {
      streamUrl: unrestrictData.download,
      provider: 'Real-Debrid'
    };
  } catch (error) {
    return null;
  }
}

module.exports = { resolveTorrentio };
