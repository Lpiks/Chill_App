import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Image,
  AppState
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { tmdbService } from '../../services/tmdb';
import { subtitlesService } from '../../services/subtitles';
import { VideoPlayer, SubtitleTrack } from '../../components/VideoPlayer';
import { ClientSideExtractor } from '../../components/ClientSideExtractor';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WatchScreen() {
  const insets = useSafeAreaInsets();
  const { id, type, season, episode, title, posterPath } = useLocalSearchParams();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(0);
  const [provider, setProvider] = useState('vidlink'); 
  const [hasStarted, setHasStarted] = useState(false); 
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [finalStreamUrl, setFinalStreamUrl] = useState<string | null>(null);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  
  // Subtitle states
  const [vidlinkSubtitles, setVidlinkSubtitles] = useState<SubtitleTrack[]>([]);

  const PROVIDERS = ['vidlink', 'embed.su', 'vidsrc.me', 'vidsrc.pro', 'superembed.stream'];

  // Reset state when provider or episode changes
  useEffect(() => {
    setFinalStreamUrl(null);
    setExtractionFailed(false);
    // If we have already clicked play (hasStarted is true), automatically start extracting the next episode
    setIsExtracting(hasStarted); 
    setVidlinkSubtitles([]);
  }, [provider, id, season, episode]);

  const startPlayback = () => {
    setHasStarted(true);
    setIsExtracting(true);
  };

  const handleExtractionSuccess = (url: string) => {
    setFinalStreamUrl(url);
    setIsExtracting(false);
  };

  const handleExtractionError = () => {
    setExtractionFailed(true);
    setIsExtracting(false);
  };

  const handleSubtitlesExtracted = (subs: any[]) => {
    // Only set if we got actual tracks
    if (subs && subs.length > 0) {
      setVidlinkSubtitles(subs as SubtitleTrack[]);
    }
  };

  // Server-Side Extractor Effect
  useEffect(() => {
    if (isExtracting && !finalStreamUrl) {
      const fetchStream = async () => {
        try {
          const res = await api.get('/stealth', {
            params: {
              tmdbId: id,
              type: type,
              season: season,
              episode: episode,
              provider: provider
            }
          });
          if (res.data && res.data.success) {
            handleExtractionSuccess(res.data.streamUrl);
            if (res.data.subtitles) {
              handleSubtitlesExtracted(res.data.subtitles);
            }
          } else {
            handleExtractionError();
          }
        } catch (err) {
          console.error('Server extraction error', err);
          handleExtractionError();
        }
      };
      fetchStream();
    }
  }, [isExtracting, finalStreamUrl, id, type, season, episode, provider]);


  // Fetch TMDB Details to get IMDB ID
  const { data: tmdbDetails } = useQuery({
    queryKey: ['details', id, type],
    queryFn: async () => {
      if (type === 'movie') return await tmdbService.getMovieDetail(id as string);
      return await tmdbService.getSeriesDetail(id as string);
    }
  });

  // Season Detail for TV Shows
  const { data: seasonData, isLoading: loadSeason } = useQuery({
    queryKey: ['season', id, season],
    queryFn: () => tmdbService.getSeasonDetail(id as string, parseInt(season as string)),
    enabled: (type === 'tv' || type === 'series') && !!season
  });

  // Fetch Recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['recommendations', id, type],
    queryFn: () => tmdbService.getRecommendations(id as string, type as 'movie' | 'tv')
  });

  // Fetch Stremio Subtitles
  const imdbId = tmdbDetails?.imdb_id || tmdbDetails?.external_ids?.imdb_id;
  const { data: stremioSubtitles } = useQuery({
    queryKey: ['stremio_subs', imdbId, season, episode],
    queryFn: async () => {
      if (!imdbId) return [];
      return await subtitlesService.getStremioSubtitles(imdbId, type as any, season as string, episode as string);
    },
    enabled: !!imdbId
  });

  // Merge Subtitles
  const mergedSubtitles = [...vidlinkSubtitles, ...(stremioSubtitles || [])];

  const currentTimeRef = useRef(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // 3. Auto-Save Progress (Every 10s) & AppState listener
  useEffect(() => {
    const saveProgress = async () => {
      const time = currentTimeRef.current;
      if (!time || time < 10) return;

      try {
        await api.post('/progress', {
          tmdbId: id,
          mediaType: type,
          title: title as string,
          posterPath: posterPath as string,
          season: season ? parseInt(season as string) : undefined,
          episode: episode ? parseInt(episode as string) : undefined,
          timestamp: time,
          duration: videoDuration
        });
      } catch (err) {}
    };

    const interval = setInterval(saveProgress, 10000); // 10s for quicker updates

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        saveProgress();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [videoDuration, id, type, title, posterPath, season, episode]);

  const renderProviderMenu = () => (
    <View style={styles.providerContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {PROVIDERS.map(p => (
          <TouchableOpacity 
            key={p} 
            style={[styles.providerBtn, provider === p && styles.providerBtnActive]}
            onPress={() => setProvider(p)}
          >
            <Text style={[styles.providerText, provider === p && styles.providerTextActive]}>
              {p.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      
      {!hasStarted && !finalStreamUrl ? (
        <View style={styles.prePlayContainer}>
          <ImageBackground 
            source={{ uri: `https://image.tmdb.org/t/p/w500${posterPath}` }} 
            style={StyleSheet.absoluteFill}
            blurRadius={2}
          >
            <View style={styles.overlay} />
          </ImageBackground>
          <TouchableOpacity style={styles.playButtonLarge} onPress={startPlayback}>
            <Ionicons name="play-circle" size={100} color={colors.red} />
          </TouchableOpacity>
        </View>
      ) : isExtracting && !finalStreamUrl ? (
        <View style={styles.loaderContainer}>
          <ImageBackground 
            source={{ uri: `https://image.tmdb.org/t/p/w500${posterPath}` }} 
            style={StyleSheet.absoluteFill}
            blurRadius={10}
          >
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          </ImageBackground>
          
          <View style={styles.loaderContent}>
            <ActivityIndicator size="large" color={colors.red} />
            <Text style={styles.loaderText}>Recherche du flux (Server-Side)...</Text>
            <Text style={styles.loaderSubText}>{title} ({provider.toUpperCase()})</Text>
          </View>
        </View>
      ) : null}

      {/* 
      {isExtracting && !finalStreamUrl && (
        <ClientSideExtractor
          tmdbId={id as string}
          type={type as string}
          season={season as string | undefined}
          episode={episode as string | undefined}
          provider={provider}
          onSuccess={handleExtractionSuccess}
          onError={handleExtractionError}
          onSubtitlesExtracted={handleSubtitlesExtracted}
        />
      )}
      */}

      {extractionFailed && !finalStreamUrl && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={colors.red} />
          <Text style={styles.errorTitle}>Flux introuvable</Text>
          <Text style={styles.errorSub}>L'extracteur serveur n'a pas pu trouver le flux vidéo sur {provider.toUpperCase()}.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setExtractionFailed(false); setIsExtracting(true); }}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {finalStreamUrl && !isExtracting && (
        <View style={[styles.mainLayout, !isPlayerFullscreen && { paddingTop: insets.top }]}>
          <View style={isPlayerFullscreen ? styles.fullscreenVideoWrapper : styles.topVideoWrapper}>
            <VideoPlayer
              streamUrl={finalStreamUrl}
              provider={provider}
              subtitles={mergedSubtitles}
              title={type === 'tv' || type === 'series' ? `${title} S${season} E${episode}` : title as string}
              isSeries={type === 'tv' || type === 'series'}
              onProgress={(time) => {
                setCurrentTime(time);
                currentTimeRef.current = time;
              }}
              onDuration={(duration) => setVideoDuration(duration)}
              onFullscreenChange={setIsPlayerFullscreen}
              onNext={() => {
                if (episode) {
                  router.setParams({ episode: (parseInt(episode as string) + 1).toString() });
                }
              }}
            />
          </View>
          
          {!isPlayerFullscreen && (
            <ScrollView style={styles.metadataScroll} contentContainerStyle={{ padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
              {/* Title & Meta */}
              <Text style={styles.metaTitle}>{tmdbDetails?.title || tmdbDetails?.name || title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaYear}>{(tmdbDetails?.release_date || tmdbDetails?.first_air_date || '').substring(0, 4)}</Text>
                <View style={styles.hdBadge}><Text style={styles.hdText}>HD</Text></View>
                {tmdbDetails?.runtime && <Text style={styles.metaYear}>{tmdbDetails.runtime} min</Text>}
              </View>
              <Text style={styles.overview}>
                {(type === 'tv' || type === 'series') && seasonData?.episodes?.find((ep: any) => ep.episode_number === parseInt(episode as string))?.overview 
                  ? seasonData?.episodes?.find((ep: any) => ep.episode_number === parseInt(episode as string)).overview
                  : tmdbDetails?.overview || "Aucune description disponible pour ce programme."}
              </Text>

              {/* Next/Prev Buttons for TV */}
              {(type === 'tv' || type === 'series') && (
                <View style={styles.navButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.navBtn, parseInt(episode as string) <= 1 && styles.navBtnDisabled]}
                    disabled={parseInt(episode as string) <= 1}
                    onPress={() => router.setParams({ episode: (parseInt(episode as string) - 1).toString() })}
                  >
                    <Ionicons name="play-skip-back" size={20} color="white" />
                    <Text style={styles.navBtnText}>Précédent</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.navBtn, (!seasonData?.episodes || parseInt(episode as string) >= seasonData.episodes.length) && styles.navBtnDisabled]}
                    disabled={!seasonData?.episodes || parseInt(episode as string) >= seasonData.episodes.length}
                    onPress={() => router.setParams({ episode: (parseInt(episode as string) + 1).toString() })}
                  >
                    <Text style={styles.navBtnText}>Suivant</Text>
                    <Ionicons name="play-skip-forward" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Recommendations */}
              {recommendations && recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.sectionTitle}>Titres Similaires</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                    {recommendations.map((item: any) => (
                      <TouchableOpacity 
                        key={item.tmdbId} 
                        style={styles.recCard}
                        onPress={() => router.push({
                          pathname: `/watch/${item.tmdbId}`,
                          params: { type: item.type, title: item.title, posterPath: item.posterPath, ...(item.type === 'tv' && { season: '1', episode: '1' }) }
                        })}
                      >
                        <Image 
                          source={{ uri: `https://image.tmdb.org/t/p/w500${item.posterPath}` }} 
                          style={styles.recPoster} 
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  mainLayout: { flex: 1 },
  topVideoWrapper: { width: '100%', aspectRatio: 16/9, backgroundColor: 'black', zIndex: 10 },
  fullscreenVideoWrapper: { flex: 1, width: '100%', backgroundColor: 'black', zIndex: 10 },
  metadataScroll: { flex: 1, backgroundColor: '#0a0a0f' },
  metaTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  metaYear: { color: colors.muted, fontSize: 14, fontWeight: 'bold' },
  hdBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  hdText: { color: colors.muted, fontSize: 10, fontWeight: 'bold' },
  overview: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22, marginBottom: 30 },
  
  navButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, gap: 15 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg2, paddingVertical: 12, borderRadius: 12, gap: 8 },
  navBtnDisabled: { opacity: 0.5 },
  navBtnText: { color: 'white', fontWeight: 'bold' },

  recommendationsSection: { marginTop: 10 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  recCard: { marginRight: 15 },
  recPoster: { width: 120, height: 180, borderRadius: 12, backgroundColor: colors.bg3 },

  providerContainer: { position: 'absolute', top: 50, left: 0, right: 0, zIndex: 100 },
  providerBtn: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  providerBtnActive: { borderColor: colors.red, backgroundColor: 'rgba(229, 9, 20, 0.2)' },
  providerText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  providerTextActive: { color: colors.red },
  prePlayContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  playButtonLarge: { 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 15,
    elevation: 10 
  },
  loaderContainer: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  loaderContent: { alignItems: 'center', gap: 15 },
  loaderText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  loaderSubText: { color: colors.muted, fontSize: 14 },
  errorContainer: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  errorSub: { color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  retryBtn: { backgroundColor: colors.red, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, marginTop: 30 },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  backBtn: { marginTop: 20 },
  backText: { color: colors.muted, fontSize: 16 }
});
