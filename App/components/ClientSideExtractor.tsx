import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface ClientSideExtractorProps {
  tmdbId: string;
  type: string;
  season?: string;
  episode?: string;
  provider: string;
  onSuccess: (url: string) => void;
  onError: () => void;
  onSubtitlesExtracted?: (subtitles: { uri: string, language: string, source: string }[]) => void;
}

export const ClientSideExtractor = ({
  tmdbId,
  type,
  season,
  episode,
  provider,
  onSuccess,
  onError,
  onSubtitlesExtracted
}: ClientSideExtractorProps) => {
  const webViewRef = useRef<WebView>(null);
  
  // Timeout mechanism (give it 25 seconds to find the stream)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('[ClientSideExtractor] Timed out waiting for stream');
      onError();
    }, 25000);
    return () => clearTimeout(timeoutId);
  }, [onError]);

  // Construct URL based on provider
  const getEmbedUrl = () => {
    if (provider === 'vidlink') {
      return type === 'movie'
        ? `https://vidlink.pro/movie/${tmdbId}`
        : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`;
    } else if (provider === 'embed.su') {
      return type === 'movie'
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`;
    } else if (provider === 'vidsrc.me') {
      return type === 'movie'
        ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
        : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
    } else if (provider === 'vidsrc.pro') {
      return type === 'movie'
        ? `https://vidsrc.pro/embed/movie/${tmdbId}`
        : `https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}`;
    } else if (provider === 'superembed.stream') {
      return type === 'movie'
        ? `https://superembed.stream/movie/${tmdbId}`
        : `https://superembed.stream/tv/${tmdbId}?s=${season}&e=${episode}`;
    }
    // Fallback
    return `https://vidlink.pro/movie/${tmdbId}`;
  };

  const INJECTED_JAVASCRIPT_EARLY = `
    (function() {
      if (window.__EXTRACTOR_EARLY_INJECTED__) return;
      window.__EXTRACTOR_EARLY_INJECTED__ = true;

      const originalLog = console.log;
      console.log = function(...args) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: '[WebView] ' + args.join(' ') }));
        }
        originalLog.apply(console, args);
      };

      console.log('Early Injector started on:', window.location.href);

      let extracted = false;
      function sendStream(url) {
        if (extracted) return;
        extracted = true;
        console.log('Intercepted stream!', url);
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stream', url: url }));
        } else {
          window.parent.postMessage(JSON.stringify({ type: 'stream_from_iframe', url: url }), '*');
        }
      }

      window.addEventListener('message', function(event) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'stream_from_iframe' && data.url) sendStream(data.url);
        } catch(e) {}
      });

      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        try {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
          if (url && (url.includes('.m3u8') || url.includes('.mp4') || url.includes('.mkv') || url.includes('.mpd'))) sendStream(url);
        } catch(e) {}
        return originalFetch.apply(this, args);
      };

      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        try {
          if (url && typeof url === 'string') {
            if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('.mkv') || url.includes('.mpd')) sendStream(url);
          }
        } catch(e) {}
        return originalOpen.apply(this, arguments);
      };
    })();
    true;
  `;

  const INJECTED_JAVASCRIPT = `
    (function() {
      if (window.__EXTRACTOR_INJECTED__) return;
      window.__EXTRACTOR_INJECTED__ = true;

      console.log('Main Injector started on:', window.location.href);

      let extracted = false;
      function sendStream(url) {
        if (extracted) return;
        extracted = true;
        console.log('Intercepted stream!', url);
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stream', url: url }));
        } else {
          window.parent.postMessage(JSON.stringify({ type: 'stream_from_iframe', url: url }), '*');
        }
      }

      let extractedSubtitles = false;
      setInterval(() => {
        if (extractedSubtitles) return;
        const tracks = document.querySelectorAll('track');
        if (tracks.length > 0) {
           const subs = [];
           tracks.forEach(t => {
             if (t.src && (t.src.includes('.vtt') || t.src.includes('.srt'))) {
               subs.push({ uri: t.src, language: t.label || t.srclang || 'Inconnu', source: 'Vidlink' });
             }
           });
           if (subs.length > 0) {
             extractedSubtitles = true;
             console.log('Intercepted subtitles!', subs);
             if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
               window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'subtitles', tracks: subs }));
             }
           }
        }
      }, 1000);

      setInterval(() => {
        if (extracted) return;
        const playButtons = document.querySelectorAll('.play-btn, .play-button, button[title*="play" i], .plyr__control--overlaid, .jw-display-icon-display, #overlay, #play, .vjs-big-play-button, #start, #play-now');
        if (playButtons.length > 0) {
           console.log('Found ' + playButtons.length + ' play buttons! Clicking them...');
           playButtons.forEach(btn => { try { btn.click(); } catch(e) {} });
        }

        try {
          const x = window.innerWidth / 2;
          const y = window.innerHeight / 2;
          const element = document.elementFromPoint(x, y);
          if (element && element.tagName !== 'HTML' && element.tagName !== 'BODY') {
             element.click();
          }
        } catch(e) {}
      }, 1000);

      setInterval(() => {
        if (extracted) return;
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
           videos.forEach(v => {
             if (v.src && (v.src.includes('.m3u8') || v.src.includes('.mp4') || v.src.includes('.mkv') || v.src.includes('.mpd'))) sendStream(v.src);
             const source = v.querySelector('source');
             if (source && source.src && (source.src.includes('.m3u8') || source.src.includes('.mp4') || source.src.includes('.mkv') || source.src.includes('.mpd'))) sendStream(source.src);
           });
        }
      }, 1000);
    })();
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'log') {
        console.log(data.message);
      } else if (data.type === 'stream' && data.url) {
        console.log('[ClientSideExtractor] Successfully intercepted stream:', data.url);
        onSuccess(data.url);
      } else if (data.type === 'subtitles' && data.tracks) {
        console.log('[ClientSideExtractor] Successfully intercepted subtitles:', data.tracks.length);
        if (onSubtitlesExtracted) onSubtitlesExtracted(data.tracks);
      }
    } catch (err) {}
  };

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ uri: getEmbedUrl() }}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT_EARLY}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false} // NEW PROP
        injectedJavaScript={INJECTED_JAVASCRIPT}
        injectedJavaScriptForMainFrameOnly={false} // CRITICAL for iframes!
        onMessage={handleMessage}
        onLoadStart={() => console.log(`[ClientSideExtractor] Loading started: ${getEmbedUrl()}`)}
        onLoadProgress={({ nativeEvent }) => console.log(`[ClientSideExtractor] Loading progress: ${nativeEvent.progress}`)}
        onLoadEnd={() => console.log('[ClientSideExtractor] Loading finished')}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('[ClientSideExtractor] WebView Error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('[ClientSideExtractor] HTTP Error:', nativeEvent.statusCode, nativeEvent.url);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false} // THE MAGIC KEY
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        style={{ width: 1, height: 1, opacity: 0.01 }}
        originWhitelist={['*']}
        mixedContentMode="always"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0.01,
    zIndex: -1,
    overflow: 'hidden'
  }
});
