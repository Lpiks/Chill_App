import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { mediaDevices, RTCView, MediaStream } from 'react-native-webrtc';
import Peer from 'peerjs';
import io, { Socket } from 'socket.io-client';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { colors } from '../../constants/colors';
import { config } from '../../constants/config';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { VideoPlayer, SubtitleTrack } from '../../components/VideoPlayer';
import { ChangeMediaModal } from '../../components/ChangeMediaModal';
import { tmdbService } from '../../services/tmdb';
import { subtitlesService } from '../../services/subtitles';
import { ClientSideExtractor } from '../../components/ClientSideExtractor';
import { PremiumAlert } from '../../utils/PremiumAlert';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const REACTIONS = ['😀', '😂', '😱', '❤️', '👏', '🔥'];

// Floating Emoji Component
const FloatingEmoji = ({ emoji, onComplete }: { emoji: string, onComplete: () => void }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue((Math.random() - 0.5) * 100);

  useEffect(() => {
    translateY.value = withTiming(-400, { duration: 2000, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 2000 }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }] as any,
    opacity: opacity.value,
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    zIndex: 100
  }));

  return (
    <Animated.Text style={[animatedStyle, { fontSize: 40 }]}>
      {emoji}
    </Animated.Text>
  );
};

export default function WatchPartyRoom() {
  const { roomId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [reactions, setReactions] = useState<any[]>([]);
  const [streamUrl, setStreamUrl] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [playbackState, setPlaybackState] = useState<{ isPlaying: boolean; currentTime: number; updatedAt: Date } | null>(null);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const [showChangeMediaModal, setShowChangeMediaModal] = useState(false);
  
  // Extractor & Subtitles State
  const [provider, setProvider] = useState('vidlink'); 
  const [isExtracting, setIsExtracting] = useState(true);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [vidlinkSubtitles, setVidlinkSubtitles] = useState<SubtitleTrack[]>([]);
  const [allSubtitles, setAllSubtitles] = useState<SubtitleTrack[]>([]);
  
  // WebRTC & Peer States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [key: string]: MediaStream }>({});
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showFsChat, setShowFsChat] = useState(false);
  const [showFsEmojis, setShowFsEmojis] = useState(false);
  const [latestMessage, setLatestMessage] = useState<any>(null);

  // Toast logic for fullscreen
  useEffect(() => {
    if (messages.length > 0 && isPlayerFullscreen && !showFsChat) {
      setLatestMessage(messages[messages.length - 1]);
      const timer = setTimeout(() => {
        setLatestMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [messages, isPlayerFullscreen, showFsChat]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<any>(null);
  
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Helper to generate a consistent color per user
  const getColorForUser = (id: string) => {
    if (!id) return '#ffffff';
    const colors = ['#E50914', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getHostIdStr = (hostId: any) => {
    if (!hostId) return null;
    if (typeof hostId === 'string') return hostId;
    if (hostId._id) return hostId._id.toString();
    if (hostId.toString) return hostId.toString();
    return String(hostId);
  };
  
  const isHost = getHostIdStr(room?.hostId) === user?.id;

  // Initial Room Data
  const { data: roomDataRaw, isLoading } = useQuery({
    queryKey: ['party-room', roomId],
    queryFn: async () => {
      const res = await api.get(`/party/rooms/${roomId}`);
      return res.data;
    }
  });
  
  const roomData = roomDataRaw as any;

  useEffect(() => {
    if (roomData) {
      setRoom(roomData);
      setIsLocked(roomData.isLocked);
      if (roomData.messages && roomData.messages.length > 0) {
        setMessages(roomData.messages);
      }
    }
  }, [roomData]);

  // Subtitles & Extractor Logic
  const { data: tmdbDetails } = useQuery({
    queryKey: ['details', roomData?.tmdbId, roomData?.mediaType],
    queryFn: async () => {
      if (roomData?.mediaType === 'movie') return await tmdbService.getMovieDetail(roomData.tmdbId.toString());
      return await tmdbService.getSeriesDetail(roomData.tmdbId.toString());
    },
    enabled: !!roomData
  });

  const imdbId = tmdbDetails?.imdb_id || tmdbDetails?.external_ids?.imdb_id;
  const { data: stremioSubtitles } = useQuery({
    queryKey: ['stremio_subs', imdbId, roomData?.season, roomData?.episode],
    queryFn: async () => {
      if (!imdbId) return [];
      return await subtitlesService.getStremioSubtitles(imdbId, roomData?.mediaType, roomData?.season?.toString(), roomData?.episode?.toString());
    },
    enabled: !!imdbId
  });

  // Safely merge subtitles using an effect to guarantee React state updates
  useEffect(() => {
    setAllSubtitles([...vidlinkSubtitles, ...(stremioSubtitles || [])]);
  }, [vidlinkSubtitles, stremioSubtitles]);

  const handleExtractionSuccess = (url: string) => {
    setStreamUrl(url);
    setIsExtracting(false);
  };

  const handleExtractionError = () => {
    setExtractionFailed(true);
    setIsExtracting(false);
  };

  const handleSubtitlesExtracted = (subs: any[]) => {
    if (subs && subs.length > 0) {
      setVidlinkSubtitles(subs as SubtitleTrack[]);
    }
  };

  // Setup Socket & PeerJS
  useEffect(() => {
    if (!user || !roomId) return;

    // Connect Socket
    socketRef.current = io(config.apiUrl.replace('/api', ''));
    
    // IMMEDIATELY join the socket room so text/emojis work instantly!
    socketRef.current.emit('party-join', { roomId, userId: user.id || (user as any)._id, peerId: null });
    
    // Setup Local Media
    const setupMedia = async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true
        }) as MediaStream;
        setLocalStream(stream);
        localStreamRef.current = stream;
        
        // Connect PeerJS
        // Uses the free public PeerJS cloud server (0.peerjs.com)
        peerRef.current = new Peer(user.id || (user as any)._id);

        peerRef.current.on('open', (peerId) => {
          // Update the room with our PeerJS video ID when ready
          socketRef.current?.emit('party-join', { roomId, userId: user.id || (user as any)._id, peerId });
        });

        peerRef.current.on('call', (call) => {
          call.answer(stream);
          call.on('stream', (remStream) => {
            setRemoteStreams(prev => ({ ...prev, [call.peer]: remStream }));
          });
        });
      } catch (err) {
        console.error('Media setup error', err);
      }
    };

    setupMedia();

    // Socket Listeners
    socketRef.current.on('party-media-changed', (updatedRoom) => {
      // Instantly switch media!
      setRoom(updatedRoom);
      setPlaybackState(null); // Reset sync state so it doesn't try to seek the new media immediately
    });

    socketRef.current.on('party-sync-state', (state) => {
      setPlaybackState(state);
    });

    socketRef.current.on('party-play', ({ currentTime }) => {
      setPlaybackState({ isPlaying: true, currentTime, updatedAt: new Date() });
    });

    socketRef.current.on('party-pause', ({ currentTime }) => {
      setPlaybackState({ isPlaying: false, currentTime, updatedAt: new Date() });
    });

    socketRef.current.on('party-seek', ({ currentTime }) => {
      setPlaybackState(prev => ({ isPlaying: prev ? prev.isPlaying : true, currentTime, updatedAt: new Date() }));
    });

    socketRef.current.on('party-lock', ({ isLocked }) => {
      setIsLocked(isLocked);
    });

    socketRef.current.on('party-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('party-reaction', (reaction) => {
      setReactions(prev => [...prev, { ...reaction, id: Date.now() }]);
    });

    socketRef.current.on('party-ended', () => {
      PremiumAlert.alert('Fin de la Party', 'L\'hôte a terminé la salle.');
      router.replace('/party');
    });

    socketRef.current.on('party-member-joined', ({ userId, peerId }) => {
      // Use localStreamRef to avoid stale closure bugs!
      const currentStream = localStreamRef.current;
      if (currentStream && peerRef.current) {
        const call = peerRef.current.call(peerId, currentStream);
        call.on('stream', (remStream) => {
          setRemoteStreams(prev => ({ ...prev, [userId]: remStream }));
        });
      }
    });

    // Handle Socket Reconnections (e.g. after phone sleeps)
    socketRef.current.on('connect', () => {
      socketRef.current?.emit('party-join', { roomId, userId: user.id || (user as any)._id, peerId: peerRef.current?.id || null });
    });

    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [roomId, user?.id]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const msg = {
      userId: user?.id,
      name: user?.name,
      text: inputText,
      time: new Date()
    };
    socketRef.current?.emit('party-message', { roomId, message: msg });
    setInputText('');
  };

  const sendReaction = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    socketRef.current?.emit('party-reaction', { roomId, emoji, userId: user?.id });
  };

  const toggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    socketRef.current?.emit('party-lock', { roomId, isLocked: nextLocked });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach(track => track.enabled = !cameraOn);
    setCameraOn(!cameraOn);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach(track => track.enabled = !micOn);
    setMicOn(!micOn);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEndRoom = () => {
    PremiumAlert.alert(
      'Terminer la salle ?',
      'Tous les membres seront déconnectés.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Terminer', 
          style: 'destructive', 
          onPress: async () => {
            await api.delete(`/party/rooms/${roomId}`);
            router.replace('/party');
          } 
        }
      ]
    );
  };

  if (isLoading || !room) return (
    <View style={[styles.container, { justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={colors.red} />
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior="padding"
    >
      {/* Header */}
      {!isPlayerFullscreen && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (isHost) handleEndRoom();
            else router.back();
          }}>
            <Ionicons name="chevron-down" size={28} color="white" />
          </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.roomTitle}>#{roomId}</Text>
          <TouchableOpacity 
            style={styles.memberCount} 
            onPress={() => setShowMembersModal(true)}
          >
            <Ionicons name="people" size={14} color={colors.muted} />
            <Text style={styles.memberText}>{room.members?.length || 1}/5</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {isHost && (
            <TouchableOpacity onPress={toggleLock} style={styles.lockBtn}>
              <Ionicons name={isLocked ? "lock-closed" : "lock-open"} size={20} color="white" />
            </TouchableOpacity>
          )}
          {isHost ? (
            <TouchableOpacity onPress={handleEndRoom} style={styles.endBtn}>
              <Text style={styles.endBtnText}>Fin</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.leaveBtn}>
              <Text style={styles.leaveBtnText}>Quitter</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      )}

      {/* Video Area */}
      <View style={isPlayerFullscreen ? styles.fullscreenVideoWrapper : styles.videoArea}>
        {isExtracting && !streamUrl && roomData && (
          <ClientSideExtractor
            tmdbId={roomData.tmdbId.toString()}
            type={roomData.mediaType}
            season={roomData.season?.toString()}
            episode={roomData.episode?.toString()}
            provider={provider}
            onSuccess={handleExtractionSuccess}
            onError={handleExtractionError}
            onSubtitlesExtracted={handleSubtitlesExtracted}
          />
        )}
        
        {streamUrl ? (
          <VideoPlayer 
            streamUrl={streamUrl} 
            provider={provider}
            subtitles={allSubtitles}
            isSeries={room.mediaType === 'tv'}
            title={room.mediaType === 'tv' ? `${room.title} S${room.season} E${room.episode}` : room.title}
            isLocked={isLocked}
            isHost={isHost}
            externalPlaybackState={playbackState}
            onPlayPause={(isPlaying, time) => {
              socketRef.current?.emit(isPlaying ? 'party-play' : 'party-pause', { roomId, currentTime: time, userId: user?.id || (user as any)._id });
            }}
            onSeek={(time) => {
              socketRef.current?.emit('party-seek', { roomId, currentTime: time, userId: user?.id || (user as any)._id });
            }}
            onFullscreenChange={setIsPlayerFullscreen}
            onBack={() => {
              if (isHost) {
                handleEndRoom(); // Host gets the 'End Room' warning
              } else {
                router.back(); // Guests just leave
              }
            }}
            onChangeMedia={() => setShowChangeMediaModal(true)}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            {extractionFailed ? (
              <Text style={{ color: colors.red, fontWeight: 'bold' }}>Flux introuvable. Réessayez.</Text>
            ) : (
              <ActivityIndicator color={colors.red} />
            )}
          </View>
        )}

        {/* --- FULLSCREEN OVERLAYS --- */}
        {isPlayerFullscreen && (
          <>
            {/* Right-Edge Controls */}
            <View style={styles.fsRightControls}>
              {showFsEmojis && (
                <View style={styles.fsEmojiPill}>
                  {REACTIONS.map(emoji => (
                    <TouchableOpacity key={emoji} onPress={() => { sendReaction(emoji); setShowFsEmojis(false); }}>
                      <Text style={styles.fsEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              <TouchableOpacity style={styles.fsControlBtn} onPress={() => setShowFsEmojis(!showFsEmojis)}>
                <Ionicons name="happy-outline" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.fsControlBtn} onPress={() => setShowFsChat(!showFsChat)}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Chat Toast (when closed) */}
            {!showFsChat && latestMessage && (
              <View style={styles.fsToast}>
                <Text style={styles.fsToastName}>{latestMessage.name}</Text>
                <Text style={styles.fsToastText} numberOfLines={2}>{latestMessage.text}</Text>
              </View>
            )}

            {/* Transparent Chat Drawer */}
            {showFsChat && (
              <View style={styles.fsChatDrawer}>
                <FlatList
                  data={messages}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.fsMsgRow}>
                      <Text style={[styles.fsMsgName, { color: getColorForUser(item.userId) }]}>{item.name}</Text>
                      <Text style={styles.fsMsgText}>{item.text}</Text>
                    </View>
                  )}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                />
                <View style={styles.fsInputContainer}>
                  <TextInput
                    style={styles.fsInput}
                    placeholder="Message..."
                    placeholderTextColor="#999"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                  />
                  <TouchableOpacity onPress={sendMessage} style={styles.fsSendBtn}>
                    <Ionicons name="send" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* Reaction Bar */}
      {!isPlayerFullscreen && (
        <View style={styles.reactionContainer}>
          <View style={styles.reactionPill}>
            {REACTIONS.map(emoji => (
              <TouchableOpacity key={emoji} onPress={() => sendReaction(emoji)}>
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Main Bottom Section */}
      {!isPlayerFullscreen && (
        <View style={styles.bottomSection}>
          <View style={styles.splitContainer}>
            
            {/* Left Side: Cameras List (Hidden when keyboard is open) */}
            {!keyboardVisible && (
              <View style={styles.leftColumn}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cameraGrid}>
                {/* Local Feed */}
                <View style={[styles.thumbnailContainer, { borderColor: getColorForUser(user?.id || (user as any)?._id), borderWidth: 2 }]}>
                  {localStream && cameraOn ? (
                    <RTCView 
                      streamURL={localStream.toURL()} 
                      style={styles.thumbnail} 
                      objectFit="cover" 
                    />
                  ) : (
                    <View style={[styles.thumbnail, styles.cameraOff]}>
                      <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.hostBadge}><Text style={styles.hostText}>VOUS</Text></View>
                  <View style={styles.cameraControls}>
                    <TouchableOpacity onPress={toggleMic} style={styles.miniBtn}>
                      <Ionicons name={micOn ? "mic" : "mic-off"} size={12} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleCamera} style={styles.miniBtn}>
                      <Ionicons name={cameraOn ? "videocam" : "videocam-off"} size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                {Object.keys(remoteStreams).map(peerId => (
                  <View key={peerId} style={styles.thumbnailContainer}>
                    <RTCView 
                      streamURL={remoteStreams[peerId].toURL()} 
                      style={[styles.thumbnail, { borderColor: getColorForUser(peerId), borderWidth: 2 }]} 
                      objectFit="cover" 
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
            )}

            {/* Right Side: Chat Area */}
            <View style={[styles.rightColumn, keyboardVisible && { width: '100%' }]}>
              <FlatList
                data={messages}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={[styles.msgRow, item.userId === user?.id && styles.msgRowMine]}>
                    <View style={[styles.msgBubble, item.userId === user?.id && styles.msgBubbleMine]}>
                      <Text style={[styles.msgName, { color: getColorForUser(item.userId) }]}>{item.name}</Text>
                      <Text style={styles.msgText}>{item.text}</Text>
                    </View>
                  </View>
                )}
                style={styles.chatList}
                contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
                inverted={false}
                ref={(ref) => ref?.scrollToEnd({ animated: true })}
              />

              {/* Input Bar */}
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Message..."
                  placeholderTextColor={colors.muted}
                  value={inputText}
                  onChangeText={setInputText}
                />
                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                  <Ionicons name="send" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Floating Reactions */}
      {reactions.map(r => (
        <FloatingEmoji 
          key={r.id} 
          emoji={r.emoji} 
          onComplete={() => setReactions(prev => prev.filter(x => x.id !== r.id))} 
        />
      ))}

      {/* Change Media Popup (Host Only) */}
      <ChangeMediaModal 
        visible={showChangeMediaModal}
        currentRoom={room}
        onClose={() => setShowChangeMediaModal(false)}
        onConfirm={(newMedia) => {
          socketRef.current?.emit('party-change-media', { roomId, ...newMedia });
          setShowChangeMediaModal(false);
        }}
      />

      {/* Members Modal */}
      <Modal visible={showMembersModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMembersModal(false)}>
          <View style={styles.membersModal}>
            <Text style={styles.modalTitle}>Membres de la Party ({room?.members?.length || 1}/5)</Text>
            {room?.members?.map((m: any, i: number) => {
              const u = m.userId || {};
              const idStr = getHostIdStr(u);
              return (
                <View key={i} style={styles.memberRow}>
                  <View style={[styles.memberDot, { backgroundColor: getColorForUser(idStr) }]} />
                  <Text style={styles.memberName}>{u.name || 'Invité'}</Text>
                  {idStr === getHostIdStr(room.hostId) && (
                    <Text style={styles.hostBadgeText}>(Hôte)</Text>
                  )}
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingTop: 50, 
    paddingBottom: 10 
  },
  headerCenter: { alignItems: 'center' },
  roomTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  memberCount: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  memberText: { color: colors.muted, fontSize: 12, fontWeight: 'bold' },
  lockBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg3, justifyContent: 'center', alignItems: 'center' },
  endBtn: { backgroundColor: colors.red, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  endBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  leaveBtn: { borderWidth: 1, borderColor: colors.muted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  leaveBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  videoArea: { width: '100%', aspectRatio: 16/9, backgroundColor: 'black' },
  fullscreenVideoWrapper: { flex: 1, backgroundColor: 'black', zIndex: 10 },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reactionContainer: { 
    alignItems: 'center', 
    paddingVertical: 10,
    zIndex: 10 
  },
  reactionPill: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(21, 21, 27, 0.9)', 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 25, 
    gap: 15 
  },
  emoji: { fontSize: 24 },
  bottomSection: { flex: 1, marginTop: 10 },
  splitContainer: { flex: 1, flexDirection: 'row' },
  leftColumn: { width: '38%', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)', padding: 5 },
  rightColumn: { width: '62%', flex: 1 },
  chatList: { flex: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 10 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgBubble: { backgroundColor: colors.bg2, padding: 10, borderRadius: 15, maxWidth: '90%' },
  msgBubbleMine: { backgroundColor: colors.red },
  msgName: { color: colors.muted, fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  msgText: { color: 'white', fontSize: 13 },
  cameraGrid: { alignItems: 'center', gap: 15, paddingVertical: 10 },
  thumbnailContainer: { width: 95, height: 95, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: 95, height: 95, backgroundColor: colors.bg3 },
  cameraOff: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  hostBadge: { position: 'absolute', top: 3, left: 0, right: 0, alignItems: 'center' },
  hostText: { backgroundColor: colors.red, color: 'white', fontSize: 7, fontWeight: 'bold', paddingHorizontal: 4, borderRadius: 4 },
  cameraControls: { 
    position: 'absolute', 
    bottom: 3, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 3 
  },
  miniBtn: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  inputBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 10, 
    backgroundColor: colors.bg2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)'
  },
  chatInput: { flex: 1, color: 'white', height: 36, borderRadius: 18, backgroundColor: colors.bg3, paddingHorizontal: 12, fontSize: 13 },
  sendBtn: { marginLeft: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' },
  
  /* Fullscreen Overlays Styles */
  fsRightControls: {
    position: 'absolute',
    right: 40,
    top: '30%',
    alignItems: 'center',
    gap: 15,
    zIndex: 1001,
  },
  fsControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  fsEmojiPill: {
    position: 'absolute',
    right: 55,
    top: -5,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 15,
  },
  fsEmoji: { fontSize: 24 },
  fsToast: {
    position: 'absolute',
    left: 40,
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 12,
    maxWidth: '40%',
    zIndex: 1001,
  },
  fsToastName: { color: colors.red, fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  fsToastText: { color: 'white', fontSize: 13 },
  fsChatDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1001,
  },
  fsMsgRow: { marginBottom: 8 },
  fsMsgName: { color: colors.muted, fontSize: 11, fontWeight: 'bold' },
  fsMsgText: { color: 'white', fontSize: 13 },
  fsInputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)'
  },
  fsInput: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingHorizontal: 15,
    color: 'white',
    fontSize: 13,
  },
  fsSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  membersModal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 350,
  },
  modalTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: 'white',
    marginBottom: 15,
    textAlign: 'center'
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  memberDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12
  },
  memberName: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: 'white',
    flex: 1
  },
  hostBadgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.red
  }
});
