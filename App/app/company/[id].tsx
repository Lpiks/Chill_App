import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { tmdbService } from '../../services/tmdb';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Media } from '../../types';

export default function CompanyScreen() {
  const { id, name, logo } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv'>('all');

  // Fetch Movies (using with_companies)
  const { data: movies, isLoading: loadMovies } = useQuery({
    queryKey: ['company_movies', id],
    queryFn: () => tmdbService.getCompanyMovies(id as string),
  });

  // Fetch Series (using with_networks)
  const { data: series, isLoading: loadSeries } = useQuery({
    queryKey: ['company_series', id],
    queryFn: () => tmdbService.getNetworkSeries(id as string),
  });

  const isLoading = loadMovies || loadSeries;

  let displayData: Media[] = [];
  if (activeTab === 'movie') displayData = movies || [];
  else if (activeTab === 'tv') displayData = series || [];
  else {
    // Combine and sort by rating or popularity for "All" tab
    displayData = [...(movies || []), ...(series || [])].sort((a, b) => b.rating - a.rating);
  }

  const renderItem = ({ item }: { item: Media }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/${item.type}/${item.tmdbId}`)}
    >
      <Image 
        source={{ uri: `https://image.tmdb.org/t/p/w500${item.posterPath}` }} 
        style={styles.poster}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        {logo ? (
          <Image source={{ uri: logo as string }} style={styles.headerLogo} resizeMode="contain" />
        ) : (
          <Text style={styles.headerTitle}>{name}</Text>
        )}
      </SafeAreaView>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['all', 'movie', 'tv'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'all' ? 'Tout' : tab === 'movie' ? 'Films' : 'Séries'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.red} />
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item, index) => `${item.tmdbId}-${index}`}
          numColumns={3}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { padding: 10 },
  headerLogo: { flex: 1, height: 40, marginRight: 40, tintColor: 'white' }, // compensate for backBtn to center
  headerTitle: { flex: 1, color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginRight: 40 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, gap: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  activeTab: { backgroundColor: colors.red },
  tabText: { color: 'white', fontWeight: 'bold' },
  activeTabText: { color: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { padding: 10, paddingBottom: 50 },
  row: { justifyContent: 'space-between', marginBottom: 10 },
  card: { width: '31%', aspectRatio: 2/3, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
  poster: { width: '100%', height: '100%' }
});
