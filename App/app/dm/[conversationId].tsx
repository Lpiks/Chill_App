import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Modal,
  Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { colors } from '../../constants/colors';
import { Message, Conversation, User } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../services/socket';
// import { Audio } from 'expo-av';
const Audio: any = {
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  setAudioModeAsync: async () => {},
  Recording: {
    createAsync: async () => ({ recording: { stopAndUnloadAsync: async () => {}, getURI: () => 'dummy_uri' } })
  },
  RecordingOptionsPresets: { HIGH_QUALITY: {} }
};
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<any | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const flashListRef = useRef<FlashList<Message>>(null);

  // Queries
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/conversations`);
      return (data as Conversation[]).find(c => c.id === conversationId || c._id === conversationId);
    },
  });

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const { 
    data: messageData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading 
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get(`/conversations/${conversationId}/messages?page=${pageParam}&limit=30`);
      return data as Message[];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.length === 30 ? allPages.length + 1 : undefined,
  });

  const messages = messageData?.pages.flat() || [];

  // Socket setup
  useEffect(() => {
    let socket: any;
    
    const initSocket = async () => {
      socket = await getSocket();
      socket.emit('join-conversations', [conversationId]);

      socket.on('new-message', (message: Message) => {
        if (message.conversationId === conversationId) {
          queryClient.setQueryData(['messages', conversationId], (old: any) => ({
            ...old,
            pages: [[message, ...old.pages[0]], ...old.pages.slice(1)]
          }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Mark as read if user is active
          api.put(`/conversations/${conversationId}/read`);
        }
      });

      socket.on('user-typing', ({ userId }: { userId: string }) => {
        if (userId !== currentUser?.id) {
          setTypingUsers(prev => [...new Set([...prev, userId])]);
        }
      });

      socket.on('user-stop-typing', ({ userId }: { userId: string }) => {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      });
    };

    initSocket();
    api.put(`/conversations/${conversationId}/read`);

    return () => {
      if (socket) {
        socket.off('new-message');
        socket.off('user-typing');
        socket.off('user-stop-typing');
      }
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    stopTyping();

    try {
      await api.post(`/conversations/${conversationId}/messages`, {
        type: 'text',
        content: text
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      if (error.response?.status === 403) {
        alert(error.response.data.message);
      }
    }
  };

  const startTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      getSocket().then(s => s.emit('typing', { conversationId, userId: currentUser?._id }));
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 3000);
  };

  const stopTyping = () => {
    setIsTyping(false);
    getSocket().then(s => s.emit('stop-typing', { conversationId, userId: currentUser?.id }));
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const duration = 0; // In a real app, calculate duration
    setRecording(null);

    if (uri) {
      const formData = new FormData();
      // @ts-ignore
      formData.append('audio', { uri, type: 'audio/m4a', name: 'voice.m4a' });
      formData.append('duration', '10'); // Mock duration

      try {
        await api.post(`/conversations/${conversationId}/messages/voice`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (e) {}
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = (item.senderId._id || item.senderId.id) === currentUser?.id;
    
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
          <Image source={{ uri: item.senderId.avatar }} style={styles.msgAvatar} />
        )}
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {item.type === 'text' && (
            <Text style={styles.messageText}>{item.content}</Text>
          )}
          {item.type === 'voice' && (
            <TouchableOpacity style={styles.voiceBubble}>
              <Ionicons name="play" size={24} color="white" />
              <View style={styles.waveformPlaceholder} />
              <Text style={styles.duration}>0:10</Text>
            </TouchableOpacity>
          )}
          {item.type === 'media' && item.tmdbData && (
            <TouchableOpacity 
              style={styles.mediaCard}
              onPress={() => router.push(`/${item.tmdbData?.mediaType}/${item.tmdbData?.tmdbId}`)}
            >
              <Image source={{ uri: `https://image.tmdb.org/t/p/w200${item.tmdbData.posterPath}` }} style={styles.mediaPoster} />
              <View style={styles.mediaInfo}>
                <Text style={styles.mediaTitle} numberOfLines={1}>{item.tmdbData.title}</Text>
                <Text style={styles.mediaSub}>{item.tmdbData.year} • ⭐ {item.tmdbData.rating?.toFixed(1)}</Text>
                <Text style={styles.mediaLink}>Voir ce film</Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.bubbleFooter}>
            <Text style={styles.msgTime}>{format(new Date(item.createdAt), 'HH:mm')}</Text>
            {isMe && (
              <Ionicons 
                name={item.status === 'seen' ? 'checkmark-done' : 'checkmark'} 
                size={14} 
                color={item.status === 'seen' ? colors.red : '#757575'} 
                style={{ marginLeft: 5 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const otherUser = conversation?.members?.find(m => {
    const mId = (m.id || m._id || m).toString();
    const cId = (currentUser?.id || currentUser?._id)?.toString();
    return mId !== cId;
  });
  
  const title = conversation?.type === 'group' 
    ? conversation.name 
    : (otherUser?.name || 'Discussion');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerTitle} onPress={() => {}}>
          {otherUser?.avatar && (
            <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
          )}
          <View>
            <Text style={styles.name}>{title || 'Chargement...'}</Text>
            <Text style={styles.status}>
              {typingUsers.length > 0 ? 'En train d\'écrire...' : 'En ligne'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <FlashList
          ref={flashListRef}
          data={messages}
          renderItem={renderMessage}
          estimatedItemSize={80}
          inverted
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.red} /> : null}
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
        />

        <View style={[
          styles.inputBar, 
          { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 10) }
        ]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#757575"
            multiline
            value={inputText}
            onChangeText={(t) => {
              setInputText(t);
              startTyping();
            }}
          />

          {inputText.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Ionicons name="send" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Ionicons name={isRecording ? "mic" : "mic-outline"} size={26} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {isRecording && (
        <View style={styles.recordingOverlay}>
          <Text style={styles.recordingText}>Enregistrement...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a28'
  },
  backBtn: { padding: 5 },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  name: { color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'Nunito' },
  status: { color: '#4CAF50', fontSize: 12 },
  headerAction: { padding: 8 },
  messageRow: { flexDirection: 'row', marginVertical: 4, maxWidth: '80%' },
  myMessageRow: { alignSelf: 'flex-end' },
  otherMessageRow: { alignSelf: 'flex-start' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8, alignSelf: 'flex-end' },
  bubble: { padding: 12, borderRadius: 18 },
  myBubble: { backgroundColor: colors.red, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#1a1a28', borderBottomLeftRadius: 4 },
  messageText: { color: 'white', fontSize: 15, lineHeight: 20 },
  bubbleFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  inputBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingTop: 10,
    backgroundColor: '#111118'
  },
  attachBtn: { padding: 8 },
  input: { 
    flex: 1, 
    backgroundColor: '#1a1a28', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 8,
    color: 'white',
    maxHeight: 100,
    marginHorizontal: 5
  },
  sendBtn: { 
    backgroundColor: colors.red, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  micBtn: { padding: 8 },
  micBtnActive: { transform: [{ scale: 1.2 }], opacity: 0.7 },
  recordingOverlay: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  recordingText: { color: 'white', fontWeight: 'bold' },
  voiceBubble: { flexDirection: 'row', alignItems: 'center', width: 150 },
  waveformPlaceholder: { flex: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 10, borderRadius: 10 },
  duration: { color: 'white', fontSize: 12 },
  mediaCard: { width: 220, backgroundColor: '#0a0a0f', borderRadius: 12, overflow: 'hidden' },
  mediaPoster: { width: '100%', height: 120 },
  mediaInfo: { padding: 10 },
  mediaTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  mediaSub: { color: '#757575', fontSize: 12, marginTop: 2 },
  mediaLink: { color: colors.red, fontSize: 12, fontWeight: 'bold', marginTop: 8 },
});
