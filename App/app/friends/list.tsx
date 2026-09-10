import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Image } from 'expo-image';

export default function FriendsListScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: friends, isLoading, refetch } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await api.get('/friends');
      return res.data;
    }
  });

  const filteredFriends = friends?.filter((f: any) => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const renderFriend = ({ item }: { item: any }) => (
    <View style={styles.friendCard}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => router.push(`/profile/${item.id}`)}
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
          <Text style={styles.lastSeen}>
            {item.lastSeen ? `En ligne ${formatDistanceToNow(new Date(item.lastSeen), { addSuffix: true, locale: fr })}` : 'Hors ligne'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
              const res = await api.post('/conversations', { memberIds: [item.id] });
              router.push(`/dm/${res.data._id || res.data.id}`);
            } catch (error) {
              console.error('Error opening DM:', error);
            }
          }}
        >
          <Ionicons name="chatbubble-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Amis</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => router.push('/friends')}
        >
          <Ionicons name="person-add" size={24} color={colors.red} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="Filtrer vos amis..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
        ) : (
          <FlashList
            data={filteredFriends}
            renderItem={renderFriend}
            estimatedItemSize={80}
            onRefresh={refetch}
            refreshing={isLoading}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={80} color={colors.bg3} />
                <Text style={styles.emptyTitle}>Vous n'avez pas encore d'amis</Text>
                <Text style={styles.emptySub}>Commencez à chercher des personnes pour discuter et regarder des films ensemble !</Text>
                <TouchableOpacity 
                  style={styles.findBtn}
                  onPress={() => router.push('/friends')}
                >
                  <Text style={styles.findBtnText}>Trouver des amis</Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          />
        )}
      </View>
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
    justifyContent: 'space-between'
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg2, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg2, justifyContent: 'center', alignItems: 'center' },
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
  friendCard: { 
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
  avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  userName: { color: 'white', fontSize: 16, fontWeight: '600' },
  lastSeen: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg2, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
  emptySub: { color: colors.muted, fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 20 },
  findBtn: { marginTop: 30, backgroundColor: colors.red, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  findBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
