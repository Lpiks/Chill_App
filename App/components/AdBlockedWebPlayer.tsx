import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface AdBlockedWebPlayerProps {
  tmdbId: string;
  type: string;
  season?: string;
  episode?: string;
  provider: string;
  onSuccess: (streamUrl: string) => void;
}

export const AdBlockedWebPlayer: React.FC<AdBlockedWebPlayerProps> = ({
  tmdbId,
  type,
  season,
  episode,
  provider,
  onSuccess
}) => {
  const webViewRef = useRef<WebView>(null);

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

      // 3. Scan DOM for videos
      setInterval(function() {
        var videos = document.querySelectorAll('video');
        for (var i = 0; i < videos.length; i++) {
          if (videos[i].src && (videos[i].src.includes('.m3u8') || videos[i].src.includes('.mp4')) && !videos[i].src.includes('blob:')) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stream', url: videos[i].src }));
          }
        }
        
        // Hide ad banners by injecting CSS directly
        var style = document.createElement('style');
        style.innerHTML = 'iframe[src*="ads"], div[id*="ad-"], div[class*="ad-"], .banner, .popunder, .overlay { display: none !important; }';
        document.head.appendChild(style);
      }, 1000);

      // Block all popups violently
      window.open = function() { return null; };
    })();
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'stream' && data.url) {
        console.log('[AdBlockedWebPlayer] Caught Stream! Handing off to Native Player:', data.url);
        onSuccess(data.url);
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: getEmbedUrl() }}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
        injectedJavaScriptForMainFrameOnly={false}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'black'
  }
});
