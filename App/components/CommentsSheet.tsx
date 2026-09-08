import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import BottomSheet, { BottomSheetFlatList, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { colors } from '../constants/colors';
import * as Haptics from 'expo-haptics';

export const CommentsSheet = ({ post, isVisible, onClose, onAddComment }: any) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);
  const [newComment, setNewComment] = useState('');

  // Fetch Comments
  const { data: comments, isLoading, refetch } = useQuery({
    queryKey: ['comments', post?._id],
    queryFn: async () => {
      if (!post?._id) return [];
      const { data } = await api.get(`/posts/${post._id}/comments`);
      return data;
    },
    enabled: isVisible && !!post?._id,
  });

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [isVisible]);

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} disappearsAt={-1} appearsAt={0.5} />
  );

  const handleSend = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment);
    setNewComment('');
    // Optimistically refetch or wait for parent success
    setTimeout(refetch, 500);
  };

  const handleLikeComment = (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Logic for liking a comment can be added here
  };

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#111118' }}
      handleIndicatorStyle={{ backgroundColor: '#333' }}
      keyboardBehavior="extend"
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Commentaires</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
        ) : (
          <BottomSheetFlatList
            data={comments}
            keyExtractor={(item) => item._id}
            renderItem={({ item }: any) => {
              const username = item.userId?.name || item.userId?.username || 'Utilisateur';
              return (
                <View style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>{username}</Text>
                      <Text style={styles.commentTime}>{formatDistanceToNow(new Date(item.createdAt), { locale: fr })}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleLikeComment(item._id)} style={styles.commentLike}>
                    <Ionicons name="heart-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              );
            }}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={50} color="#333" />
                <Text style={styles.emptyText}>Aucun commentaire pour le moment.</Text>
                <Text style={styles.emptySubText}>Soyez le premier à donner votre avis !</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="Écrire un commentaire..."
            placeholderTextColor="#888"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity 
            onPress={handleSend} 
            style={[styles.sendBtn, !newComment.trim() && { opacity: 0.5 }]}
            disabled={!newComment.trim()}
          >
            <Ionicons name="send" size={20} color={colors.red} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222', alignItems: 'center' },
  title: { color: '#f0f0f0', fontSize: 18, fontWeight: 'bold' },
  commentItem: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  commentAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#333', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  commentContent: { flex: 1, gap: 4 },
  commentHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  commentUser: { color: '#f0f0f0', fontWeight: 'bold', fontSize: 14 },
  commentTime: { color: '#666', fontSize: 11 },
  commentText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  commentLike: { padding: 4 },
  inputSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#222', 
    backgroundColor: '#111118',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20
  },
  input: { 
    flex: 1, 
    backgroundColor: '#222', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    color: '#f0f0f0', 
    maxHeight: 100,
    fontSize: 15
  },
  sendBtn: { marginLeft: 12, padding: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#888', fontWeight: '600', fontSize: 16 },
  emptySubText: { color: '#555', fontSize: 14 },
});

