import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface InvisibleExtractorProps {
  tmdbId: string;
  type: string;
  season?: string;
  episode?: string;
  provider: string;
  onSuccess: (streamUrl: string) => void;
  onFail: () => void;
}

export const InvisibleExtractor: React.FC<InvisibleExtractorProps> = ({
  tmdbId,
  type,
  season,
  episode,
  provider,
  onSuccess,
  onFail
}) => {
  const webViewRef = useRef<WebView>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const getEmbedUrl = () => {
    const isTv = type === 'tv' || type === 'series';
    const s = season || 1;
    const e = episode || 1;
    
    switch (provider) {
      case 'vidlink':
        return `https://vidlink.pro/${isTv ? 'tv' : 'movie'}/${tmdbId}${isTv ? `/${s}/${e}` : ''}`;
      case 'autoembed':
        return `https://player.autoembed.to/embed/${isTv ? 'tv' : 'movie'}/${tmdbId}${isTv ? `/${s}/${e}` : ''}`;
      case 'vidsrc':
      default:
        return `https://vidsrc.to/embed/${isTv ? 'tv' : 'movie'}/${tmdbId}${isTv ? `/${s}/${e}` : ''}`;
    }
  };

  const INJECTED_JAVASCRIPT = `
    (function() {
      // 1. Intercept XMLHttpRequest to catch .m3u8 playlists
      var originalXhrOpen = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function(method, url) {
        if (url && (url.includes('.m3u8') || url.includes('.mp4'))) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stream', url: url }));
        }
        return originalXhrOpen.apply(this, arguments);
      };

      // 2. Intercept Fetch API
      var originalFetch = window.fetch;
      window.fetch = async function(resource, config) {
        var url = resource instanceof Request ? resource.url : resource;
        if (url && (url.includes('.m3u8') || url.includes('.mp4'))) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stream', url: url }));
        }
        return originalFetch.apply(this, arguments);
      };

      // 3. Scan DOM and Auto-Click Play
      setInterval(function() {
        // Auto-click play buttons
        var playBtn = document.querySelector('.play-button, .jw-display-icon-display, .vjs-big-play-button, #play-now, button.play');
        if (playBtn) playBtn.click();
        
        // Sometimes the video source is directly in the DOM
        var videos = document.querySelectorAll('video');
        for (var i = 0; i < videos.length; i++) {
          if (videos[i].src && (videos[i].src.includes('.m3u8') || videos[i].src.includes('.mp4')) && !videos[i].src.includes('blob:')) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stream', url: videos[i].src }));
          }
        }
      }, 1000);

      // Block all popups
      window.open = function() { return null; };
    })();
    true;
  `;

  useEffect(() => {
    // 20 second absolute timeout for the extractor
    timeoutRef.current = setTimeout(() => {
      console.warn('[InvisibleExtractor] Timed out waiting for .m3u8');
      onFail();
    }, 20000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'stream' && data.url) {
        console.log('[InvisibleExtractor] Caught Stream:', data.url);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onSuccess(data.url);
      }
    } catch (e) {
      // Ignore parse errors from other messages
    }
  };

  return (
    <View style={{ height: 0, width: 0, opacity: 0, overflow: 'hidden' }}>
      <WebView
        ref={webViewRef}
        source={{ uri: getEmbedUrl() }}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
      />
    </View>
  );
};
