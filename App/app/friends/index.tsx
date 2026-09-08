import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

export default function FindFriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['user-suggestions'],
    queryFn: async () => {
      const res = await api.get('/users/suggestions');
      return res.data;
    }
  });

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const res = await api.get(`/users/search?q=${searchQuery}`);
      return res.data;
    },
    enabled: searchQuery.length > 0
  });

  const requestMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/friends/request/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-search'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const renderUser = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <TouchableOpacity 
        style={styles.userInfo} 
        onPress={() => router.push(`/profile/${item._id || item.id}`)}
      >
        <View style={styles.avatar}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View>
          <Text style={styles.userName}>{item.name}</Text>
          {item.mutualFriends !== undefined && (
            <Text style={styles.mutualText}>{item.mutualFriends} amis en commun</Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.actionBtn,
          item.friendshipStatus === 'pending_sent' && styles.pendingBtn,
          item.friendshipStatus === 'friends' && styles.friendsBtn
        ]}
        disabled={item.friendshipStatus === 'pending_sent' || item.friendshipStatus === 'friends'}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          requestMutation.mutate(item._id || item.id);
        }}
      >
        {item.friendshipStatus === 'none' ? (
          <Text style={styles.actionBtnText}>+ Ajouter</Text>
        ) : item.friendshipStatus === 'pending_sent' ? (
          <Text style={styles.pendingBtnText}>En attente</Text>
        ) : item.friendshipStatus === 'pending_received' ? (
          <Text style={styles.actionBtnText}>Voir demande</Text>
        ) : (
          <Text style={styles.friendsBtnText}>Amis ✓</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Trouver des amis</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher par nom ou téléphone..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length > 0 ? (
        <View style={{ flex: 1 }}>
          {searching ? (
            <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
          ) : (
            <FlashList
              data={searchResults}
              renderItem={renderUser}
              estimatedItemSize={80}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20 }}
            />
          )}
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggestions pour vous</Text>
            {loadingSuggestions ? (
              <ActivityIndicator color={colors.red} />
            ) : (
              <FlashList
                data={suggestions}
                renderItem={renderUser}
                estimatedItemSize={80}
                horizontal={false}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    gap: 15
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg2, justifyContent: 'center', alignItems: 'center' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', fontFamily: 'Nunito_700Bold' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.bg2, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    height: 50 
  },
  input: { flex: 1, color: 'white', marginLeft: 10, fontSize: 16 },
  section: { paddingHorizontal: 20 },
  sectionTitle: { color: colors.muted, fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 },
  userCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 25 },
  avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold', fontFamily: 'BebasNeue_400Regular' },
  userName: { color: 'white', fontSize: 16, fontWeight: '600' },
  mutualText: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actionBtn: { backgroundColor: colors.red, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  pendingBtn: { backgroundColor: colors.bg3 },
  pendingBtnText: { color: colors.muted, fontWeight: 'bold' },
  friendsBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  friendsBtnText: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: colors.muted, fontSize: 16 }
});
