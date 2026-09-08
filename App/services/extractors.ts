import api from './api';

export const extractClientStream = async (tmdbId: string, type: string, season?: string, episode?: string, provider?: string) => {
  try {
    const activeProvider = provider || 'vidlink';
    console.log(`[Stealth API] Requesting extraction for ${type} ${tmdbId} via ${activeProvider}`);
    
    // Call our new Stealth Puppeteer Microservice!
    const { data } = await api.get('/stealth', {
      params: { tmdbId, type, season, episode, provider: activeProvider },
      timeout: 40000 // Puppeteer takes time to load, bypass cloudflare, and click
    });

    if (data && data.success && data.streamUrl) {
      console.log(`[Stealth API] Successfully extracted:`, data.streamUrl);
      return {
        streamUrl: data.streamUrl,
        provider: activeProvider
      };
    }
    
    return null;
  } catch (error: any) {
    console.warn('[Stealth API] Fetch failed:', error.message);
    return null;
  }
};
