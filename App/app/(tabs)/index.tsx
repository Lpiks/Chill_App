import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl, StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tmdbService } from '../../services/tmdb';
import api from '../../services/api';
import { HeroSlider } from '../../components/HeroSlider';
import { MediaRow } from '../../components/MediaRow';
import { colors } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { Media } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useFriendStore } from '../../store/friendStore';
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loadStep, setLoadStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadStep(prev => prev >= 3 ? prev : prev + 1);
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const handleSeeAll = () => {
    Alert.alert('Bientôt disponible', 'Cette page sera bientôt ajoutée !');
  };

  // Queries
  const { data: trending, isLoading: loadTrending, refetch: refetchTrending } = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const { data } = await api.get('/trending?category=all');
      return data.map((m: any) => ({
        ...m,
        tmdbId: m.tmdbId,
        type: m.mediaType,
        year: m.year || ''
      }));
    },
  });

  const { data: popular, isLoading: loadPopular } = useQuery({
    queryKey: ['popular'],
    queryFn: async () => {
      const { data } = await api.get('/trending?category=movie');
      return data.map((m: any) => ({
        ...m,
        tmdbId: m.tmdbId,
        type: m.mediaType
      }));
    },
    enabled: loadStep >= 1,
  });

  const { data: series, isLoading: loadSeries } = useQuery({
    queryKey: ['series'],
    queryFn: async () => {
      const { data } = await api.get('/trending?category=tv');
      return data.map((m: any) => ({
        ...m,
        tmdbId: m.tmdbId,
        type: m.mediaType
      }));
    },
    enabled: loadStep >= 1,
  });

  const { data: kdramas, isLoading: loadKdramas } = useQuery({
    queryKey: ['kdramas'],
    queryFn: () => tmdbService.getKDramas(), 
    enabled: loadStep >= 3,
  });

  const { data: anime, isLoading: loadAnime } = useQuery({
    queryKey: ['anime'],
    queryFn: () => tmdbService.getAnime(),
    enabled: loadStep >= 3,
  });

  const { data: action, isLoading: loadAction } = useQuery({
    queryKey: ['action'],
    queryFn: () => tmdbService.getActionMovies(),
    enabled: loadStep >= 2,
  });

  const { data: comedies, isLoading: loadComedies } = useQuery({
    queryKey: ['comedies'],
    queryFn: () => tmdbService.getComedies(),
    enabled: loadStep >= 2,
  });

  const COMPANIES = [
    { id: 213, name: 'Netflix', logo: 'https://image.tmdb.org/t/p/w500/wwemzKWzjKYJFfCeiB57q3r4Bcm.png' },
    { id: 49, name: 'HBO', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/512px-HBO_logo.svg.png' },
    { id: 2552, name: 'Apple TV+', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/512px-Apple_TV_Plus_Logo.svg.png' },
    { id: 2739, name: 'Disney+', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/512px-Disney%2B_logo.svg.png' },
    { id: 1024, name: 'Amazon Prime', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Amazon_Prime_Video_logo.svg/512px-Amazon_Prime_Video_logo.svg.png' },
  ];

  const { data: progress, isLoading: loadProgress, refetch: refetchProgress } = useQuery({
    queryKey: ['progress'],
    queryFn: async () => {
      const { data } = await api.get('/progress');
      return data;
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      refetchProgress();
    }, [refetchProgress])
  );

  const onRefresh = () => {
    refetchTrending();
  };

  const handlePressMedia = (item: Media) => {
    // Optimistic UI: Pre-fill the cache with the data we already have so it loads instantly!
    const queryKey = item.type === 'tv' ? 'series' : 'movie';
    const mediaItem = item as any; // Bypass TS for dynamic fields from backend
    queryClient.setQueryData([queryKey, item.tmdbId.toString()], {
      id: item.tmdbId,
      title: item.title,
      name: item.title,
      poster_path: item.posterPath,
      backdrop_path: mediaItem.backdropPath,
      release_date: mediaItem.year ? `${mediaItem.year}-01-01` : undefined,
      first_air_date: mediaItem.year ? `${mediaItem.year}-01-01` : undefined,
      vote_average: mediaItem.score || item.rating,
      overview: 'Chargement des détails...', // Temporary placeholder
    });
    
    router.push(`/${item.type === 'tv' ? 'tv' : 'movie'}/${item.tmdbId}`);
  };

  const { unreadNotifications, pendingReceived } = useFriendStore();

  return (
    <View style={styles.container}>
      {/* Absolute Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerBtn}
            onPress={() => router.push('/friends')}
          >
            <BlurView intensity={80} tint="dark" style={styles.blurBtn}>
              <Ionicons name="search" size={22} color="white" />
            </BlurView>
          </TouchableOpacity>

          <BlurView intensity={80} tint="dark" style={styles.headerPill}>
            <TouchableOpacity 
              style={styles.pillBtn}
              onPress={() => router.push('/friends/list')}
            >
              <Ionicons name="people-outline" size={22} color="white" />
              {pendingReceived.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingReceived.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.pillBtn}
              onPress={() => router.push('/party')}
            >
              <Ionicons name="tv-outline" size={22} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.pillBtn}
              onPress={() => router.push('/dm')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.pillBtn}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color="white" />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loadTrending} onRefresh={onRefresh} tintColor={colors.red} />
        }
      >
        {/* Hero Slider */}
        <HeroSlider 
          data={trending || []} 
          onPress={handlePressMedia}
        />

        <View style={styles.content}>
          {/* Continue Watching */}
          {progress?.length > 0 && (
            <View style={styles.continueSection}>
              <Text style={styles.sectionTitle}>Continuer à regarder</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 15 }}>
                {progress.map((item: any) => {
                  const progressPercent = item.duration > 0 ? Math.min((item.timestamp / item.duration) * 100, 100) : 0;
                  return (
                    <TouchableOpacity 
                      key={item._id || item.tmdbId} 
                      style={styles.continueCard}
                      onPress={() => router.push({
                        pathname: `/watch/${item.tmdbId}`,
                        params: { 
                          type: item.mediaType, 
                          title: item.title, 
                          posterPath: item.posterPath, 
                          ...(item.mediaType === 'series' || item.mediaType === 'tv' ? { season: item.season?.toString(), episode: item.episode?.toString() } : {}) 
                        }
                      })}
                    >
                      <Image source={{ uri: `https://image.tmdb.org/t/p/w342${item.posterPath}` }} style={styles.continuePoster} contentFit="cover" transition={300} />
                      <View style={styles.continueOverlay}>
                        <Ionicons name="play-circle" size={40} color="white" style={styles.continuePlayBtn} />
                      </View>
                      
                      {/* Meta Info for TV */}
                      {(item.mediaType === 'series' || item.mediaType === 'tv') && item.season && item.episode && (
                        <View style={styles.continueMetaBadge}>
                          <Text style={styles.continueMetaText}>S{item.season} E{item.episode}</Text>
                        </View>
                      )}

                      {/* Progress Bar */}
                      {item.duration > 0 && (
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Companies Hub */}
          <Text style={styles.sectionTitle}>Studios & Networks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companiesRow}>
            {COMPANIES.map(comp => (
              <TouchableOpacity 
                key={comp.id} 
                style={styles.companyCard}
                onPress={() => router.push(`/company/${comp.id}?name=${encodeURIComponent(comp.name)}&logo=${encodeURIComponent(comp.logo)}`)}
              >
                <Image source={{ uri: comp.logo }} style={styles.companyLogo} contentFit="contain" transition={300} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <MediaRow 
            title="Tendances" 
            data={trending ? trending.slice(0, 10) : []} 
            loading={loadTrending}
            onPressItem={handlePressMedia}
            onSeeAll={handleSeeAll}
          />

          <MediaRow 
            title="Blockbusters d'Action" 
            data={action ? action.slice(0, 10) : []} 
            loading={loadAction}
            onPressItem={handlePressMedia}
            onSeeAll={handleSeeAll}
          />

          <MediaRow 
            title="Comédies à Mourir de Rire" 
            data={comedies ? comedies.slice(0, 10) : []} 
            loading={loadComedies}
            onPressItem={handlePressMedia}
            onSeeAll={handleSeeAll}
          />

          <MediaRow 
            title="Films Populaires" 
            data={popular ? popular.slice(0, 10) : []} 
            loading={loadPopular}
            onPressItem={handlePressMedia}
            onSeeAll={handleSeeAll}
          />

          <MediaRow 
            title="Séries Populaires" 
            data={series ? series.slice(0, 10) : []} 
            loading={loadSeries}
            onPressItem={handlePressMedia}
            onSeeAll={handleSeeAll}
          />

          <MediaRow 
            title="K-Dramas" 
            data={kdramas ? kdramas.slice(0, 10) : []} 
            loading={loadKdramas}
            onPressItem={handlePressMedia}
            onSeeAll={handleSeeAll}
          />

          <MediaRow 
            title="L'Univers Anime" 
            data={anime ? anime.slice(0, 10) : []} 
            loading={loadAnime}
            onPressItem={handlePressMedia}
            onSeeAll={handleSeeAll}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 100,
    backgroundColor: 'transparent'
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  pillBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.red,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  content: { paddingTop: 20, paddingBottom: 100 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, marginTop: 10 },
  companiesRow: { paddingHorizontal: 20, gap: 15, marginBottom: 20 },
  companyCard: { width: 120, height: 70, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  companyLogo: { width: '100%', height: '100%', tintColor: 'white' },
  
  continueSection: { marginBottom: 20 },
  continueCard: { width: 140, height: 210, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bg2 },
  continuePoster: { width: '100%', height: '100%' },
  continueOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  continuePlayBtn: { opacity: 0.8 },
  continueMetaBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  continueMetaText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  progressBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressBarFill: { height: '100%', backgroundColor: colors.red },
});
