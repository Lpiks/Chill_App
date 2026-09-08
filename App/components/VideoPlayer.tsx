import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ActivityIndicator,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
  useWindowDimensions,
  Modal
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import Animated, { 
  FadeIn, 
  FadeOut, 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  withSequence,
  withDelay
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface SubtitleTrack {
  uri: string;
  language: string;
  source?: string;
  label: string;
  url: string;
}

export interface QualityOption {
  label: string;
  value: string;
}

interface VideoPlayerProps {
  streamUrl: string;
  provider?: string;
  subtitles?: SubtitleTrack[];
  qualities?: QualityOption[];
  onNext?: () => void;
  onPrev?: () => void;
  isSeries?: boolean;
  title?: string;
  onProgress?: (time: number) => void;
  isLocked?: boolean;
  isHost?: boolean;
  onPlayPause?: (isPlaying: boolean, time: number) => void;
  onSeek?: (time: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onDuration?: (duration: number) => void;
}

export const VideoPlayer = ({
  streamUrl,
  provider = 'vidlink',
  subtitles = [],
  qualities = [],
  onNext,
  onPrev,
  isSeries,
  title,
  onProgress,
  isLocked,
  isHost,
  onPlayPause,
  onSeek,
  onFullscreenChange,
  onDuration
}: VideoPlayerProps) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  
  const videoRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true); // Default to true on initial load
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleTrack | null>(null);
  const [parsedCues, setParsedCues] = useState<any[]>([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCC, setShowCC] = useState(false);
  
  // Premium Subtitle States
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [subSize, setSubSize] = useState(18); 
  const [subColor, setSubColor] = useState('white');
  const [subBg, setSubBg] = useState('rgba(0,0,0,0.6)');
  const [subPos, setSubPos] = useState(100);
  const [subDelay, setSubDelay] = useState(0); // seconds
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  // Dynamic styles are moved to StyleSheet classes

  // Group subtitles
  const groupedSubtitles = subtitles.reduce((acc, curr) => {
    if (!acc[curr.language]) acc[curr.language] = [];
    acc[curr.language].push(curr);
    return acc;
  }, {} as Record<string, SubtitleTrack[]>);

  // Auto-hide controls
  const controlsTimeout = useRef<any>(null);

  // Force screen to portrait when component is destroyed (e.g., when clicking Next Episode)
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const startControlsTimer = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    startControlsTimer();
    return () => clearTimeout(controlsTimeout.current);
  }, [startControlsTimer]);

  const toggleControls = () => {
    setShowControls(!showControls);
    if (!showControls) startControlsTimer();
  };

  const router = useRouter();

  const handleBack = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    }
    router.back();
  };

  const checkLock = () => {
    if (isLocked && !isHost) {
      Alert.alert('Action impossible', "Les contrôles sont verrouillés par l'hôte");
      return true;
    }
    return false;
  };

  const handlePlayPause = () => {
    if (checkLock()) return;
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState) {
      player.play();
    } else {
      player.pause();
    }
    if (onPlayPause) onPlayPause(nextState, currentTime);
    startControlsTimer();
  };

  const refererMap: any = {
    'vidlink': 'https://vidlink.pro/',
    'embed.su': 'https://embed.su/',
    'vidsrc.me': 'https://vidsrc.me/',
    'vidsrc.pro': 'https://vidsrc.pro/',
    'superembed.stream': 'https://superembed.stream/'
  };

  const player = useVideoPlayer({ 
    uri: streamUrl,
    metadata: {
      title: title || 'LpiksFlow Video'
    },
    // We must pass Referer headers or the streaming CDN will block us and return 00:00!
    headers: {
      'Referer': refererMap[provider] || 'https://vidlink.pro/',
      'Origin': refererMap[provider] || 'https://vidlink.pro/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  }, (p) => {
    p.loop = false;
    p.play();
  });

  // Fetch and Parse Subtitles when activeSubtitle changes
  useEffect(() => {
    if (!activeSubtitle) {
      setParsedCues([]);
      setCurrentSubtitleText(null);
      return;
    }

    // Instantly wipe memory while loading the new file
    setParsedCues([]);
    setCurrentSubtitleText(null);

    const loadSubtitles = async () => {
      try {
        const subTrack = activeSubtitle;
        if (!subTrack || !subTrack.uri) return;
        
        const response = await fetch(subTrack.uri.replace('http://', 'https://'));
        const text = await response.text();
        
        const parseTime = (timeStr: string) => {
          const parts = timeStr.split(':');
          let seconds = 0;
          if (parts.length === 3) {
            seconds = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2].replace(',', '.'));
          } else if (parts.length === 2) {
            seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1].replace(',', '.'));
          }
          return seconds || 0;
        };

        const cues: any[] = [];
        const lines = text.split('\n').map(l => l.trim());
        let currentStart = -1;
        let currentEnd = -1;
        let currentText: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.includes('-->')) {
            // Save previous
            if (currentStart !== -1 && currentText.length > 0) {
              cues.push({ start: currentStart, end: currentEnd, text: currentText.join('\n').replace(/<[^>]+>/g, '') });
            }
            
            const [startStr, endStr] = line.split(/\s*-->\s*/);
            if (startStr && endStr) {
              currentStart = parseTime(startStr);
              currentEnd = parseTime(endStr);
              currentText = [];
            }
          } else if (line !== '' && !line.match(/^[0-9]+$/) && line !== 'WEBVTT') {
            if (currentStart !== -1) {
              currentText.push(line);
            }
          }
        }
        
        // Save last
        if (currentStart !== -1 && currentText.length > 0) {
          cues.push({ start: currentStart, end: currentEnd, text: currentText.join('\n').replace(/<[^>]+>/g, '') });
        }
        
        setParsedCues(cues);
        if (cues.length === 0) {
          Alert.alert('Subtitle Error', 'The subtitle file was completely empty or parsing failed. First line: ' + text.substring(0, 50));
        }
      } catch (err: any) {
        Alert.alert('Subtitle Download Failed', err.message || 'Unknown error');
      }
    };

    loadSubtitles();
  }, [activeSubtitle]);

  useEffect(() => {
    if (!player) return;
    
    let lastTime = -1;
    let stuckCount = 0;

    // Use an interval to manually sync the clock (250ms for snappy subtitle sync)
    const interval = setInterval(() => {
      const time = player.currentTime;
      const currentDur = player.duration;

      // Smart Buffering Detection Heuristic
      if (isPlaying) {
        // If time hasn't moved and we are not at the very end of the video
        if (time === lastTime && time < currentDur - 1) {
          stuckCount++;
          if (stuckCount > 2) { // 750ms stuck = buffering
            setIsBuffering(true);
          }
        } else {
          stuckCount = 0;
          setIsBuffering(false);
        }
      } else {
        setIsBuffering(false);
      }
      
      lastTime = time;

      if (player.playing) {
        setCurrentTime(time);
        if (onProgress) onProgress(time);

        // Sync Subtitles with Delay!
        if (parsedCues.length > 0) {
          const shiftedTime = time - subDelay;
          const activeCue = parsedCues.find(c => shiftedTime >= c.start && shiftedTime <= c.end);
          setCurrentSubtitleText(activeCue ? activeCue.text : null);
        } else {
          setCurrentSubtitleText(null);
        }
      }
    }, 250);

    // Listen to status changes to get duration
    const statusSub = player.addListener('statusChange', (event) => {
      if (player.duration > 0) {
        setDuration(player.duration);
        if (onDuration) onDuration(player.duration);
      }
    });

    return () => {
      clearInterval(interval);
      statusSub.remove();
    };
  }, [player, onProgress, parsedCues, subDelay, isPlaying]);

  const handleSeek = (value: number) => {
    if (checkLock()) return;
    setIsBuffering(true); // Instantly show loader
    player.currentTime = value; // Absolute seek
    setCurrentTime(value);
    if (onSeek) onSeek(value);
    startControlsTimer();
  };

  const skipForward = () => {
    if (checkLock()) return;
    setIsBuffering(true); // Instantly show loader
    player.seekBy(10);
    const nextTime = currentTime + 10;
    if (onSeek) onSeek(nextTime);
    startControlsTimer();
  };

  const skipBackward = () => {
    if (checkLock()) return;
    setIsBuffering(true); // Instantly show loader
    player.seekBy(-10);
    const nextTime = Math.max(0, currentTime - 10);
    if (onSeek) onSeek(nextTime);
    startControlsTimer();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs > 0 ? `${hrs}:` : ''}${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      setIsFullscreen(true);
      if (onFullscreenChange) onFullscreenChange(true);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
      if (onFullscreenChange) onFullscreenChange(false);
    }
  };

  return (
    <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      <StatusBar hidden={isFullscreen} />
      
      <TouchableWithoutFeedback onPress={toggleControls} disabled={isLocked && !isHost}>
        <View style={styles.videoWrapper}>
          <VideoView
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
            player={player}
            nativeControls={false}
            allowsPictureInPicture={true}
            contentFit={contentFit}
          />

          {/* Subtitle Overlay */}
          {currentSubtitleText && !showCC && !showSubSettings && (
            <View style={[styles.subtitleOverlay, { bottom: subPos }]}>
              <Text style={[
                styles.subtitleText, 
                { fontSize: subSize, color: subColor, backgroundColor: subBg }
              ]}>{currentSubtitleText}</Text>
            </View>
          )}

          {/* Show massive loader only if controls are hidden so we don't double-render spinners */}
          {isBuffering && !showControls && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={colors.red} />
            </View>
          )}

          {/* Controls Overlay */}
          {showControls && (
            <Animated.View 
              entering={FadeIn} 
              exiting={FadeOut} 
              style={[
                styles.controlsOverlay, 
                { 
                  paddingTop: (isFullscreen ? insets.top : 0) + 10, 
                  paddingBottom: (isFullscreen ? insets.bottom : 0) + 10 
                }
              ]}
            >
              {/* Top Bar */}
              <View style={styles.topBar}>
                <TouchableOpacity onPress={handleBack}>
                  <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>
                {isLocked && <Ionicons name="lock-closed" size={20} color={colors.red} style={{ marginRight: 10 }} />}
                <TouchableOpacity onPress={() => setShowSettings(true)}>
                  <Ionicons name="settings-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {/* Center Controls */}
              <View style={[styles.centerControls, (isLocked && !isHost) && { opacity: 0.5 }]}>
                <TouchableOpacity onPress={skipBackward} style={styles.skipBtn}>
                  <MaterialIcons name="replay-10" size={40} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handlePlayPause} style={styles.playPauseBtn}>
                  {isBuffering ? (
                    <ActivityIndicator size="large" color="white" />
                  ) : (
                    <Ionicons name={isPlaying ? "pause" : "play"} size={60} color="white" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={skipForward} style={styles.skipBtn}>
                  <MaterialIcons name="forward-10" size={40} color="white" />
                </TouchableOpacity>
              </View>

              {/* Bottom Bar */}
              <View style={[styles.bottomBar, (isLocked && !isHost) && { opacity: 0.5 }]}>
                <View style={styles.progressRow}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration}
                    value={currentTime}
                    onSlidingComplete={handleSeek}
                    minimumTrackTintColor={colors.red}
                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                    thumbTintColor={colors.red}
                    disabled={isLocked && !isHost}
                  />
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => setShowCC(true)}>
                    <MaterialIcons name="closed-caption" size={28} color={activeSubtitle ? colors.red : "white"} />
                  </TouchableOpacity>
                  
                  {isSeries && duration - currentTime < 120 && onNext && (
                    <TouchableOpacity onPress={onNext} style={styles.nextEpBtn}>
                      <Text style={styles.nextEpText}>Épisode suivant</Text>
                      <Ionicons name="play-skip-forward" size={18} color="white" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity onPress={toggleFullscreen}>
                    <MaterialIcons name={isFullscreen ? "fullscreen-exit" : "fullscreen"} size={30} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Subtitles Menu */}
      <Modal visible={showCC} transparent animationType="fade" supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}>
        <View style={styles.modalOverlayFullScreen}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCC(false)} />
          <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.menuContainer, isLandscape ? [styles.menuLandscape, { paddingRight: Math.max(20, insets.right) }] : [styles.menuPortrait, { paddingBottom: Math.max(20, insets.bottom) }]]}>
            <View style={styles.menuHeaderRow}>
              {selectedLang && (
                <TouchableOpacity onPress={() => setSelectedLang(null)} style={{ marginRight: 10 }}>
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
              )}
              <Text style={styles.menuTitle}>{selectedLang ? `Sous-titres: ${selectedLang}` : 'Sous-titres'}</Text>
              <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { setShowCC(false); setShowSubSettings(true); setSelectedLang(null); }}>
                  <Ionicons name="options-outline" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowCC(false); setSelectedLang(null); }}>
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {!selectedLang && (
                <TouchableOpacity onPress={() => { setActiveSubtitle(null); setSubDelay(0); setShowCC(false); }} style={styles.menuItem}>
                  <Text style={[styles.menuText, !activeSubtitle && { color: colors.red }]}>Désactivé</Text>
                </TouchableOpacity>
              )}
              
              {!selectedLang ? (
                // Step 1: List Unique Languages
                Array.from(new Set(subtitles.map(s => s.language))).map((lang, index) => {
                  const count = subtitles.filter(s => s.language === lang).length;
                  return (
                    <TouchableOpacity key={index} onPress={() => setSelectedLang(lang)} style={styles.menuItem}>
                      <Text style={[styles.menuText, activeSubtitle?.language === lang && { color: colors.red }]}>
                        {lang.toUpperCase()} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                // Step 2: List Files for Selected Language
                subtitles.filter(s => s.language === selectedLang).map((sub, index) => (
                  <TouchableOpacity 
                    key={index} 
                    onPress={() => { setActiveSubtitle(sub); setSubDelay(0); setShowCC(false); setSelectedLang(null); }} 
                    style={styles.menuItem}
                  >
                    <Text style={[styles.menuText, activeSubtitle?.uri === sub.uri && { color: colors.red }]}>
                      Option {index + 1}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11, marginLeft: 20, marginTop: 2 }}>
                      Source: {sub.source || 'Inconnu'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* General Settings Menu */}
      <Modal visible={showSettings} transparent animationType="fade" supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}>
        <View style={styles.modalOverlayFullScreen}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowSettings(false)} />
          <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.menuContainer, isLandscape ? [styles.menuLandscape, { paddingRight: Math.max(20, insets.right) }] : [styles.menuPortrait, { paddingBottom: Math.max(20, insets.bottom) }]]}>
            <View style={styles.menuHeaderRow}>
              <Text style={styles.menuTitle}>Paramètres</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={styles.settingsLabel}>Vitesse de lecture</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.settingsRowHorizontal}>
                {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                  <TouchableOpacity 
                    key={speed} 
                    onPress={() => {
                      setPlaybackSpeed(speed);
                      player.playbackRate = speed;
                    }} 
                    style={[styles.settingBtn, playbackSpeed === speed && styles.settingBtnActive]}
                  >
                    <Text style={styles.settingBtnText}>{speed}x</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.settingsLabel}>Format de l'image</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.settingsRowHorizontal}>
                {[
                  { label: 'Original', val: 'contain' }, 
                  { label: 'Remplir', val: 'cover' }, 
                  { label: 'Étirer', val: 'fill' }
                ].map(fit => (
                  <TouchableOpacity 
                    key={fit.val} 
                    onPress={() => setContentFit(fit.val as any)} 
                    style={[styles.settingBtn, contentFit === fit.val && styles.settingBtnActive]}
                  >
                    <Text style={styles.settingBtnText}>{fit.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.settingsLabel}>Qualité vidéo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.settingsRowHorizontal}>
                <TouchableOpacity style={[styles.settingBtn, styles.settingBtnActive]}>
                  <Text style={styles.settingBtnText}>Automatique</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity style={styles.reportBtn} onPress={() => {}}>
                <Ionicons name="warning-outline" size={20} color="white" />
                <Text style={styles.reportBtnText}>Signaler un problème</Text>
              </TouchableOpacity>

            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Subtitle Settings Menu */}
      <Modal visible={showSubSettings} transparent animationType="fade" supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}>
        <View style={styles.modalOverlayFullScreen}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowSubSettings(false)} />
          <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.menuContainer, isLandscape ? [styles.menuLandscape, { paddingRight: Math.max(20, insets.right) }] : [styles.menuPortrait, { paddingBottom: Math.max(20, insets.bottom) }]]}>
            <View style={styles.menuHeaderRow}>
              <Text style={styles.menuTitle}>Style & Sync</Text>
              <TouchableOpacity onPress={() => setShowSubSettings(false)}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={styles.settingsLabel}>Délai (Synchronisation)</Text>
              <View style={[styles.settingsRowHorizontal, { alignItems: 'center' }]}>
                <TouchableOpacity onPress={() => setSubDelay(prev => prev - 0.5)} style={styles.settingBtn}>
                  <Text style={styles.settingBtnText}>-0.5s</Text>
                </TouchableOpacity>
                <Text style={styles.settingValue}>{subDelay > 0 ? `+${subDelay}` : subDelay}s</Text>
                <TouchableOpacity onPress={() => setSubDelay(prev => prev + 0.5)} style={styles.settingBtn}>
                  <Text style={styles.settingBtnText}>+0.5s</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.settingsLabel}>Taille du texte</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsRowHorizontal}>
                {[14, 18, 22, 28].map(size => (
                  <TouchableOpacity key={size} onPress={() => setSubSize(size)} style={[styles.settingBtn, subSize === size && styles.settingBtnActive]}>
                    <Text style={styles.settingBtnText}>{size === 14 ? 'Petit' : size === 18 ? 'Normal' : size === 22 ? 'Grand' : 'Max'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.settingsLabel}>Couleur</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsRowHorizontal}>
                {['white', 'yellow', 'cyan'].map(color => (
                  <TouchableOpacity key={color} onPress={() => setSubColor(color)} style={[styles.settingBtn, subColor === color && styles.settingBtnActive]}>
                    <Text style={[styles.settingBtnText, { color }]}>Aa</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.settingsLabel}>Arrière-plan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsRowHorizontal}>
                {[
                  { label: 'Vide', val: 'transparent' }, 
                  { label: 'Semi', val: 'rgba(0,0,0,0.6)' }, 
                  { label: 'Plein', val: 'black' }
                ].map(bg => (
                  <TouchableOpacity key={bg.val} onPress={() => setSubBg(bg.val)} style={[styles.settingBtn, subBg === bg.val && styles.settingBtnActive]}>
                    <Text style={styles.settingBtnText}>{bg.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.settingsLabel}>Position</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsRowHorizontal}>
                {[50, 100, 150].map(pos => (
                  <TouchableOpacity key={pos} onPress={() => setSubPos(pos)} style={[styles.settingBtn, subPos === pos && styles.settingBtnActive]}>
                    <Text style={styles.settingBtnText}>{pos === 50 ? 'Bas' : pos === 100 ? 'Milieu' : 'Haut'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 16 / 9, backgroundColor: 'black' },
  fullscreenContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, aspectRatio: undefined, flex: 1 },
  videoWrapper: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  subtitleOverlay: { position: 'absolute', bottom: 100, left: 20, right: 20, alignItems: 'center', pointerEvents: 'none', zIndex: 50 },
  subtitleText: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', textShadowColor: 'black', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  loaderOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  controlsOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 15 },
  videoTitle: { flex: 1, color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'Nunito_700Bold' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 50 },
  skipBtn: { padding: 10 },
  playPauseBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slider: { flex: 1, height: 40 },
  timeText: { color: 'white', fontSize: 12, fontFamily: 'Nunito_400Regular' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  nextEpBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.red, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  nextEpText: { color: 'white', fontWeight: 'bold' },
  modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 },
  modalOverlayFullScreen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' },
  menuContainer: { backgroundColor: 'rgba(17,17,17,0.95)', padding: 20, borderColor: '#333', overflow: 'hidden' },
  menuPortrait: { width: '95%', borderRadius: 24, maxHeight: '80%', marginBottom: 20, borderWidth: 1 },
  menuLandscape: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 350, borderLeftWidth: 1, justifyContent: 'center' },
  menuTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  menuItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#222' },
  menuText: { color: 'white', fontSize: 16 },
  menuHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingsLabel: { color: '#888', fontSize: 13, textTransform: 'uppercase', marginTop: 25, marginBottom: 10, fontWeight: 'bold' },
  settingsRowHorizontal: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  settingBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, alignItems: 'center', minWidth: 80 },
  settingBtnActive: { backgroundColor: colors.red, borderColor: colors.red, borderWidth: 1 },
  settingBtnText: { color: 'white', fontWeight: 'bold' },
  settingValue: { color: 'white', fontWeight: 'bold', width: 50, textAlign: 'center' },
  closeMenuBtn: { marginTop: 20, paddingVertical: 10 },
  closeMenuText: { color: colors.red, textAlign: 'center', fontWeight: 'bold' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  reportBtnText: { color: 'white', fontWeight: 'bold' }
});
