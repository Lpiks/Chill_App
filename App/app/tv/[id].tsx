import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tmdbService } from '../../services/tmdb';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/colors';
import { config } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../../components/ui/Skeleton';
import { CastSlider } from '../../components/CastSlider';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { PremiumAlert } from '../../utils/PremiumAlert';

const { width } = Dimensions.get('window');

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tmdbId = parseInt(id as string);
  const [selectedSeason, setSelectedSeason] = useState(1);

  const { data: series, isLoading: loadSeries } = useQuery({
    queryKey: ['series', id],
    queryFn: () => tmdbService.getSeriesDetail(id as string),
  });

  // Watchlist status check
  const { data: watchlistData } = useQuery({
    queryKey: ['watchlist-check', tmdbId],
    queryFn: async () => {
      const res = await api.get(`/watchlist/check/${tmdbId}`);
      return res.data;
    },
    enabled: !!series
  });

  const isInWatchlist = watchlistData?.inWatchlist;

  // Add/Remove Mutations
  const watchlistMutation = useMutation({
    mutationFn: async () => {
      if (isInWatchlist) {
        return api.delete(`/watchlist/${tmdbId}`);
      } else {
        return api.post('/watchlist', {
          tmdbId,
          mediaType: 'tv',
          title: series.name,
          posterPath: series.poster_path,
          backdropPath: series.backdrop_path,
          year: parseInt(series.first_air_date?.split('-')[0] || '0'),
          genres: series.genres?.map((g: any) => g.name)
        });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['watchlist-check', tmdbId] });
      const previousStatus = queryClient.getQueryData(['watchlist-check', tmdbId]);
      queryClient.setQueryData(['watchlist-check', tmdbId], { inWatchlist: !isInWatchlist });
      return { previousStatus };
    },
    onError: (err, variables, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['watchlist-check', tmdbId], context.previousStatus);
      }
      PremiumAlert.alert('Erreur', 'Impossible de mettre à jour votre liste');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist-check', tmdbId] });
      Haptics.notificationAsync(
        isInWatchlist ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
      );
    }
  });

  const { data: seasonData, isLoading: loadSeason } = useQuery({
    queryKey: ['season', id, selectedSeason],
    queryFn: () => tmdbService.getSeasonDetail(id as string, selectedSeason),
    enabled: !!series
  });

  const { data: progressData } = useQuery({
    queryKey: ['progress', tmdbId],
    queryFn: async () => {
      const { data } = await api.get(`/progress?tmdbId=${tmdbId}`);
      return data;
    },
    enabled: !!tmdbId
  });

  const handlePlayEpisode = (episode: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: `/watch/${id}`,
      params: { 
        type: 'tv', 
        season: selectedSeason, 
        episode: episode.episode_number,
        title: series.name, 
        posterPath: series.poster_path 
      }
    });
  };

  const toggleWatchlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    watchlistMutation.mutate();
  };

  if (loadSeries) return <View style={styles.container}><Skeleton width="100%" height={400} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        <View style={styles.backdropContainer}>
          <Image
            source={{ uri: `${config.backdropBaseUrl}${series.backdrop_path}` }}
            style={styles.backdrop}
            contentFit="cover"
          />
          <LinearGradient colors={['transparent', colors.bg]} style={styles.backdropGradient} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{series.name}</Text>
            <TouchableOpacity 
              style={[styles.miniListBtn, isInWatchlist && styles.miniListBtnActive]} 
              onPress={toggleWatchlist}
            >
              <Ionicons 
                name={isInWatchlist ? "checkmark" : "add"} 
                size={20} 
                color={isInWatchlist ? "white" : colors.red} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.year}>{series.first_air_date?.split('-')[0]}</Text>
            <Text style={styles.seasonsCount}>{series.number_of_seasons} Saisons</Text>
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text style={styles.ratingText}>{series.vote_average?.toFixed(1)}</Text>
            </View>
          </View>

          <Text style={styles.overview} numberOfLines={3}>{series.overview}</Text>

          <CastSlider id={id as string} type="tv" />

          {/* Season Selector */}
          <View style={styles.seasonContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonScroll}>
              {series.seasons?.filter((s: any) => s.season_number > 0).map((s: any) => (
                <TouchableOpacity 
                  key={s.id} 
                  style={[styles.seasonTab, selectedSeason === s.season_number && styles.seasonTabActive]}
                  onPress={() => setSelectedSeason(s.season_number)}
                >
                  <Text style={[styles.seasonTabText, selectedSeason === s.season_number && styles.seasonTabTextActive]}>
                    S{s.season_number}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Episode List */}
          <View style={styles.episodesList}>
            {loadSeason ? (
              <Skeleton width="100%" height={80} style={{ marginBottom: 10 }} />
            ) : (
              seasonData?.episodes?.map((ep: any) => {
                const epProgress = progressData?.find((p: any) => p.season === selectedSeason && p.episode === ep.episode_number);
                const progressPercent = epProgress?.duration > 0 ? Math.min((epProgress.timestamp / epProgress.duration) * 100, 100) : 0;
                
                return (
                  <TouchableOpacity 
                    key={ep.id} 
                    style={styles.episodeCard}
                    onPress={() => handlePlayEpisode(ep)}
                  >
                    <View style={styles.episodeThumbContainer}>
                      <Image 
                        source={{ uri: ep.still_path ? `${config.imageBaseUrl}${ep.still_path}` : `${config.backdropBaseUrl}${series.backdrop_path}` }} 
                        style={styles.episodeThumb}
                      />
                      {epProgress && epProgress.duration > 0 && (
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                        </View>
                      )}
                    </View>
                    <View style={styles.episodeInfo}>
                      <Text style={styles.episodeTitle} numberOfLines={1}>{ep.episode_number}. {ep.name}</Text>
                      <Text style={styles.episodeMeta}>{ep.runtime || '45'} min</Text>
                    </View>
                    <Ionicons name="play-circle" size={32} color={colors.red} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backdropContainer: { height: 350, position: 'relative' },
  backdrop: { width: '100%', height: '100%' },
  backdropGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  content: { paddingHorizontal: 20, marginTop: -40 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.white, fontSize: 32, fontFamily: 'BebasNeue_400Regular', flex: 1 },
  miniListBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    borderColor: colors.red, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  miniListBtnActive: { backgroundColor: colors.red },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 5, marginBottom: 15 },
  year: { color: colors.muted, fontWeight: '600' },
  seasonsCount: { color: colors.muted, fontWeight: '600' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: colors.gold, fontWeight: 'bold' },
  overview: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 30 },
  seasonContainer: { marginBottom: 20 },
  seasonScroll: { flexDirection: 'row' },
  seasonTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg3, marginRight: 10 },
  seasonTabActive: { backgroundColor: colors.red },
  seasonTabText: { color: colors.muted, fontWeight: 'bold' },
  seasonTabTextActive: { color: colors.white },
  episodesList: { gap: 12, paddingBottom: 50 },
  episodeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 12, padding: 10, gap: 12 },
  episodeThumbContainer: { width: 100, height: 60, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.bg3 },
  episodeThumb: { width: '100%', height: '100%' },
  progressBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressBarFill: { height: '100%', backgroundColor: colors.red },
  episodeInfo: { flex: 1 },
  episodeTitle: { color: colors.white, fontSize: 14, fontWeight: 'bold' },
  episodeMeta: { color: colors.muted, fontSize: 12, marginTop: 4 }
});
