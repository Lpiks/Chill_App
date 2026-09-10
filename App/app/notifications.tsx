import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../constants/colors';
import api from '../services/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    }
  });

  const markReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationPress = (notif: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Navigate based on type
    switch (notif.type) {
      case 'friend_request':
        router.push('/friends/requests');
        break;
      case 'request_accepted':
        router.push(`/profile/${notif.fromUser._id}`);
        break;
      case 'post_like':
      case 'post_comment':
        // Assuming we can navigate to a single post view or the feed
        router.push('/(tabs)/feed');
        break;
      case 'watch_party_invite':
        router.push('/party');
        break;
      case 'new_message':
        router.push('/dm');
        break;
    }
  };

  const renderNotification = ({ item }: { item: any }) => {
    let iconName: any = 'notifications-outline';
    let iconColor = colors.red;

    switch (item.type) {
      case 'friend_request':
        iconName = 'person-add-outline';
        iconColor = colors.red;
        break;
      case 'request_accepted':
        iconName = 'people-outline';
        iconColor = '#22c55e';
        break;
      case 'post_like':
        iconName = 'heart-outline';
        iconColor = colors.red;
        break;
      case 'post_comment':
        iconName = 'chatbubble-outline';
        iconColor = colors.white;
        break;
      case 'system_alert':
        iconName = 'alert-circle';
        iconColor = '#FFD700'; // Gold
        break;
    }

    const isSystemAlert = item.type === 'system_alert';

    return (
      <TouchableOpacity 
        style={[
          styles.notifCard, 
          !item.read && styles.unreadCard,
          isSystemAlert && { backgroundColor: 'rgba(255, 215, 0, 0.08)', borderBottomColor: 'rgba(255, 215, 0, 0.2)' }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.avatarContainer}>
          {isSystemAlert ? (
            <View style={[styles.avatarImage, { backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="megaphone" size={24} color="#000" />
            </View>
          ) : item.fromUser.avatar === 'local_avatar1' ? (
            <Image 
              source={require('../assets/avatars/avatar1.png')} 
              style={styles.avatarImage} 
              contentFit="cover" 
            />
          ) : item.fromUser.avatar ? (
            <Image 
              source={{ uri: item.fromUser.avatar }} 
              style={styles.avatarImage} 
              contentFit="cover" 
            />
          ) : (
            <View style={[styles.avatarImage, { backgroundColor: colors.bg3, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                {item.fromUser.name ? item.fromUser.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <View style={[styles.smallIconBadge, { backgroundColor: iconColor }]}>
            <Ionicons name={iconName} size={10} color="white" />
          </View>
        </View>

        <View style={styles.notifContent}>
          <Text style={styles.notifText}>
            <Text style={styles.userName}>
              {isSystemAlert ? <Text style={{ color: '#FFD700' }}>Support</Text> : item.fromUser.name}
            </Text>
            {item.type === 'friend_request' && ' vous a envoyé une demande d\'ami'}
            {item.type === 'request_accepted' && ' a accepté votre demande d\'ami'}
            {item.type === 'post_like' && ' a aimé votre post'}
            {item.type === 'post_comment' && ' a commenté votre post'}
            {item.type === 'watch_party_invite' && ' vous a invité à une Watch Party'}
            {item.type === 'new_message' && ' vous a envoyé un message'}
            {item.type === 'system_alert' && (item.data?.message ? `: ${item.data.message}` : ' a envoyé une annonce système')}
          </Text>
          <Text style={styles.timeText}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
          </Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity 
          style={styles.markReadBtn}
          onPress={() => markReadMutation.mutate()}
        >
          <Ionicons name="checkmark-done" size={24} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
        ) : (
          <>
            <FlashList
              data={notifications}
              renderItem={renderNotification}
              // @ts-ignore - FlashList type mismatch in React 19
              estimatedItemSize={80}
              onRefresh={refetch}
              refreshing={isLoading}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off-outline" size={60} color={colors.bg3} />
                  <Text style={styles.emptyText}>Aucune notification</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
            />
          </>
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
  markReadBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg2, justifyContent: 'center', alignItems: 'center' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', fontFamily: 'Nunito_700Bold' },
  notifCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10
  },
  unreadCard: { backgroundColor: 'rgba(229, 9, 20, 0.03)' },
  avatarContainer: { width: 50, height: 50, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  smallIconBadge: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.bg },
  notifContent: { flex: 1 },
  notifText: { color: 'white', fontSize: 14, lineHeight: 20 },
  userName: { fontWeight: 'bold' },
  timeText: { color: colors.muted, fontSize: 12, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red, marginLeft: 10 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: colors.muted, fontSize: 16, marginTop: 15 }
});
