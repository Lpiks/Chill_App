import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { PostCard } from '../../components/PostCard';
import { CommentsSheet } from '../../components/CommentsSheet';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFriendStore } from '../../store/friendStore';

export default function FeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isCommentsVisible, setCommentsVisible] = useState(false);
  const { unreadNotifications, pendingReceived } = useFriendStore();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get(`/posts?page=${pageParam}&limit=10`);
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined,
    initialPageParam: 1,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreatePost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/create-post');
  };

  const handleCommentPress = (post: any) => {
    setSelectedPost(post);
    setCommentsVisible(true);
  };

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post(`/posts/${selectedPost._id}/comments`, { text });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      // We might also want to refetch the specific comments list if it was paginated
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const posts = data?.pages.flatMap(page => page.posts) || [];

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>CHILL</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconBtn}
            onPress={() => router.push('/friends/list')}
          >
            <Ionicons name="people-outline" size={26} color="white" />
            {pendingReceived.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingReceived.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconBtn}
            onPress={() => router.push('/dm')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={26} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconBtn}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={26} color="white" />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlashList
        data={posts}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            onCommentPress={handleCommentPress} 
          />
        )}
        estimatedItemSize={400}
        keyExtractor={(item) => item._id}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ margin: 20 }} color={colors.red} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color={colors.bg3} />
            <Text style={styles.emptyTitle}>Rien pour le moment</Text>
            <Text style={styles.emptySub}>Soyez le premier à partager votre avis !</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <CommentsSheet
        isVisible={isCommentsVisible}
        post={selectedPost}
        onClose={() => setCommentsVisible(false)}
        onAddComment={(text: string) => addCommentMutation.mutate(text)}
        // The CommentsSheet currently fetches comments internally or expects them as props
        // In this implementation, it seems to expect them as props but we don't have them yet
        // Let's assume for now it will be fetched inside or we can pass a query hook
      />

      {/* FAB Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: 100 }]} 
        onPress={handleCreatePost}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 12,
    backgroundColor: colors.bg 
  },
  logoContainer: { flexDirection: 'row', alignItems: 'baseline' },
  logoText: { 
    color: colors.red, 
    fontSize: 28, 
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1
  },
  logoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'white', marginLeft: 2, marginBottom: 6 },
  headerActions: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 5 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.red,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: { paddingBottom: 150 },
  fab: { 
    position: 'absolute', 
    right: 25, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: colors.red, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 5,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    zIndex: 999
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  emptySub: { color: colors.muted, fontSize: 14, marginTop: 5 }
});

