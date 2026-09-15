import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import { colors } from '../constants/colors';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  tmdbData: {
    mediaType: 'movie' | 'tv';
    tmdbId: string | number;
    posterPath: string;
    title: string;
    year: string | number;
    rating: number;
  };
}

export const ShareModal = ({ visible, onClose, tmdbData }: ShareModalProps) => {
  const [sentTo, setSentTo] = useState<string[]>([]);
  
  // Reset sent state when modal opens for a new share
  useEffect(() => {
    if (visible) {
      setSentTo([]);
    }
  }, [visible]);

  const { data: friends, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await api.get('/friends');
      return res.data;
    },
    enabled: visible,
  });

  const handleSend = async (friendId: string) => {
    if (sentTo.includes(friendId)) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Optimistic UI update for instantaneous feel
    setSentTo(prev => [...prev, friendId]);

    try {
      // 1. Create or fetch the DM conversation
      const convRes = await api.post('/conversations', { memberIds: [friendId] });
      const conversationId = convRes.data._id || convRes.data.id;

      // 2. Send the media card message
      await api.post(`/conversations/${conversationId}/messages`, {
        type: 'media',
        content: tmdbData.mediaType === 'tv' ? 'Partage de série' : 'Partage de film',
        tmdbData: tmdbData
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sending media:', error);
      // Revert optimistic update on failure
      setSentTo(prev => prev.filter(id => id !== friendId));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Envoyer à...</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {isLoading ? (
            <ActivityIndicator color={colors.red} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.friendRow}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.friendName} numberOfLines={1}>{item.name}</Text>
                  
                  <TouchableOpacity 
                    style={[styles.sendBtn, sentTo.includes(item.id) && styles.sentBtn]}
                    onPress={() => handleSend(item.id)}
                    disabled={sentTo.includes(item.id)}
                  >
                    <Text style={[styles.sendBtnText, sentTo.includes(item.id) && styles.sentBtnText]}>
                      {sentTo.includes(item.id) ? 'Envoyé ✓' : 'Envoyer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Vous n'avez pas encore d'amis</Text>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
    maxHeight: '80%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: colors.bg2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    padding: 5,
    backgroundColor: colors.bg2,
    borderRadius: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 15,
  },
  avatarPlaceholder: {
    backgroundColor: colors.bg3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendName: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  sendBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sentBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sentBtnText: {
    color: colors.muted,
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  }
});
