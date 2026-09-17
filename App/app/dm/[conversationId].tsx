import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { usePresenceStore } from '../../store/presenceStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from '../../services/socket';
import { useAudioRecorder, useAudioRecorderState, requestRecordingPermissionsAsync, RecordingPresets, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { io, Socket } from 'socket.io-client';
import { PremiumAlert } from '../../utils/PremiumAlert';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AudioMessageBubble = ({ url, duration }: { url: string, duration?: number }) => {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;

  const handlePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const waveData = useMemo(() => [12, 8, 15, 20, 10, 18, 14, 22, 16, 12, 8, 19, 24, 15, 10, 14, 21, 18, 12, 16, 20, 15, 10, 22, 18, 14, 12, 19, 15, 10], []);

  const totalDuration = status.duration || duration || 1;
  const progress = status.currentTime / totalDuration;

  return (
    <View style={styles.audioBubble}>
      <TouchableOpacity onPress={handlePlayPause} style={styles.audioPlayBtn}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="white" />
      </TouchableOpacity>
      <View style={styles.audioWaveform}>
        {waveData.map((val, i) => {
          const isFilled = (i / waveData.length) <= progress;
          return (
            <View 
              key={i} 
              style={[
                styles.audioWaveBar, 
                { 
                  height: val, 
                  backgroundColor: isFilled ? 'white' : 'rgba(255,255,255,0.3)' 
                }
              ]} 
            />
          );
        })}
      </View>
      <Text style={styles.audioTime}>
        {isPlaying ? formatTime(status.currentTime * 1000) : (duration ? formatTime(duration * 1000) : '0:00')}
      </Text>
    </View>
  );
};

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { isUserOnline } = usePresenceStore();
  const insets = useSafeAreaInsets();
  
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 100);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const finalDurationRef = useRef<number>(0);
  useEffect(() => {
    if (recorderState.durationMillis > 0) {
      finalDurationRef.current = recorderState.durationMillis;
    }
  }, [recorderState.durationMillis]);
  
  const flashListRef = useRef<any>(null);

  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const lastPressRef = useRef<{ [key: string]: number }>({});
  const singleTapTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const handleMessagePress = (message: any) => {
    const time = new Date().getTime();
    const delta = time - (lastPressRef.current[message._id] || 0);
    
    if (delta < 300) {
      clearTimeout(singleTapTimeoutRef.current[message._id]);
      handleReact(message._id, '❤️');
    } else {
      singleTapTimeoutRef.current[message._id] = setTimeout(() => {
        if ((message.type as any) === 'media' && message.tmdbData) {
          router.push(`/${message.tmdbData.mediaType}/${message.tmdbData.tmdbId}`);
        } else if ((message.type as any) === 'post_share' && message.sharedPost) {
          router.push(`/post/${message.sharedPost._id}`);
        }
      }, 300);
    }
    lastPressRef.current[message._id] = time;
  };

  const handleLongPress = (message: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(message);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/conversations/${conversationId}/messages/${messageId}/react`, { emoji });
      setSelectedMessage(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (messageId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.delete(`/conversations/${conversationId}/messages/${messageId}`);
      setSelectedMessage(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Queries
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/conversations`);
      return (data as Conversation[]).find(c => (c as any).id === conversationId || c._id === conversationId);
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

    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
          if (!old) return old;
          
          let replaced = false;
          const newPages = old.pages.map((page: any, pageIdx: number) => {
            if (pageIdx !== 0) return page;
            
            // Check if we already have the real message
            if (page.some((m: any) => m._id === message._id)) {
              replaced = true; 
              return page;
            }

            // Check if we have the optimistic message matching the clientId
            if ((message as any).clientId && page.some((m: any) => m._id === (message as any).clientId)) {
              replaced = true;
              return page.map((m: any) => m._id === (message as any).clientId ? message : m);
            }
            return page;
          });

          if (replaced) {
            return { ...old, pages: newPages };
          }

          return {
            ...old,
            pages: [[message, ...old.pages[0]], ...old.pages.slice(1)]
          };
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // Emit delivered event if not my message
        const isMe = ((message.senderId as any)._id || (message.senderId as any).id || message.senderId) === currentUser?.id;
        if (!isMe && socket) {
          socket.emit('message-delivered', { messageId: message._id, conversationId });
        }
        
        // Mark as read if user is active
        api.put(`/conversations/${conversationId}/read`);
      }
    };

    const handleMessageStatusUpdated = ({ messageId, status }: { messageId: string, status: string }) => {
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => 
            page.map((m: any) => 
              m._id === messageId ? { ...m, status } : m
            )
          )
        };
      });
    };

    const handleMessagesSeen = ({ conversationId: cId, userId }: { conversationId: string, userId: string }) => {
      if (userId !== currentUser?.id) {
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => 
              page.map((m: any) => 
                (((m.senderId as any)._id || (m.senderId as any).id || m.senderId) === currentUser?.id && m.status !== 'seen')
                  ? { ...m, status: 'seen' } 
                  : m
              )
            )
          };
        });
      }
    };

    const handleMessageReaction = ({ messageId, reactions }: { messageId: string, reactions: any[] }) => {
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => 
            page.map((m: any) => 
              m._id === messageId ? { ...m, reactions } : m
            )
          )
        };
      });
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => page.filter((m: any) => m._id !== messageId))
        };
      });
    };

    const handleUserTyping = ({ userId }: { userId: string }) => {
      if (userId !== currentUser?.id) {
        setTypingUsers(prev => [...new Set([...prev, userId])]);
      }
    };

    const handleUserStopTyping = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => prev.filter(id => id !== userId));
    };

    const initSocket = async () => {
      socket = await getSocket();
      socket.emit('join-conversations', [conversationId]);

      socket.on('new-message', handleNewMessage);
      socket.on('message-status-updated', handleMessageStatusUpdated);
      socket.on('messages-seen', handleMessagesSeen);
      socket.on('message-reaction', handleMessageReaction);
      socket.on('message-deleted', handleMessageDeleted);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stop-typing', handleUserStopTyping);
    };

    initSocket();
    api.put(`/conversations/${conversationId}/read`);

    return () => {
      if (socket) {
        socket.off('new-message', handleNewMessage);
        socket.off('message-status-updated', handleMessageStatusUpdated);
        socket.off('messages-seen', handleMessagesSeen);
        socket.off('message-reaction', handleMessageReaction);
        socket.off('message-deleted', handleMessageDeleted);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stop-typing', handleUserStopTyping);
      }
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    stopTyping();

    const optimisticId = Date.now().toString();
    const optimisticMessage = {
      _id: optimisticId,
      senderId: currentUser,
      type: 'text',
      content: text,
      replyTo: replyingTo,
      status: 'sending',
      createdAt: new Date().toISOString()
    };

    queryClient.setQueryData(['messages', conversationId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: [[optimisticMessage, ...old.pages[0]], ...old.pages.slice(1)]
      };
    });
    setReplyingTo(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scroll to bottom immediately
    setTimeout(() => {
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);

    try {
      const res = await api.post(`/conversations/${conversationId}/messages`, {
        type: 'text',
        content: text,
        replyTo: replyingTo?._id,
        clientId: optimisticId
      });
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old;
        const alreadyAdded = old.pages.some((page: any[]) => page.some(m => m._id === res.data._id));
        return {
          ...old,
          pages: old.pages.map((page: any, pageIdx: number) => {
            if (pageIdx !== 0) return page;
            if (alreadyAdded) return page.filter((m: any) => m._id !== optimisticId);
            return page.map((m: any) => m._id === optimisticId ? res.data : m);
          })
        };
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => page.filter((m: any) => m._id !== optimisticId))
        };
      });
      PremiumAlert.alert('Erreur', error.response?.data?.message || 'Erreur lors de l\'envoi du message');
    }
  };

  const startTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      getSocket().then(s => s.emit('typing', { conversationId, userId: (currentUser as any)?._id || currentUser?.id }));
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
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status === 'granted') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRecording(true);
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
      } else {
        PremiumAlert.alert('Erreur', 'Permission microphone refusée.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const cancelRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await audioRecorder.stop();
      setIsRecording(false);
    } catch (err) {
      console.error('Failed to cancel recording', err);
    }
  };

  const stopAndSendRecording = async () => {
    try {
      setIsRecording(false);
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      const duration = Math.floor(finalDurationRef.current / 1000) || 1;
      
      if (!uri) {
        PremiumAlert.alert('Erreur', 'L\'enregistrement n\'a pas généré de fichier audio.');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Optimistic Audio Message
      const optimisticId = Date.now().toString();
      const optimisticMessage = {
        _id: optimisticId,
        senderId: currentUser,
        type: 'voice',
        mediaUrl: uri,
        duration: duration,
        status: 'sending',
        createdAt: new Date().toISOString()
      };

      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: [[optimisticMessage, ...old.pages[0]], ...old.pages.slice(1)]
        };
      });

      const fileUri = Platform.OS === 'ios' ? uri.replace('file://', '') : (uri.startsWith('file://') ? uri : `file://${uri}`);

      const formData = new FormData();
      formData.append('audio', {
        uri: fileUri,
        type: 'audio/m4a',
        name: 'voice.m4a'
      } as any);
      formData.append('duration', duration.toString());
      formData.append('clientId', optimisticId);

      const res = await api.post(`/conversations/${conversationId}/messages/voice`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old;
        const alreadyAdded = old.pages.some((page: any[]) => page.some(m => m._id === res.data._id));
        return {
          ...old,
          pages: old.pages.map((page: any, pageIdx: number) => {
            if (pageIdx !== 0) return page;
            if (alreadyAdded) return page.filter((m: any) => m._id !== optimisticId);
            return page.map((m: any) => m._id === optimisticId ? res.data : m);
          })
        };
      });

    } catch (err) {
      console.error('Failed to stop and send recording', err);
      PremiumAlert.alert('Erreur', 'Impossible d\'envoyer le message vocal.');
    }
  };

  useEffect(() => {
    if (isRecording && recorderState.durationMillis >= 30000 && recorderState.isRecording) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      audioRecorder.stop();
    }
  }, [isRecording, recorderState.durationMillis, recorderState.isRecording]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = ((item.senderId as any)._id || (item.senderId as any).id || item.senderId) === currentUser?.id;
    
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
          (item.senderId as any).avatar ? (
            <Image source={{ uri: (item.senderId as any).avatar }} style={styles.msgAvatar} />
          ) : (
            <View style={[styles.msgAvatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{((item.senderId as any).name || 'A').charAt(0).toUpperCase()}</Text>
            </View>
          )
        )}
        <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', flex: 1, marginLeft: isMe ? 40 : 0, marginRight: isMe ? 0 : 40 }}>
          {(item as any).replyTo && (
            <View style={[styles.replyBubble, isMe ? styles.myReplyBubble : styles.otherReplyBubble]}>
              <Text style={styles.replyName}>{isMe ? 'Vous avez répondu' : `En réponse à ${(item as any).replyTo.senderId?.name}`}</Text>
              <Text style={styles.replyText} numberOfLines={1}>{(item as any).replyTo.content || 'Média'}</Text>
            </View>
          )}
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => handleMessagePress(item)}
            onLongPress={() => handleLongPress(item)}
            style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble, (item as any).replyTo ? { borderTopLeftRadius: 5, borderTopRightRadius: 5 } : {}]}
          >
          {item.type === 'text' && (
            <Text style={styles.messageText}>{item.content}</Text>
          )}
          {item.type === 'voice' && (
            <AudioMessageBubble url={(item as any).mediaUrl || item.content} duration={(item as any).duration} />
          )}
          {(item.type as any) === 'media' && item.tmdbData && (
            <View style={styles.mediaCard}>
              <Image source={{ uri: `https://image.tmdb.org/t/p/w200${item.tmdbData.posterPath}` }} style={styles.mediaPoster} />
              <View style={styles.mediaInfo}>
                <Text style={styles.mediaTitle} numberOfLines={1}>{item.tmdbData.title}</Text>
                <Text style={styles.mediaSub}>{item.tmdbData.year} • ⭐ {item.tmdbData.rating?.toFixed(1)}</Text>
                <Text style={styles.mediaLink}>
                  {item.tmdbData.mediaType === 'tv' ? 'Voir cette série' : 'Voir ce film'}
                </Text>
              </View>
            </View>
          )}
          {(item.type as any) === 'post_share' && (item as any).sharedPost && (
            <View style={styles.mediaCard}>
              <Image source={{ uri: `https://image.tmdb.org/t/p/w200${(item as any).sharedPost.posterPath}` }} style={styles.mediaPoster} />
              <View style={styles.mediaInfo}>
                <Text style={styles.mediaTitle} numberOfLines={1}>{(item as any).sharedPost.title}</Text>
                <Text style={styles.mediaSub}>{(item as any).sharedPost.year} • ⭐ {(item as any).sharedPost.rating?.toFixed(1)}</Text>
                
                <View style={styles.sharedPostUser}>
                  {((item as any).sharedPost.userId?.avatar || (item as any).sharedPost.userId?.avatarUrl) ? (
                    <Image source={{ uri: (item as any).sharedPost.userId?.avatarUrl || (item as any).sharedPost.userId?.avatar }} style={styles.sharedPostAvatar} />
                  ) : (
                    <View style={styles.sharedPostAvatarFallback}>
                      <Text style={styles.sharedPostAvatarText}>
                        {((item as any).sharedPost.userId?.name || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.sharedPostUsername} numberOfLines={1}>Avis de {(item as any).sharedPost.userId?.name}</Text>
                </View>

                <Text style={styles.mediaLink}>Voir la publication</Text>
              </View>
            </View>
          )}
          <View style={styles.bubbleFooter}>
            <Text style={styles.msgTime}>{format(new Date(item.createdAt), 'HH:mm')}</Text>
            {isMe && (
              <Ionicons 
                name={item.status === 'seen' || item.status === 'delivered' ? 'checkmark-done' : 'checkmark'} 
                size={14} 
                color={item.status === 'seen' ? colors.red : '#757575'} 
                style={{ marginLeft: 5 }}
              />
            )}
          </View>
          </TouchableOpacity>
          {(item as any).reactions && (item as any).reactions.length > 0 && (
            <View style={[styles.reactionsRow, isMe ? { right: 5 } : { left: 5 }]}>
              {(item as any).reactions.slice(0, 3).map((r: any, idx: number) => (
                <View key={idx} style={styles.reactionBadge}>
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const otherUser: any = conversation?.members?.find((m: any) => {
    const mId = (m.id || m._id || m).toString();
    const cId = (currentUser?.id || (currentUser as any)?._id)?.toString();
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
            <Text 
              style={[
                styles.status,
                typingUsers.length > 0 
                  ? { color: '#4CAF50' } 
                  : (otherUser && isUserOnline((otherUser.id || otherUser._id)?.toString())
                      ? { color: '#4CAF50' }
                      : { color: colors.red })
              ]}
            >
              {typingUsers.length > 0 
                ? 'En train d\'écrire...' 
                : (otherUser && isUserOnline((otherUser.id || otherUser._id)?.toString()) 
                    ? 'En ligne' 
                    : 'Hors ligne')}
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
          {...({ estimatedItemSize: 80 } as any)}
          inverted
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.red} /> : null}
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
        />

        {replyingTo && (
          <View style={styles.replyingBar}>
            <View style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: colors.red, paddingLeft: 10 }}>
              <Text style={styles.replyingName}>Répondre à {replyingTo.senderId?.name}</Text>
              <Text style={styles.replyingText} numberOfLines={1}>{replyingTo.content || 'Média'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 5 }}>
              <Ionicons name="close-circle" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={[
          styles.inputBar, 
          { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 10) }
        ]}>
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <TouchableOpacity style={styles.cancelRecBtn} onPress={cancelRecording}>
                <Ionicons name="trash-outline" size={24} color={colors.red} />
              </TouchableOpacity>
              
              <View style={styles.recordingCenter}>
                <View style={[styles.recDot, !recorderState.isRecording && { backgroundColor: colors.muted }]} />
                <Text style={styles.recTime}>
                  {Math.floor(recorderState.durationMillis / 1000)}s
                </Text>
              </View>

              <TouchableOpacity style={styles.sendRecBtn} onPress={stopAndSendRecording}>
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
                <TouchableOpacity style={styles.micBtn} onPress={startRecording}>
                  <Ionicons name="mic-outline" size={26} color="white" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={!!selectedMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
          <View style={styles.bottomSheet}>
            <View style={styles.reactionContainer}>
              {['❤️', '😂', '😮', '😢', '👍', '👎'].map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => handleReact(selectedMessage._id, emoji)}>
                  <Text style={styles.bigEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionList}>
              <TouchableOpacity style={styles.actionItem} onPress={() => { setReplyingTo(selectedMessage); setSelectedMessage(null); }}>
                <Ionicons name="arrow-undo-outline" size={24} color="white" />
                <Text style={styles.actionText}>Répondre</Text>
              </TouchableOpacity>
              {selectedMessage && selectedMessage.type === 'text' && (
                <TouchableOpacity style={styles.actionItem} onPress={() => { setSelectedMessage(null); PremiumAlert.alert('Info', 'Veuillez sélectionner le texte pour copier'); }}>
                  <Ionicons name="copy-outline" size={24} color="white" />
                  <Text style={styles.actionText}>Copier</Text>
                </TouchableOpacity>
              )}
              {selectedMessage && (((selectedMessage.senderId as any)._id || (selectedMessage.senderId as any).id || selectedMessage.senderId) === currentUser?.id) && (
                <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={() => handleDelete(selectedMessage._id)}>
                  <Ionicons name="trash-outline" size={24} color={colors.red} />
                  <Text style={[styles.actionText, { color: colors.red }]}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
  messageText: { color: 'white', fontSize: 16, lineHeight: 22 },
  
  replyBubble: { padding: 8, paddingBottom: 20, marginBottom: -15, backgroundColor: '#1a1a1a', borderRadius: 15, opacity: 0.8 },
  myReplyBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 0 },
  otherReplyBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 0 },
  replyName: { color: colors.red, fontSize: 12, fontWeight: 'bold' },
  replyText: { color: '#ccc', fontSize: 12, marginTop: 2 },
  
  reactionsRow: { flexDirection: 'row', marginTop: -10, zIndex: 10, backgroundColor: 'transparent' },
  reactionBadge: { backgroundColor: '#333', borderRadius: 12, padding: 3, borderWidth: 1, borderColor: 'black', marginHorizontal: -2 },
  reactionEmoji: { fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  reactionContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#222', borderRadius: 30, padding: 15, marginBottom: 20 },
  bigEmoji: { fontSize: 32 },
  actionList: { backgroundColor: '#222', borderRadius: 15 },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  actionText: { color: 'white', fontSize: 16, marginLeft: 15, fontWeight: '600' },
  
  replyingBar: { flexDirection: 'row', backgroundColor: '#111', padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333' },
  replyingName: { color: colors.red, fontSize: 12, fontWeight: 'bold' },
  replyingText: { color: 'white', fontSize: 14, marginTop: 2 },
  audioBubble: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  audioPlayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  audioWaveform: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', height: 30, gap: 3, overflow: 'hidden' },
  audioWaveBar: { width: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 },
  audioTime: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 10, minWidth: 30 },
  recordingContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, height: 40 },
  recordingCenter: { flexDirection: 'row', alignItems: 'center' },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red, marginRight: 8 },
  recTime: { color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'Nunito_700Bold' },
  cancelRecBtn: { padding: 10 },
  sendRecBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' },
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
  sharedPostUser: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  sharedPostAvatar: { width: 16, height: 16, borderRadius: 8 },
  sharedPostAvatarFallback: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' },
  sharedPostAvatarText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  sharedPostUsername: { color: 'white', fontSize: 12, flex: 1 }
});
