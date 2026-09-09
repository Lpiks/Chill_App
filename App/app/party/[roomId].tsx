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
  Platform
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

import { colors } from '../../constants/colors';
import { config } from '../../constants/config';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { VideoPlayer, SubtitleTrack } from '../../components/VideoPlayer';
import { tmdbService } from '../../services/tmdb';
import { subtitlesService } from '../../services/subtitles';
import { ClientSideExtractor } from '../../components/ClientSideExtractor';

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
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  
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
  
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const isHost = room?.hostId?._id === user?.id || room?.hostId === user?.id;

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
        
        // Connect PeerJS
        peerRef.current = new Peer(user.id, {
          host: config.apiUrl.split('://')[1].split(':')[0],
          port: 9000, 
          path: '/peerjs',
          secure: config.apiUrl.startsWith('https')
        });

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
    socketRef.current.on('party-play', ({ currentTime }) => {
      // Sync playback if not the one who emitted (though host logic handled in VideoPlayer)
    });

    socketRef.current.on('party-pause', ({ currentTime }) => {
      // Sync playback
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
      Alert.alert('Fin de la Party', 'L\'hôte a terminé la salle.');
      router.replace('/party');
    });

    socketRef.current.on('party-member-joined', ({ userId, peerId }) => {
      if (localStream && peerRef.current) {
        const call = peerRef.current.call(peerId, localStream);
        call.on('stream', (remStream) => {
          setRemoteStreams(prev => ({ ...prev, [userId]: remStream }));
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      localStream?.getTracks().forEach(t => t.stop());
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
    Alert.alert(
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      {!isPlayerFullscreen && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={28} color="white" />
          </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.roomTitle}>#{roomId}</Text>
          <View style={styles.memberCount}>
            <Ionicons name="people" size={14} color={colors.muted} />
            <Text style={styles.memberText}>{room.members?.length || 1}/5</Text>
          </View>
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
            onPlayPause={(isPlaying, time) => {
              socketRef.current?.emit(isPlaying ? 'party-play' : 'party-pause', { roomId, currentTime: time });
            }}
            onSeek={(time) => {
              socketRef.current?.emit('party-seek', { roomId, currentTime: time });
            }}
            onFullscreenChange={setIsPlayerFullscreen}
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
          {/* Chat List */}
        <FlatList
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.userId === user?.id && styles.msgRowMine]}>
              <View style={[styles.msgBubble, item.userId === user?.id && styles.msgBubbleMine]}>
                <Text style={styles.msgName}>{item.name}</Text>
                <Text style={styles.msgText}>{item.text}</Text>
              </View>
            </View>
          )}
          style={styles.chatList}
          contentContainerStyle={{ padding: 15 }}
          inverted={false}
          ref={(ref) => ref?.scrollToEnd()}
        />

        {/* Camera Thumbnails */}
        <View style={styles.cameraRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
            {/* Local Feed */}
            <View style={styles.thumbnailContainer}>
              {localStream && cameraOn ? (
                <RTCView streamURL={localStream.toURL()} style={styles.thumbnail} objectFit="cover" />
              ) : (
                <View style={[styles.thumbnail, styles.cameraOff]}>
                  <Text style={styles.avatarInitial}>{user?.name?.[0]}</Text>
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

            {/* Remote Feeds */}
            {Object.keys(remoteStreams).map(peerId => (
              <View key={peerId} style={styles.thumbnailContainer}>
                <RTCView 
                  streamURL={remoteStreams[peerId].toURL()} 
                  style={styles.thumbnail} 
                  objectFit="cover" 
                />
              </View>
            ))}
          </ScrollView>
        </View>

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
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
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
  videoArea: { height: SCREEN_HEIGHT * 0.35, backgroundColor: 'black' },
  fullscreenVideoWrapper: { flex: 1, backgroundColor: 'black', zIndex: 10 },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reactionContainer: { 
    position: 'absolute', 
    top: SCREEN_HEIGHT * 0.35 + 60, 
    left: 0, 
    right: 0, 
    alignItems: 'center', 
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
  chatList: { flex: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 12 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgBubble: { backgroundColor: colors.bg2, padding: 10, borderRadius: 15, maxWidth: '80%' },
  msgBubbleMine: { backgroundColor: colors.red },
  msgName: { color: colors.muted, fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  msgText: { color: 'white', fontSize: 14 },
  cameraRow: { height: 100, marginBottom: 10 },
  thumbnailContainer: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginRight: 10, position: 'relative' },
  thumbnail: { width: 80, height: 80, backgroundColor: colors.bg3 },
  cameraOff: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  hostBadge: { position: 'absolute', top: 5, left: 0, right: 0, alignItems: 'center' },
  hostText: { backgroundColor: colors.red, color: 'white', fontSize: 8, fontWeight: 'bold', paddingHorizontal: 4, borderRadius: 4 },
  cameraControls: { 
    position: 'absolute', 
    bottom: 5, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 5 
  },
  miniBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  inputBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    backgroundColor: colors.bg2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)'
  },
  chatInput: { flex: 1, color: 'white', height: 40, borderRadius: 20, backgroundColor: colors.bg3, paddingHorizontal: 15 },
  sendBtn: { marginLeft: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' }
});
