import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { colors } from '../constants/colors';
import { MediaCard } from '../components/MediaCard';
import { Skeleton } from '../components/ui/Skeleton';
import { tmdbService } from '../services/tmdb';
import api from '../services/api';
import { Media } from '../types';

export default function SeeAllScreen() {
  const router = useRouter();
  const { category, title } = useLocalSearchParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['see-all', category],
    queryFn: async () => {
      switch (category) {
        case 'trending': {
          const res = await api.get('/trending?category=all');
          return res.data.map((m: any) => ({
            ...m, tmdbId: m.tmdbId, type: m.mediaType, year: m.year || '', rating: m.score || 0
          }));
        }
        case 'popular': {
          const res = await api.get('/trending?category=movie');
          return res.data.map((m: any) => ({
            ...m, tmdbId: m.tmdbId, type: m.mediaType, rating: m.score || 0
          }));
        }
        case 'series': {
          const res = await api.get('/trending?category=tv');
          return res.data.map((m: any) => ({
            ...m, tmdbId: m.tmdbId, type: m.mediaType, rating: m.score || 0
          }));
        }
        case 'kdramas':
          return await tmdbService.getKDramas();
        case 'anime':
          return await tmdbService.getAnime();
        case 'action':
          return await tmdbService.getActionMovies();
        case 'comedies':
          return await tmdbService.getComedies();
        default:
          return [];
      }
    }
  });

  const handlePressMedia = (item: Media) => {
    const queryKey = item.type === 'tv' ? 'series' : 'movie';
    const mediaItem = item as any;
    queryClient.setQueryData([queryKey, item.tmdbId.toString()], {
      id: item.tmdbId,
      title: item.title,
      name: item.title,
      poster_path: item.posterPath,
      backdrop_path: mediaItem.backdropPath,
      release_date: mediaItem.year ? `${mediaItem.year}-01-01` : undefined,
      first_air_date: mediaItem.year ? `${mediaItem.year}-01-01` : undefined,
      vote_average: mediaItem.score || item.rating,
      overview: 'Chargement des détails...', 
    });
    
    router.push(`/${item.type === 'tv' ? 'tv' : 'movie'}/${item.tmdbId}`);
  };

  return (
    <View style={styles.container}>
      {/* Header with Glassmorphism */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <BlurView intensity={80} tint="dark" style={styles.blurHeader}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ width: 40 }} />
        </BlurView>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        <FlashList
          data={isLoading ? (Array(12).fill({}) as any[]) : ((data || []) as any[])}
          renderItem={({ item, index }) => 
            isLoading ? (
              <View style={styles.skeletonContainer}>
                <Skeleton width={110} height={165} />
              </View>
            ) : (
              <View style={styles.cardContainer}>
                <MediaCard item={item as Media} onPress={() => handlePressMedia(item as Media)} />
              </View>
            )
          }
          numColumns={3}
          // @ts-ignore - FlashList absolutely uses estimatedItemSize, this is a false positive from the IDE's TS server
          estimatedItemSize={165}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  blurHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingTop: 110, // Account for absolute header
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  skeletonContainer: {
    flex: 1,
    padding: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  cardContainer: {
    flex: 1,
    padding: 5,
    alignItems: 'center',
    marginBottom: 10,
  }
});
