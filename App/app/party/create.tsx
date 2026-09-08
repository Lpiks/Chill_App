import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  FlatList,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { colors } from '../../constants/colors';
import { config } from '../../constants/config';
import { tmdbService } from '../../services/tmdb';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function CreatePartyScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // Search Content
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['tmdb-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const results = await tmdbService.searchMulti(searchQuery);
      
      return results.map((item: any) => ({
        ...item,
        mediaType: item.type, // 'movie' or 'tv'
        poster_path: item.posterPath,
        release_date: item.year,
        first_air_date: item.year
      })).slice(0, 15);
    },
    enabled: searchQuery.length > 2
  });

  // Friends List
  const { data: friends, isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await api.get('/friends');
      return res.data;
    }
  });

  // Series Detail for TV Shows
  const { data: seriesDetail, isLoading: loadSeriesDetail } = useQuery({
    queryKey: ['series', selectedContent?.tmdbId],
    queryFn: () => tmdbService.getSeriesDetail(selectedContent.tmdbId.toString()),
    enabled: !!selectedContent && selectedContent.mediaType === 'tv'
  });

  // Season Detail for TV Shows
  const { data: seasonData, isLoading: loadSeason } = useQuery({
    queryKey: ['season', selectedContent?.tmdbId, selectedSeason],
    queryFn: () => tmdbService.getSeasonDetail(selectedContent.tmdbId.toString(), selectedSeason),
    enabled: !!selectedContent && selectedContent.mediaType === 'tv'
  });

  const handleCreateRoom = async () => {
    // Premium Check
    if (user?.subscriptionTier !== 'premium') {
      Alert.alert(
        'Premium Requis',
        'Watch Party est une fonctionnalité Premium. Passez à Premium pour regarder avec vos amis !',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Passer à Premium', onPress: () => {} } // Placeholder for subscription screen
        ]
      );
      return;
    }

    if (!selectedContent) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const res = await api.post('/party/rooms', {
        tmdbId: selectedContent.tmdbId,
        mediaType: selectedContent.mediaType,
        title: selectedContent.title,
        posterPath: selectedContent.posterPath,
        season: selectedContent.mediaType === 'tv' ? selectedSeason : undefined,
        episode: selectedContent.mediaType === 'tv' ? selectedEpisode : undefined,
        invitedFriendIds: selectedFriends
      });
      
      queryClient.invalidateQueries({ queryKey: ['party-recent'] });
      router.push(`/party/${res.data.roomId}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la salle.');
    }
  };

  const toggleFriend = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedFriends.includes(id)) {
      setSelectedFriends(selectedFriends.filter(f => f !== id));
    } else {
      if (selectedFriends.length >= 4) {
        Alert.alert('Limite atteinte', 'Vous pouvez inviter jusqu\'à 4 amis.');
        return;
      }
      setSelectedFriends([...selectedFriends, id]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{step === 1 ? 'Étape 1: Contenu' : 'Étape 2: Amis'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {step === 1 ? (
        <View style={styles.content}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un film ou une série..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {selectedContent ? (
            <View style={styles.previewContainer}>
              <View style={styles.previewCard}>
                <Image
                  source={{ uri: `${config.imageBaseUrl}${selectedContent.posterPath}` }}
                  style={styles.previewPoster}
                />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle}>{selectedContent.title}</Text>
                  <Text style={styles.previewMeta}>
                    {selectedContent.mediaType === 'movie' ? 'Film' : 'Série'} • {selectedContent.release_date || selectedContent.first_air_date}
                  </Text>
                  <TouchableOpacity 
                    style={styles.changeBtn} 
                    onPress={() => {
                      setSelectedContent(null);
                      setSelectedSeason(1);
                      setSelectedEpisode(1);
                    }}
                  >
                    <Text style={styles.changeBtnText}>Changer</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {selectedContent.mediaType === 'tv' && (
                <View style={styles.tvSelectorContainer}>
                  {loadSeriesDetail ? (
                    <ActivityIndicator color={colors.red} style={{ marginVertical: 20 }} />
                  ) : (
                    <>
                      {/* Season Selector */}
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

                      {/* Episode List */}
                      <ScrollView style={styles.episodesList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
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

              <TouchableOpacity 
                style={styles.nextBtn} 
                onPress={() => setStep(2)}
              >
                <Text style={styles.nextBtnText}>Suivant</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.tmdbId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.resultItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedContent(item);
                  }}
                >
                  <Image
                    source={{ uri: `${config.imageBaseUrl}${item.posterPath}` }}
                    style={styles.resultPoster}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    <Text style={styles.resultMeta}>
                      {item.mediaType === 'movie' ? 'Film' : 'Série'} • {item.release_date || item.first_air_date}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.length > 2 && !searching ? (
                  <Text style={styles.emptyResults}>Aucun résultat trouvé</Text>
                ) : null
              }
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          )}
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.inviteLabel}>Inviter des amis (Max 4)</Text>
          
          <View style={styles.selectedFriendsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedFriends.map(friendId => {
                const friend = friends?.find((f: any) => f.id === friendId);
                return (
                  <View key={friendId} style={styles.selectedFriend}>
                    {friend?.avatar ? (
                      <Image source={{ uri: friend.avatar }} style={styles.selectedAvatar} />
                    ) : (
                      <View style={[styles.selectedAvatar, { backgroundColor: colors.bg3 }]}>
                        <Text style={styles.avatarText}>{friend?.name?.[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.removeFriend}
                      onPress={() => toggleFriend(friendId)}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.friendItem}
                onPress={() => toggleFriend(item.id)}
              >
                <View style={styles.friendInfo}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.friendAvatar} />
                  ) : (
                    <View style={[styles.friendAvatar, { backgroundColor: colors.bg3 }]}>
                      <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.friendName}>{item.name}</Text>
                </View>
                <View style={[styles.checkbox, selectedFriends.includes(item.id) && styles.checkboxActive]}>
                  {selectedFriends.includes(item.id) && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !loadingFriends ? <Text style={styles.emptyResults}>Vous n'avez pas d'amis à inviter</Text> : <ActivityIndicator color={colors.red} />
            }
            contentContainerStyle={{ paddingBottom: 120 }}
          />

          <TouchableOpacity 
            style={[styles.createBtn, (!selectedContent) && { opacity: 0.5 }]} 
            onPress={handleCreateRoom}
          >
            <Text style={styles.createBtnText}>Créer la salle</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
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
  previewContainer: { alignItems: 'center' },
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
  tvSelectorContainer: { width: '100%', marginBottom: 20 },
  seasonContainer: { marginBottom: 15 },
  seasonScroll: { flexDirection: 'row' },
  seasonTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg3, marginRight: 10 },
  seasonTabActive: { backgroundColor: colors.red },
  seasonTabText: { color: colors.muted, fontWeight: 'bold' },
  seasonTabTextActive: { color: colors.white },
  episodesList: { gap: 12, height: 300 }, // Fixed height to allow scrolling inner content
  episodeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 12, padding: 10, gap: 12, borderWidth: 1, borderColor: 'transparent' },
  episodeCardActive: { borderColor: colors.red, backgroundColor: 'rgba(229, 9, 20, 0.1)' },
  episodeThumb: { width: 100, height: 60, borderRadius: 8, backgroundColor: colors.bg3 },
  episodeInfo: { flex: 1 },
  episodeTitle: { color: colors.white, fontSize: 14, fontWeight: 'bold' },
  episodeMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  radioBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.muted, justifyContent: 'center', alignItems: 'center' },
  radioBtnActive: { backgroundColor: colors.red, borderColor: colors.red },
  nextBtn: { backgroundColor: colors.red, width: '100%', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  inviteLabel: { color: colors.muted, fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
  selectedFriendsRow: { height: 80, marginBottom: 20 },
  selectedFriend: { marginRight: 15, position: 'relative' },
  selectedAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  removeFriend: { position: 'absolute', top: -5, right: -5 },
  friendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  friendInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  friendAvatar: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  friendName: { color: 'white', fontSize: 16, fontWeight: '600' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.muted, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: colors.red, borderColor: colors.red },
  createBtn: { 
    position: 'absolute', 
    bottom: 30, 
    left: 20, 
    right: 20, 
    backgroundColor: colors.red, 
    height: 55, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  createBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
