import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Image } from 'expo-image';
import { colors } from '../constants/colors';
import { config } from '../constants/config';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface PostCardProps {
  post: any;
  onCommentPress?: (post: any) => void;
}

export const PostCard = ({ post, onCommentPress }: PostCardProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Optimistic Like Mutation
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await api.post(`/posts/${postId}/like`);
      return data;
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previousFeed = queryClient.getQueryData(['feed']);

      queryClient.setQueryData(['feed'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) => {
              if (p._id === postId) {
                const isLiked = p.isLiked;
                return {
                  ...p,
                  isLiked: !isLiked,
                  likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1
                };
              }
              return p;
            })
          }))
        };
      });

      return { previousFeed };
    },
    onError: (err, postId, context: any) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed'], context.previousFeed);
      }
      Alert.alert('Erreur', 'Impossible de liker ce post.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  });

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeMutation.mutate(post._id);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Regarde l'avis de ${post.user?.name || post.userId?.username} sur ${post.title} sur Cinedz !`,
        url: `https://cinedz.dz/post/${post._id}`
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Signaler',
      'Pourquoi souhaites-tu signaler cette publication ?',
      [
        { text: 'Spam', onPress: () => sendReport('spam') },
        { text: 'Harcèlement', onPress: () => sendReport('harassment') },
        { text: 'Contenu inapproprié', onPress: () => sendReport('inappropriate') },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  const sendReport = async (reason: string) => {
    try {
      await api.post(`/posts/${post._id}/report`, { reason });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Merci', 'Ton signalement a été envoyé.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le signalement.');
    }
  };

  const navigateToMedia = () => {
    router.push(`/${post.mediaType}/${post.tmdbId}`);
  };

  const navigateToProfile = () => {
    // Placeholder navigation to user profile
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // router.push(`/profile/${post.userId?._id || post.user?._id}`);
  };

  const username = post.user?.name || post.userId?.username || 'Anonyme';

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1} 
      onLongPress={handleReport}
    >
      {/* User Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userSection} onPress={navigateToProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: fr })}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreBtn} onPress={handleReport}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Movie Card */}
      <TouchableOpacity 
        style={styles.movieCard} 
        activeOpacity={0.9}
        onPress={navigateToMedia}
      >
        <Image 
          source={{ uri: `${config.imageBaseUrl}${post.posterPath}` }} 
          style={styles.poster}
          contentFit="cover"
        />
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={1}>{post.title}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons 
                key={star} 
                name={post.rating >= star ? "star" : "star-outline"} 
                size={14} 
                color={post.rating >= star ? colors.gold : colors.muted} 
              />
            ))}
            <Text style={styles.ratingText}>{post.rating}.0</Text>
          </View>
          <Text style={styles.movieMeta}>{post.year} • {post.mediaType === 'movie' ? 'Film' : 'Série'}</Text>
        </View>
      </TouchableOpacity>

      {/* Review Text */}
      {post.review && (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewText}>{post.review}</Text>
        </View>
      )}

      {/* Actions Bar */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <Ionicons 
            name={post.isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={post.isLiked ? colors.red : "white"} 
          />
          <Text style={[styles.actionLabel, post.isLiked && { color: colors.red }]}>
            {post.likesCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => onCommentPress && onCommentPress(post)}
        >
          <Ionicons name="chatbubble-outline" size={22} color="white" />
          <Text style={styles.actionLabel}>{post.commentsCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="white" />
          <Text style={styles.actionLabel}>Partager</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { 
    backgroundColor: '#111118', 
    marginHorizontal: 15, 
    marginVertical: 10, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.1)',
    overflow: 'hidden'
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  userSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: colors.red, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  username: { color: 'white', fontWeight: 'bold', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  time: { color: colors.muted, fontSize: 12 },
  moreBtn: { padding: 5 },
  movieCard: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    marginHorizontal: 15, 
    borderRadius: 12, 
    padding: 10,
    gap: 15
  },
  poster: { width: 60, height: 90, borderRadius: 8 },
  movieInfo: { flex: 1, justifyContent: 'center', gap: 5 },
  movieTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'Nunito_700Bold' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: colors.gold, fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  movieMeta: { color: colors.muted, fontSize: 13 },
  reviewContainer: { paddingHorizontal: 15, paddingVertical: 12 },
  reviewText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22, fontFamily: 'Nunito_400Regular' },
  actions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 25
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionLabel: { color: 'white', fontSize: 14, fontWeight: '600' }
});

