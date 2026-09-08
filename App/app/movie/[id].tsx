import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Share,
  Alert
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

const { width } = Dimensions.get('window');

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tmdbId = parseInt(id as string);

  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => tmdbService.getMovieDetail(id as string),
  });

  // Watchlist status check
  const { data: watchlistData } = useQuery({
    queryKey: ['watchlist-check', tmdbId],
    queryFn: async () => {
      const res = await api.get(`/watchlist/check/${tmdbId}`);
      return res.data;
    },
    enabled: !!movie
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
          mediaType: 'movie',
          title: movie.title,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          year: parseInt(movie.release_date?.split('-')[0] || '0'),
          genres: movie.genres?.map((g: any) => g.name)
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
      Alert.alert('Erreur', 'Impossible de mettre à jour votre liste');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist-check', tmdbId] });
      Haptics.notificationAsync(
        isInWatchlist ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
      );
    }
  });

  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: `/watch/${id}`,
      params: { 
        type: 'movie', 
        title: movie.title, 
        posterPath: movie.poster_path 
      }
    });
  };

  const handleShare = async () => {
    if (!movie) return;
    const result = await Share.share({
      message: `Regarde ${movie.title} sur Chill!`,
      url: `https://chill.app/movie/${id}`
    });
  };

  const toggleWatchlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    watchlistMutation.mutate();
  };

  if (isLoading) return <View style={styles.container}><Skeleton width="100%" height={400} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Backdrop Section */}
        <View style={styles.backdropContainer}>
          <Image
            source={{ uri: `${config.backdropBaseUrl}${movie.backdrop_path}` }}
            style={styles.backdrop}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', colors.bg]}
            style={styles.backdropGradient}
          />
          
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shareBtn} 
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Image
              source={{ uri: `${config.imageBaseUrl}${movie.poster_path}` }}
              style={styles.poster}
              contentFit="cover"
            />
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{movie.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.year}>{movie.release_date?.split('-')[0]}</Text>
                <View style={styles.rating}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={styles.ratingText}>{movie.vote_average?.toFixed(1)}</Text>
                </View>
              </View>
              <View style={styles.genres}>
                {movie.genres?.slice(0, 3).map((g: any) => (
                  <View key={g.id} style={styles.genreTag}>
                    <Text style={styles.genreText}>{g.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.playText}>REGARDER MAINTENANT</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.listBtn, isInWatchlist && styles.listBtnActive]} 
              onPress={toggleWatchlist}
            >
              <Ionicons 
                name={isInWatchlist ? "checkmark" : "add"} 
                size={24} 
                color={isInWatchlist ? "white" : colors.red} 
              />
              <Text style={[styles.listBtnText, isInWatchlist && styles.listBtnTextActive]}>
                {isInWatchlist ? 'Dans ma liste' : 'Ma Liste'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.overview} numberOfLines={5}>
              {movie.overview}
            </Text>
          </View>
          
          <CastSlider id={id as string} type="movie" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backdropContainer: { height: 450, position: 'relative' },
  backdrop: { width: '100%', height: '100%' },
  backdropGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  shareBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  content: { paddingHorizontal: 20, marginTop: -80 },
  headerRow: { flexDirection: 'row', gap: 20 },
  poster: { width: 120, height: 180, borderRadius: 12, borderWidth: 2, borderColor: colors.bg2 },
  headerInfo: { flex: 1, justifyContent: 'flex-end', paddingBottom: 10 },
  title: { color: colors.white, fontSize: 28, fontFamily: 'BebasNeue_400Regular', lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 8 },
  year: { color: colors.muted, fontWeight: '600' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: colors.gold, fontWeight: 'bold' },
  genres: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  genreTag: { backgroundColor: colors.bg3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  genreText: { color: colors.white, fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 30 },
  playBtn: { 
    flex: 2, 
    backgroundColor: colors.red, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 16, 
    borderRadius: 12,
    gap: 10
  },
  playText: { color: colors.white, fontFamily: 'BebasNeue_400Regular', fontSize: 18 },
  listBtn: { 
    flex: 1, 
    borderWidth: 1.5, 
    borderColor: colors.red, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 5
  },
  listBtnActive: {
    backgroundColor: colors.red,
  },
  listBtnText: { color: colors.red, fontWeight: 'bold' },
  listBtnTextActive: { color: 'white' },
  section: { marginTop: 30, paddingBottom: 50 },
  sectionTitle: { color: colors.white, fontSize: 18, fontFamily: 'BebasNeue_400Regular', marginBottom: 10 },
  overview: { color: colors.muted, fontSize: 14, lineHeight: 22, fontFamily: 'Nunito_400Regular' }
});
