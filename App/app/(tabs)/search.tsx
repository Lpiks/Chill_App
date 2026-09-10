import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tmdbService } from '../../services/tmdb';
import { discover } from '../../services/browsing';
import { MediaCard } from '../../components/MediaCard';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Media } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

const CATEGORIES = [
  { id: 'multi', label: 'Tout' },
  { id: 'movie', label: 'Films' },
  { id: 'tv', label: 'Séries' },
];

const MOVIE_GENRES = [
  { id: '28', name: 'Action' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comédie' },
  { id: '80', name: 'Crime' },
  { id: '18', name: 'Drame' },
  { id: '10751', name: 'Famille' },
  { id: '14', name: 'Fantastique' },
  { id: '27', name: 'Horreur' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Thriller' }
];

const TV_GENRES = [
  { id: '10759', name: 'Action & Aventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comédie' },
  { id: '80', name: 'Crime' },
  { id: '18', name: 'Drame' },
  { id: '10751', name: 'Famille' },
  { id: '96', name: 'Mystère' },
  { id: '10765', name: 'Sci-Fi & Fantasy' }
];

const YEARS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2010s', '2000s'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState('multi');
  
  // Filter States
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [filtersActive, setFiltersActive] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const router = useRouter();

  // Use discover API for empty state or filtered state
  const { data: discoverData, isLoading: isLoadingDiscover } = useQuery({
    queryKey: ['discover', activeCategory, selectedYear, selectedGenre],
    queryFn: async () => {
      // If we are on 'multi' and filters are active, force 'movie' to make TMDB happy
      const searchType = (activeCategory === 'multi' && filtersActive) ? 'movie' : (activeCategory === 'multi' ? 'movie' : activeCategory);
      return await discover({
        type: searchType,
        year: selectedYear && selectedYear.length === 4 ? selectedYear : undefined, // Ignore 2010s for now to keep it simple, or map to gte/lte if backend supports it
        genres: selectedGenre || undefined,
        page: 1
      });
    },
  });

  // Handle Text Search Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length > 2) {
        handleTextSearch(query);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query, activeCategory]);

  const handleTextSearch = async (text: string) => {
    setIsSearching(true);
    setFiltersActive(false); // Text search overrides filters
    try {
      const data = await tmdbService.search(text, activeCategory as any);
      setSearchResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePressMedia = (item: Media) => {
    router.push(`/${item.type}/${item.tmdbId}`);
  };

  const openFilters = () => {
    Keyboard.dismiss();
    // If 'Tout' is selected, force 'Films' because TMDB filters need a specific type
    if (activeCategory === 'multi') {
      setActiveCategory('movie');
    }
    setIsFilterModalVisible(true);
  };

  const applyFilters = () => {
    setQuery(''); // Clear text search when applying filters
    setFiltersActive(true);
    setIsFilterModalVisible(false);
  };

  const clearFilters = () => {
    setSelectedYear(null);
    setSelectedGenre(null);
    setFiltersActive(false);
    setIsFilterModalVisible(false);
  };

  // Determine what to display
  const displayData = query.length > 0 ? searchResults : discoverData || [];
  const isLoading = query.length > 0 ? isSearching : isLoadingDiscover;

  return (
      <SafeAreaView style={styles.container}>
        {/* Search Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Recherche</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Films, séries, acteurs..."
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={(t) => { setQuery(t); setFiltersActive(false); }}
                autoFocus={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
            {activeCategory !== 'multi' && (
              <TouchableOpacity style={styles.filterBtn} onPress={openFilters}>
                <Ionicons name="options" size={24} color={(selectedYear || selectedGenre) ? colors.red : colors.white} />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories */}
          <View style={styles.categories}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.categoryBtn, activeCategory === cat.id && styles.categoryBtnActive]}
                onPress={() => { setActiveCategory(cat.id); setSelectedGenre(null); }}
              >
                <Text style={[styles.categoryLabel, activeCategory === cat.id && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results Grid */}
        <View style={{ flex: 1 }}>
          {query.length === 0 && !filtersActive && (
            <Text style={styles.sectionTitle}>Découvrir</Text>
          )}
          {filtersActive && (
            <Text style={styles.sectionTitle}>Résultats Filtrés</Text>
          )}

          <FlashList
            data={isLoading ? (Array(12).fill({}) as any[]) : displayData}
            keyExtractor={(item: any, index: number) => isLoading ? index.toString() : `${item.type}-${item.tmdbId}`}
            numColumns={3}
            // @ts-ignore
            estimatedItemSize={165}
            renderItem={({ item }: { item: any }) => (
              <View style={styles.cardWrapper}>
                {isLoading ? (
                  <Skeleton width={110} height={165} />
                ) : (
                  <MediaCard item={item} onPress={() => handlePressMedia(item)} />
                )}
              </View>
            )}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>Aucun résultat trouvé.</Text>
                </View>
              ) : null
            }
            onScrollBeginDrag={Keyboard.dismiss}
          />
        </View>

        {/* Filter Native Modal */}
        <Modal
          visible={isFilterModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Filtres Avancés</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={styles.sheetClear}>Réinitialiser</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                    <Ionicons name="close" size={28} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Year Filter */}
              <Text style={styles.filterTitle}>Année</Text>
              <View style={{ marginBottom: 25 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {YEARS.map(year => (
                    <TouchableOpacity 
                      key={year}
                      style={[styles.chip, selectedYear === year && styles.chipActive]}
                      onPress={() => setSelectedYear(selectedYear === year ? null : year)}
                    >
                      <Text style={[styles.chipText, selectedYear === year && styles.chipTextActive]}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Genre Filter */}
              <Text style={styles.filterTitle}>Genres ({activeCategory === 'tv' ? 'Séries' : 'Films'})</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 250, marginBottom: 20 }}>
                <View style={styles.chipGrid}>
                  {(activeCategory === 'tv' ? TV_GENRES : MOVIE_GENRES).map(genre => (
                    <TouchableOpacity 
                      key={genre.id}
                      style={[styles.chip, selectedGenre === genre.id && styles.chipActive]}
                      onPress={() => setSelectedGenre(selectedGenre === genre.id ? null : genre.id)}
                    >
                      <Text style={[styles.chipText, selectedGenre === genre.id && styles.chipTextActive]}>{genre.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Apply Button */}
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  title: { color: colors.white, fontSize: 28, fontWeight: 'bold', marginBottom: 15, fontFamily: 'Nunito_700Bold' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  searchBar: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.bg2, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  input: { flex: 1, color: colors.white, marginLeft: 10, fontSize: 16 },
  filterBtn: {
    width: 50,
    height: 50,
    backgroundColor: colors.bg2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  categories: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  categoryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg2 },
  categoryBtnActive: { backgroundColor: colors.red },
  categoryLabel: { color: colors.muted, fontWeight: '600' },
  categoryLabelActive: { color: colors.white },
  sectionTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold', paddingHorizontal: 20, paddingBottom: 10 },
  resultsList: { paddingHorizontal: 10, paddingBottom: 100 },
  cardWrapper: { flex: 1/3, padding: 5, alignItems: 'center' },
  noResults: { flex: 1, alignItems: 'center', marginTop: 50 },
  noResultsText: { color: colors.muted, fontSize: 16 },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: colors.bg2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  sheetTitle: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  sheetClear: { color: colors.red, fontSize: 16, fontWeight: '600' },
  filterTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  chipScroll: { marginBottom: 25 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: colors.bg3, 
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10
  },
  chipActive: { backgroundColor: colors.red },
  chipText: { color: colors.muted, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  applyBtn: {
    backgroundColor: colors.red,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
  applyBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' }
});
