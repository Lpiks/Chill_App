import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { colors } from '../../constants/colors';
import { config } from '../../constants/config';
import api from '../../services/api';
import { FlashList } from '@shopify/flash-list';
import { PostCard } from '../../components/PostCard';
import * as Haptics from 'expo-haptics';
import { PremiumAlert } from '../../utils/PremiumAlert';

const { width } = Dimensions.get('window');

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const res = await api.get(`/users/${userId}/profile`);
      return res.data;
    }
  });

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      // Fetching posts for this specific user
      const res = await api.get(`/posts?userId=${userId}`);
      return res.data.posts;
    }
  });

  const requestMutation = useMutation({
    mutationFn: () => api.post(`/friends/request/${userId}`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['profile', userId] });
      const prevProfile = queryClient.getQueryData(['profile', userId]);

      queryClient.setQueryData(['profile', userId], (old: any) => {
        if (!old) return old;
        return { ...old, friendshipStatus: 'pending_sent' };
      });

      return { prevProfile };
    },
    onError: (err, variables, context: any) => {
      if (context?.prevProfile) {
        queryClient.setQueryData(['profile', userId], context.prevProfile);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    }
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.put(`/friends/request/${profile?.requestId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const unfriendMutation = useMutation({
    mutationFn: () => api.delete(`/friends/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  });

  if (isLoading) return (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator color={colors.red} />
    </View>
  );

  const { user, stats, friendshipStatus, coverBackdrop } = profile;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header / Backdrop */}
        <View style={styles.header}>
          {coverBackdrop ? (
            <Image 
              source={{ uri: `${config.backdropBaseUrl}${coverBackdrop}` }}
              style={styles.backdrop}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.backdrop, { backgroundColor: colors.bg2 }]} />
          )}
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.joinDate}>Membre depuis {new Date(user.createdAt).getFullYear()}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.friends}</Text>
              <Text style={styles.statLabel}>Amis</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.watched}</Text>
              <Text style={styles.statLabel}>Vus</Text>
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            {friendshipStatus === 'none' && (
              <TouchableOpacity 
                style={styles.primaryBtn}
                onPress={() => requestMutation.mutate()}
              >
                <Ionicons name="person-add" size={20} color="white" />
                <Text style={styles.primaryBtnText}>Ajouter</Text>
              </TouchableOpacity>
            )}
            {friendshipStatus === 'pending_sent' && (
              <TouchableOpacity style={[styles.primaryBtn, styles.disabledBtn]} disabled>
                <Text style={styles.primaryBtnText}>Demande envoyée</Text>
              </TouchableOpacity>
            )}
            {friendshipStatus === 'pending_received' && (
              <View style={styles.row}>
                <TouchableOpacity 
                  style={[styles.primaryBtn, styles.acceptBtn]}
                  onPress={() => acceptMutation.mutate()}
                >
                  <Text style={styles.primaryBtnText}>Accepter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, styles.declineBtn]}>
                  <Text style={styles.primaryBtnText}>Refuser</Text>
                </TouchableOpacity>
              </View>
            )}
            {friendshipStatus === 'friends' && (
              <View style={styles.row}>
                <TouchableOpacity 
                  style={[styles.primaryBtn, styles.friendsBtn]}
                  onPress={() => {
                    PremiumAlert.alert('Retirer', 'Voulez-vous retirer cet ami ?', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Retirer', style: 'destructive', onPress: () => unfriendMutation.mutate() }
                    ]);
                  }}
                >
                  <Text style={styles.friendsBtnText}>Amis ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.msgBtn}
                  onPress={() => router.push(`/dm/${userId}`)}
                >
                  <Ionicons name="chatbubble-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* User Posts */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Activités</Text>
          {loadingPosts ? (
            <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
          ) : (
            <FlashList
              data={posts}
              renderItem={({ item }) => <PostCard post={item} />}
              {...({ estimatedItemSize: 400 } as any)}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="film-outline" size={50} color={colors.bg3} />
                  <Text style={styles.emptyText}>Aucun post pour le moment</Text>
                </View>
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { height: 200, width: '100%' },
  backdrop: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileInfo: { alignItems: 'center', marginTop: -50, paddingHorizontal: 20 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: colors.bg, backgroundColor: colors.bg, overflow: 'hidden' },
  avatar: { flex: 1, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 40, fontFamily: 'BebasNeue_400Regular' },
  name: { color: 'white', fontSize: 26, fontFamily: 'Nunito_700Bold', marginTop: 15 },
  joinDate: { color: colors.muted, fontSize: 14, marginTop: 5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25, backgroundColor: colors.bg2, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 20 },
  statItem: { alignItems: 'center' },
  statValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 25 },
  actionContainer: { marginTop: 25, width: '100%' },
  primaryBtn: { backgroundColor: colors.red, height: 50, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, flex: 1 },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  disabledBtn: { backgroundColor: colors.bg3 },
  row: { flexDirection: 'row', gap: 12 },
  acceptBtn: { backgroundColor: '#22c55e' },
  declineBtn: { backgroundColor: 'rgba(255,255,255,0.1)', flex: 0.5 },
  friendsBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  friendsBtnText: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
  msgBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: colors.bg2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  postsSection: { marginTop: 40, paddingHorizontal: 20, paddingBottom: 50 },
  sectionTitle: { color: 'white', fontSize: 20, fontFamily: 'BebasNeue_400Regular', marginBottom: 20 },
  emptyState: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: colors.muted, fontSize: 14, marginTop: 10 }
});
