import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

export default function FriendRequestsScreen() {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: async () => {
      const res = await api.get('/friends/requests');
      return res.data;
    }
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => api.put(`/friends/request/${requestId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const declineMutation = useMutation({
    mutationFn: (requestId: string) => api.delete(`/friends/request/${requestId}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId: string) => api.delete(`/friends/request/${requestId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  });

  const renderRequest = ({ item }: { item: any }) => {
    const user = activeTab === 'received' ? item.requester : item.recipient;
    
    return (
      <View style={styles.requestCard}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => router.push(`/profile/${user._id || user.id}`)}
        >
          <View style={styles.avatar}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.userName}>{user.name}</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          {activeTab === 'received' ? (
            <>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => acceptMutation.mutate(item._id)}
              >
                <Ionicons name="checkmark" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => declineMutation.mutate(item._id)}
              >
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => cancelMutation.mutate(item._id)}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Demandes d'amis</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Reçues {requests?.received?.length > 0 && `(${requests.received.length})`}
          </Text>
          {requests?.received?.length > 0 && <View style={styles.badge} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Envoyées
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
        ) : (
          <FlashList
            data={activeTab === 'received' ? requests?.received : requests?.sent}
            renderItem={renderRequest}
            estimatedItemSize={80}
            onRefresh={refetch}
            refreshing={isLoading}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color={colors.bg3} />
                <Text style={styles.emptyText}>Aucune demande en attente</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20 }}
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
    gap: 15
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg2, justifyContent: 'center', alignItems: 'center' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', fontFamily: 'Nunito_700Bold' },
  tabs: { 
    flexDirection: 'row', 
    marginHorizontal: 20, 
    backgroundColor: colors.bg2, 
    borderRadius: 12, 
    padding: 4,
    marginBottom: 20
  },
  tab: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center', 
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  activeTab: { backgroundColor: colors.bg3 },
  tabText: { color: colors.muted, fontWeight: '600' },
  activeTabText: { color: 'white' },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  requestCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 22.5 },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  userName: { color: 'white', fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { backgroundColor: '#22c55e' },
  declineBtn: { backgroundColor: colors.red },
  cancelBtn: { backgroundColor: colors.bg2, width: 'auto', paddingHorizontal: 15 },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: colors.muted, fontSize: 16, marginTop: 15 }
});
