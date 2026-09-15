import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  FlatList,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { colors } from '../constants/colors';
import { config } from '../constants/config';
import { tmdbService } from '../services/tmdb';

interface ChangeMediaModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (media: any) => void;
  currentRoom: any;
}

export const ChangeMediaModal = ({ visible, onClose, onConfirm, currentRoom }: ChangeMediaModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pre-select the current media if it's a TV show so they can easily pick the next episode
  const [selectedContent, setSelectedContent] = useState<any>(
    currentRoom?.mediaType === 'tv' ? {
      tmdbId: currentRoom.tmdbId,
      mediaType: currentRoom.mediaType,
      title: currentRoom.title,
      posterPath: currentRoom.posterPath,
      poster_path: currentRoom.posterPath
    } : null
  );
  const [selectedSeason, setSelectedSeason] = useState(currentRoom?.season || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(currentRoom?.episode || 1);

  // Search Content
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['tmdb-search-modal', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const results = await tmdbService.searchMulti(searchQuery);
      return results.map((item: any) => ({
        ...item,
        mediaType: item.type,
        poster_path: item.posterPath,
        release_date: item.year,
        first_air_date: item.year
      })).slice(0, 15);
    },
    enabled: searchQuery.length > 2
  });

  // Series Detail for TV Shows
  const { data: seriesDetail, isLoading: loadSeriesDetail } = useQuery({
    queryKey: ['series-modal', selectedContent?.tmdbId],
    queryFn: () => tmdbService.getSeriesDetail(selectedContent.tmdbId.toString()),
    enabled: !!selectedContent && selectedContent.mediaType === 'tv'
  });

  // Season Detail for TV Shows
  const { data: seasonData, isLoading: loadSeason } = useQuery({
    queryKey: ['season-modal', selectedContent?.tmdbId, selectedSeason],
    queryFn: () => tmdbService.getSeasonDetail(selectedContent.tmdbId.toString(), selectedSeason),
    enabled: !!selectedContent && selectedContent.mediaType === 'tv'
  });

  const handleConfirm = () => {
    if (!selectedContent) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm({
      tmdbId: selectedContent.tmdbId,
      mediaType: selectedContent.mediaType,
      title: selectedContent.title,
      posterPath: selectedContent.posterPath || selectedContent.poster_path,
      season: selectedContent.mediaType === 'tv' ? selectedSeason : undefined,
      episode: selectedContent.mediaType === 'tv' ? selectedEpisode : undefined,
    });
  };

  const handleReset = () => {
    setSelectedContent(null);
    setSearchQuery('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Changer le contenu</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          {!selectedContent && (
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un film ou une série..."
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          )}

          {selectedContent ? (
            <View style={styles.previewContainer}>
              <View style={styles.previewCard}>
                <Image
                  source={{ uri: `${config.imageBaseUrl}${selectedContent.posterPath || selectedContent.poster_path}` }}
                  style={styles.previewPoster}
                />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle}>{selectedContent.title}</Text>
                  <Text style={styles.previewMeta}>
                    {selectedContent.mediaType === 'movie' ? 'Film' : 'Série'}
                  </Text>
                  <TouchableOpacity style={styles.changeBtn} onPress={handleReset}>
                    <Text style={styles.changeBtnText}>Chercher autre chose</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {selectedContent.mediaType === 'tv' && (
                <View style={styles.tvSelectorContainer}>
                  {loadSeriesDetail ? (
                    <ActivityIndicator color={colors.red} style={{ marginVertical: 20 }} />
                  ) : (
                    <>
                      <View style={styles.seasonContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonScroll}>
                          {seriesDetail?.seasons?.filter((s: any) => s.season_number > 0).map((s: any) => (
                            <TouchableOpacity 
                              key={s.id} 
                              style={[styles.seasonTab, selectedSeason === s.season_number && styles.seasonTabActive]}
                              onPress={() => setSelectedSeason(s.season_number)}
                            >
                              <Text style={[styles.seasonTabText, selectedSeason === s.season_number && styles.seasonTabTextActive]}>
                                Saison {s.season_number}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      <ScrollView style={styles.episodesList} showsVerticalScrollIndicator={false}>
                        {loadSeason ? (
                          <ActivityIndicator color={colors.red} style={{ marginVertical: 20 }} />
                        ) : (
                          seasonData?.episodes?.map((ep: any) => (
                            <TouchableOpacity 
                              key={ep.id} 
                              style={[styles.episodeCard, selectedEpisode === ep.episode_number && styles.episodeCardActive]}
                              onPress={() => setSelectedEpisode(ep.episode_number)}
                            >
                              <Image 
                                source={{ uri: ep.still_path ? `${config.imageBaseUrl}${ep.still_path}` : `${config.backdropBaseUrl}${seriesDetail?.backdrop_path}` }} 
                                style={styles.episodeThumb}
                              />
                              <View style={styles.episodeInfo}>
                                <Text style={styles.episodeTitle} numberOfLines={1}>{ep.episode_number}. {ep.name}</Text>
                                <Text style={styles.episodeMeta}>{ep.runtime || '45'} min</Text>
                              </View>
                              <View style={[styles.radioBtn, selectedEpisode === ep.episode_number && styles.radioBtnActive]}>
                                {selectedEpisode === ep.episode_number && <Ionicons name="checkmark" size={16} color="white" />}
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmBtnText}>Lancer pour tout le monde</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.tmdbId.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.resultItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedContent(item);
                  }}
                >
                  <Image
                    source={{ uri: `${config.imageBaseUrl}${item.posterPath || item.poster_path}` }}
                    style={styles.resultPoster}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    <Text style={styles.resultMeta}>
                      {item.mediaType === 'movie' ? 'Film' : 'Série'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.length > 2 && !searching ? (
                  <Text style={styles.emptyResults}>Aucun résultat trouvé</Text>
                ) : null
              }
            />
          )}
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.bg2, 
    borderRadius: 15, 
    paddingHorizontal: 15, 
    height: 50,
    marginBottom: 25
  },
  searchInput: { flex: 1, color: 'white', marginLeft: 10, fontSize: 16 },
  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  resultPoster: { width: 60, height: 90, borderRadius: 10 },
  resultInfo: { flex: 1, marginLeft: 15 },
  resultTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  resultMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  emptyResults: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  previewContainer: { flex: 1 },
  previewCard: { 
    flexDirection: 'row', 
    backgroundColor: colors.bg2, 
    padding: 15, 
    borderRadius: 20, 
    width: '100%',
    alignItems: 'center',
    marginBottom: 20
  },
  previewPoster: { width: 80, height: 120, borderRadius: 12 },
  previewInfo: { flex: 1, marginLeft: 20 },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  previewMeta: { color: colors.muted, fontSize: 14, marginTop: 5 },
  changeBtn: { marginTop: 15, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg3, alignSelf: 'flex-start' },
  changeBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  tvSelectorContainer: { flex: 1, width: '100%', marginBottom: 20 },
  seasonContainer: { marginBottom: 15 },
  seasonScroll: { flexDirection: 'row' },
  seasonTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg3, marginRight: 10 },
  seasonTabActive: { backgroundColor: colors.red },
  seasonTabText: { color: colors.muted, fontWeight: 'bold' },
  seasonTabTextActive: { color: colors.white },
  episodesList: { flex: 1, gap: 12 },
  episodeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 12, padding: 10, gap: 12, borderWidth: 1, borderColor: 'transparent', marginBottom: 10 },
  episodeCardActive: { borderColor: colors.red, backgroundColor: 'rgba(229, 9, 20, 0.1)' },
  episodeThumb: { width: 100, height: 60, borderRadius: 8, backgroundColor: colors.bg3 },
  episodeInfo: { flex: 1 },
  episodeTitle: { color: colors.white, fontSize: 14, fontWeight: 'bold' },
  episodeMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  radioBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.muted, justifyContent: 'center', alignItems: 'center' },
  radioBtnActive: { backgroundColor: colors.red, borderColor: colors.red },
  confirmBtn: { backgroundColor: colors.red, width: '100%', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  confirmBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
