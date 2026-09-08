import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tmdbService } from '../../services/tmdb';
import { MediaCard } from '../../components/MediaCard';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Media } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';

const CATEGORIES = [
  { id: 'multi', label: 'Tout' },
  { id: 'movie', label: 'Films' },
  { id: 'tv', label: 'Séries' },
];

const TRENDING_TAGS = ['Action', 'Comédie', 'Horreur', 'Sci-Fi', 'Drama'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('multi');
  const router = useRouter();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length > 2) {
        handleSearch(query);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, activeCategory]);

  const handleSearch = async (text: string) => {
    setLoading(true);
    try {
      const data = await tmdbService.search(text, activeCategory as any);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePressMedia = (item: Media) => {
    router.push(`/${item.type}/${item.tmdbId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Recherche</Text>
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput
              style={styles.input}
              placeholder="Films, séries, acteurs..."
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoFocus={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categories}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.categoryBtn, activeCategory === cat.id && styles.categoryBtnActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[styles.categoryLabel, activeCategory === cat.id && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results or Empty State */}
      {query.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color={colors.bg3} />
          <Text style={styles.emptyTitle}>Découvrez Chill</Text>
          <Text style={styles.emptySub}>Recherchez des films, séries ou acteurs</Text>
          
          <View style={styles.tagsContainer}>
            {TRENDING_TAGS.map(tag => (
              <TouchableOpacity key={tag} style={styles.tag} onPress={() => setQuery(tag)}>
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.tmdbId}`}
          numColumns={3}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <MediaCard item={item} onPress={() => handlePressMedia(item)} />
            </View>
          )}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>Aucun résultat pour "{query}"</Text>
              </View>
            ) : null
          }
          ListFooterComponent={loading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.red} />
            </View>
          ) : null}
          onScrollBeginDrag={Keyboard.dismiss}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  title: { color: colors.white, fontSize: 28, fontWeight: 'bold', marginBottom: 15, fontFamily: 'Nunito_700Bold' },
  searchBarWrapper: { marginBottom: 15 },
  searchBar: { 
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
  categories: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  categoryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg2 },
  categoryBtnActive: { backgroundColor: colors.red },
  categoryLabel: { color: colors.muted, fontWeight: '600' },
  categoryLabelActive: { color: colors.white },
  resultsList: { paddingHorizontal: 10, paddingBottom: 100 },
  cardWrapper: { flex: 1/3, padding: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  emptySub: { color: colors.muted, fontSize: 14, marginTop: 5 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 30, paddingHorizontal: 40 },
  tag: { backgroundColor: colors.bg3, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  tagText: { color: colors.white, fontSize: 12 },
  noResults: { flex: 1, alignItems: 'center', marginTop: 50 },
  noResultsText: { color: colors.muted, fontSize: 16 },
  footerLoader: { paddingVertical: 20 }
});
