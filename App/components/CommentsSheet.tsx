import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, 
  KeyboardAvoidingView, Platform, Modal, FlatList, TouchableWithoutFeedback, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { colors } from '../constants/colors';
import * as Haptics from 'expo-haptics';

export const CommentsSheet = ({ post, isVisible, onClose, onAddComment }: any) => {
  const [newComment, setNewComment] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Fetch Friends
  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data } = await api.get('/friends');
      return data;
    },
    enabled: isVisible,
  });

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

  // Detect Mentions
  React.useEffect(() => {
    if (!newComment) {
      setMentionQuery(null);
      return;
    }
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        return;
      }
    }
    setMentionQuery(null);
  }, [newComment, cursorPos]);

  // Compute Suggestions
  const suggestions = React.useMemo(() => {
    if (mentionQuery === null) return [];
    
    const userMap = new Map();
    
    comments?.forEach((c: any) => {
      if (c.userId && c.userId.name) userMap.set(c.userId._id, c.userId);
    });
    
    friends?.forEach((f: any) => {
      if (f.name) userMap.set(f._id || f.id, f);
    });
    
    const allUsers = Array.from(userMap.values());
    const query = mentionQuery.toLowerCase();
    
    return allUsers.filter(u => 
      u.name?.toLowerCase().replace(/\s+/g, '').includes(query) || 
      u.name?.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [mentionQuery, comments, friends]);

  const handleMentionSelect = (name: string) => {
    const handle = name.replace(/\s+/g, '');
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = newComment.slice(cursorPos);
    
    const newText = newComment.slice(0, lastAtIdx) + `@${handle} ` + textAfterCursor;
    setNewComment(newText);
    setMentionQuery(null);
  };

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

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior="padding"
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={styles.dragIndicator} />
            <Text style={styles.title}>Commentaires</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.red} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
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
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={50} color="#333" />
                  <Text style={styles.emptyText}>Aucun commentaire pour le moment.</Text>
                  <Text style={styles.emptySubText}>Soyez le premier à donner votre avis !</Text>
                </View>
              }
            />
          )}

          {/* Mentions Suggestions */}
          {mentionQuery !== null && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item._id}
                horizontal
                keyboardShouldPersistTaps="always"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.suggestionBadge}
                    onPress={() => handleMentionSelect(item.name)}
                  >
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar.includes('http') ? item.avatar : `http://192.168.1.18:5000/uploads/avatars/${item.avatar}` }} style={styles.suggestionAvatar} />
                    ) : (
                      <View style={[styles.suggestionAvatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{item.name?.charAt(0) || '?'}</Text>
                      </View>
                    )}
                    <Text style={styles.suggestionText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              placeholder="Écrire un commentaire..."
              placeholderTextColor="#888"
              value={newComment}
              onChangeText={setNewComment}
              onSelectionChange={(e) => setCursorPos(e.nativeEvent.selection.end)}
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetContainer: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%', // Occupies 85% of screen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  header: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#222', 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  dragIndicator: {
    position: 'absolute',
    top: 8,
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center'
  },
  title: { color: '#f0f0f0', fontSize: 18, fontWeight: 'bold' },
  closeBtn: {
    position: 'absolute',
    right: 16,
    padding: 4
  },
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
  suggestionsContainer: {
    backgroundColor: '#1a1a24',
    borderTopWidth: 1,
    borderTopColor: '#333',
    maxHeight: 60,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a36',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444'
  },
  suggestionAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8
  },
  suggestionText: {
    color: '#f0f0f0',
    fontSize: 13,
    fontWeight: '600'
  }
});
