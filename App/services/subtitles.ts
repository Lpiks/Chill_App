import axios from 'axios';

const STREMIO_ADDONS = [
  'https://opensubtitles-v3.strem.io', // Primary (V3)
  'https://opensubtitles.strem.io',    // Fallback (V2)
  'https://podnapisi.strem.io',        // Podnapisi (European/Global)
  'https://yifysubtitles.strem.io',    // YIFY (Mainly Movies)
  'https://addic7ed-v2.strem.io',      // Addic7ed (Mainly TV Shows)
  'https://subdl.strem.io',            // SubDL Stremio Proxy
  'https://stremio-opensubtitles.com'  // OpenSubtitles Community Proxy
];

export const subtitlesService = {
  getStremioSubtitles: async (imdbId: string, type: 'movie' | 'tv' | 'series', season?: string | number, episode?: string | number) => {
    try {
      const actualType = type === 'movie' ? 'movie' : 'series';
      
      const promises = STREMIO_ADDONS.map(async (baseUrl) => {
        const url = actualType === 'movie' 
          ? `${baseUrl}/subtitles/movie/${imdbId}.json`
          : `${baseUrl}/subtitles/series/${imdbId}:${season}:${episode}.json`;
          
        try {
          // 4 second timeout so a dead addon doesn't slow down the player
          const { data } = await axios.get(url, { timeout: 4000 });
          
          if (data && data.subtitles) {
            // Get source name from URL (e.g. 'opensubtitles-v3')
            const sourceName = new URL(baseUrl).hostname.split('.')[0].replace('stremio-', '');
            
            return data.subtitles.map((sub: any) => ({
              uri: sub.url,
              language: sub.lang || 'Inconnu',
              source: sourceName
            }));
          }
        } catch (e) {
          // Ignore failures from individual addons silently
        }
        return [];
      });

      // Wait for all addons to respond (or timeout)
      const results = await Promise.all(promises);
      const allSubtitles = results.flat();

      // Deduplicate subtitles by URI to prevent showing the exact same file twice
      const uniqueSubtitles = Array.from(new Map(allSubtitles.map(sub => [sub.uri, sub])).values());
      
      return uniqueSubtitles;
    } catch (err) {
      console.warn('[SubtitlesService] Failed to fetch Stremio subtitles:', err);
      return [];
    }
  }
};
