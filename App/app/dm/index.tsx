import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { colors } from '../../constants/colors';
import { Conversation } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuthStore } from '../../store/authStore';

export default function DMListScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/conversations');
      return data as Conversation[];
    },
  });

  const filteredConversations = conversations?.filter(conv => {
    if (conv.type === 'group') {
      return conv.name?.toLowerCase().includes(search.toLowerCase());
    } else {
      const otherUser = conv.members.find(m => (m._id || m.id) !== currentUser?.id);
      return otherUser?.name.toLowerCase().includes(search.toLowerCase());
    }
  });

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isGroup = item.type === 'group';
    
    // Robustly find the other user
    const otherUser = item.members.find(m => {
      const mId = (m.id || m._id)?.toString();
      const cId = (currentUser?.id || currentUser?._id)?.toString();
      return mId !== cId;
    });

    const name = isGroup ? item.name : otherUser?.name;
    const avatar = isGroup ? item.avatar : otherUser?.avatar;
    
    // Robustly find unread count for current user
    const unreadCount = item.unreadCounts.find(u => {
      const uId = (u.userId?._id || u.userId)?.toString();
      const cId = (currentUser?.id || currentUser?._id)?.toString();
      return uId === cId;
    })?.count || 0;

    return (
      <TouchableOpacity 
        style={styles.convItem}
        onPress={() => router.push(`/dm/${item.id || item._id}`)}
      >
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.avatarText}>{name?.charAt(0)}</Text>
            </View>
          )}
          {!isGroup && otherUser?.lastSeen && (
            <View style={[
              styles.onlineIndicator, 
              { backgroundColor: (Date.now() - new Date(otherUser.lastSeen).getTime() < 300000) ? '#4CAF50' : '#757575' }
            ]} />
          )}
        </View>

        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.convName} numberOfLines={1}>{name}</Text>
            {item.lastMessage && (
              <Text style={styles.timestamp}>
                {formatDistanceToNow(new Date(item.lastMessage.createdAt), { addSuffix: false, locale: fr })}
              </Text>
            )}
          </View>
          
          <View style={styles.lastMessageRow}>
            <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadText]} numberOfLines={1}>
              {item.lastMessage?.content || 'Aucun message'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={() => router.push('/dm/new')}>
          <Ionicons name="create-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor="#757575"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlashList
        data={filteredConversations}
        renderItem={renderConversation}
        estimatedItemSize={80}
        keyExtractor={item => item.id || item._id}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>Aucun message.</Text>
              <Text style={styles.emptySubtext}>Ajoutez des amis pour commencer !</Text>
              <TouchableOpacity 
                style={styles.emptyBtn}
                onPress={() => router.push('/friends')}
              >
                <Text style={styles.emptyBtnText}>Trouver des amis</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15 
  },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', fontFamily: 'Nunito' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a28',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, color: 'white', fontSize: 16 },
  convItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 55, height: 55, borderRadius: 27.5 },
  placeholderAvatar: { backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  convInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  convName: { fontSize: 17, fontWeight: '700', color: 'white', flex: 1, marginRight: 10 },
  timestamp: { fontSize: 12, color: '#757575' },
  lastMessageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#757575', flex: 1, marginRight: 10 },
  unreadText: { color: 'white', fontWeight: 'bold' },
  unreadBadge: {
    backgroundColor: colors.red,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadCount: { color: 'white', fontSize: 12, fontWeight: 'bold', fontFamily: 'BebasNeue' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  emptySubtext: { color: '#757575', fontSize: 14, textAlign: 'center', marginTop: 10 },
  emptyBtn: { backgroundColor: colors.red, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, marginTop: 25 },
  emptyBtnText: { color: 'white', fontWeight: 'bold' },
});
