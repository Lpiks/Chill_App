import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  ActionSheetIOS,
  Platform,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PremiumAlert } from '../../utils/PremiumAlert';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '../../constants/colors';
import { config } from '../../constants/config';
import api from '../../services/api';

// Skeleton Component
const WatchlistSkeleton = () => (
  <View style={styles.grid}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <View key={i} style={styles.skeletonCard}>
        <View style={styles.skeletonPoster} />
        <View style={styles.skeletonTitle} />
      </View>
    ))}
  </View>
);

export default function WatchlistScreen() {
  const [activeTab, setActiveTab] = useState<'tous' | 'movie' | 'tv'>('tous');
  const queryClient = useQueryClient();
  const router = useRouter();

  // Get full watchlist
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await api.get('/watchlist');
      return res.data;
    },
    staleTime: 1000 * 60 * 2, // 2 min cache
  });

  // Remove from watchlist mutation
  const removeMutation = useMutation({
    mutationFn: (tmdbId: number) => api.delete(`/watchlist/${tmdbId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: () => {
      PremiumAlert.alert('Erreur', 'Impossible de retirer de la liste');
    }
  });

  const handleRemove = (tmdbId: number) => {
    removeMutation.mutate(tmdbId);
  };

  const handleShare = async (item: any) => {
    try {
      await Share.share({
        message: `Regarde ${item.title} sur Chill !`,
        url: `https://chill.app/${item.mediaType}/${item.tmdbId}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const showActions = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const options = ['Regarder', 'Partager', 'Retirer de ma liste', 'Annuler'];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
          title: item.title,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) router.push(`/${item.mediaType}/${item.tmdbId}`);
          if (buttonIndex === 1) handleShare(item);
          if (buttonIndex === 2) handleRemove(item.tmdbId);
        }
      );
    } else {
      PremiumAlert.alert(
        item.title,
        'Actions rapides',
        [
          { text: 'Regarder', onPress: () => router.push(`/${item.mediaType}/${item.tmdbId}`) },
          { text: 'Partager', onPress: () => handleShare(item) },
          { text: 'Retirer de ma liste', style: 'destructive', onPress: () => handleRemove(item.tmdbId) },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'tous') return data;
    return data.filter((item: any) => item.mediaType === activeTab);
  }, [data, activeTab]);

  const renderItem = ({ item }: { item: any }) => {
    const renderRightActions = () => (
      <TouchableOpacity 
        style={styles.deleteAction} 
        onPress={() => handleRemove(item.tmdbId)}
      >
        <Ionicons name="trash-outline" size={24} color="white" />
      </TouchableOpacity>
    );

    return (
      <GestureHandlerRootView>
        <Swipeable renderRightActions={renderRightActions}>
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/${item.mediaType}/${item.tmdbId}`);
            }}
            onLongPress={() => showActions(item)}
          >
            <Image
              source={{ uri: `${config.imageBaseUrl}${item.posterPath}` }}
              style={styles.poster}
              contentFit="cover"
              transition={300}
            />
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.mediaType === 'movie' ? 'Film' : 'Série'}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardYear}>{item.year}</Text>
            </View>
          </TouchableOpacity>
        </Swipeable>
      </GestureHandlerRootView>
    );
  };

  const EmptyState = () => {
    let message = "Votre liste est vide. Ajoutez des films et séries!";
    if (activeTab === 'movie') message = "Aucun film dans votre liste.";
    if (activeTab === 'tv') message = "Aucune série dans votre liste.";

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bookmark-outline" size={80} color={colors.bg3} />
        <Text style={styles.emptyText}>{message}</Text>
        <TouchableOpacity 
          style={styles.explorerBtn}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={styles.explorerBtnText}>Explorer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>MA LISTE</Text>
          {data && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{data.length} TITRES</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tous' && styles.activeTab]}
          onPress={() => setActiveTab('tous')}
        >
          <Text style={[styles.tabText, activeTab === 'tous' && styles.activeTabText]}>Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'movie' && styles.activeTab]}
          onPress={() => setActiveTab('movie')}
        >
          <Text style={[styles.tabText, activeTab === 'movie' && styles.activeTabText]}>Films</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tv' && styles.activeTab]}
          onPress={() => setActiveTab('tv')}
        >
          <Text style={[styles.tabText, activeTab === 'tv' && styles.activeTabText]}>Séries</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <WatchlistSkeleton />
        ) : (
          <FlashList
            data={filteredData}
            renderItem={renderItem}
            {...({ estimatedItemSize: 250 } as any)}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl 
                refreshing={isLoading} 
                onRefresh={refetch} 
                tintColor={colors.red}
              />
            }
            ListEmptyComponent={<EmptyState />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingHorizontal: 16, paddingTop: 10, marginBottom: 20 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: 'white', fontSize: 32, fontFamily: 'BebasNeue_400Regular' },
  countBadge: { backgroundColor: colors.bg2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  countText: { color: colors.muted, fontSize: 10, fontWeight: 'bold' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  tab: { 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  activeTab: { backgroundColor: colors.red, borderColor: colors.red },
  tabText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  activeTabText: { color: 'white' },
  listContent: { paddingHorizontal: 8, paddingBottom: 100 },
  card: { flex: 1, margin: 8, backgroundColor: '#15151b', borderRadius: 12, overflow: 'hidden' },
  poster: { width: '100%', aspectRatio: 2/3 },
  cardInfo: { padding: 10 },
  cardTitle: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  cardYear: { color: colors.muted, fontSize: 12, marginTop: 2 },
  typeBadge: { 
    position: 'absolute', 
    top: 8, 
    left: 8, 
    backgroundColor: colors.red, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4 
  },
  typeBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  deleteAction: { 
    backgroundColor: colors.red, 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 80, 
    height: '90%', 
    marginTop: 8,
    borderRadius: 12,
    marginRight: 8
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: 20, marginBottom: 30 },
  explorerBtn: { backgroundColor: colors.red, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  explorerBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  skeletonCard: { width: '46%', margin: '2%', aspectRatio: 2/3, backgroundColor: '#15151b', borderRadius: 12 },
  skeletonPoster: { flex: 1, backgroundColor: '#1c1c24' },
  skeletonTitle: { height: 15, backgroundColor: '#1c1c24', margin: 10, borderRadius: 4, width: '70%' }
});
