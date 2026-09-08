import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { tmdbService } from '../../services/tmdb';
import { config } from '../../constants/config';

const { width, height } = Dimensions.get('window');

const ITEM_WIDTH = width / 3 - 10;
const ITEM_HEIGHT = ITEM_WIDTH * 1.5;
const GAP = 10;
const TOTAL_HEIGHT = (ITEM_HEIGHT + GAP) * 4;

const PosterColumn = ({ images, reverse, duration = 30000 }: { images: string[], reverse?: boolean, duration?: number }) => {
  const translateY = useSharedValue(reverse ? -TOTAL_HEIGHT : 0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(reverse ? 0 : -TOTAL_HEIGHT, { 
        duration, 
        easing: Easing.linear 
      }),
      -1, 
      false
    );
  }, [reverse, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Duplicate for seamless infinite loop
  const displayImages = [...images, ...images];

  return (
    <Animated.View style={[styles.column, animatedStyle]}>
      {displayImages.map((img, idx) => (
        <Image 
          key={`${img}-${idx}`} 
          source={{ uri: img }} 
          style={styles.poster} 
          contentFit="cover" 
          cachePolicy="memory-disk"
        />
      ))}
    </Animated.View>
  );
};

export default function WelcomeScreen() {
  const router = useRouter();
  const [posters, setPosters] = useState<string[]>([]);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Fetch top 12 trending posters dynamically
    tmdbService.getTrending('movie').then(data => {
      const validMovies = data.filter(m => m.posterPath);
      const paths = validMovies.slice(0, 12).map(m => `${config.imageBaseUrl}${m.posterPath}`);
      setPosters(paths);
    }).catch(err => console.log('TMDB fetch error:', err));

    scale.value = withRepeat(
      withTiming(1.15, { duration: 20000, easing: Easing.inOut(Easing.ease) }),
      -1, 
      true 
    );
  }, []);

  const animatedBgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(route as any);
  };

  // If posters aren't loaded yet, just show a blank dark screen (avoids missing images)
  if (posters.length < 12) {
    return <View style={styles.container} />;
  }

  const col1 = posters.slice(0, 4);
  const col2 = posters.slice(4, 8);
  const col3 = posters.slice(8, 12);

  return (
    <View style={styles.container}>
      
      {/* 1. LAYER ONE: The Animated Grid Background */}
      <View style={styles.absoluteLayer} pointerEvents="none">
        <View style={styles.gridContainer}>
          <PosterColumn images={col1} duration={35000} />
          <PosterColumn images={col2} reverse duration={40000} />
          <PosterColumn images={col3} duration={38000} />
        </View>
      </View>

      {/* 2. LAYER TWO: The Gradient Overlay */}
      <View style={styles.absoluteLayer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(10, 10, 15, 0.4)', 'rgba(10, 10, 15, 0.9)', colors.bg]}
          locations={[0, 0.5, 0.85]}
          style={StyleSheet.absoluteFill as any}
        />
      </View>

      {/* 3. LAYER THREE: The User Interface (Guaranteed to render on top) */}
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Section */}
        <View style={styles.topSection}>
          <Text style={styles.logo}>CHILL 🍿</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.textContainer}>
            <Text style={styles.taglineAR}>تفرج، شارك، تواصل</Text>
            <Text style={styles.taglineFR}>Streaming made for Algeria</Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={() => handlePress('/(auth)/register')}
            >
              <Text style={styles.primaryBtnText}>COMMENCER</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryBtn}
              onPress={() => handlePress('/(auth)/login')}
            >
              <Text style={styles.secondaryBtnText}>J'AI DÉJÀ UN COMPTE</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0f' // Explicit dark background
  },
  absoluteLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: 5,
    opacity: 0.6,
  },
  column: {
    flex: 1,
    gap: GAP,
  },
  poster: {
    width: '100%',
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#1a1a20', // Solid placeholder color in case of slow loading
  },
  safeArea: { 
    flex: 1, 
    paddingHorizontal: 30,
    justifyContent: 'space-between',
  },
  topSection: { 
    alignItems: 'center', 
    marginTop: 40,
  },
  logo: {
    fontSize: 76,
    fontFamily: 'BebasNeue_400Regular',
    color: colors.red,
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  bottomSection: { 
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  taglineAR: {
    color: colors.white,
    fontSize: 28,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  taglineFR: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  buttonContainer: { gap: 15 },
  primaryBtn: {
    backgroundColor: colors.red,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
  },
  primaryBtnText: {
    color: colors.white,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    letterSpacing: 2,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  secondaryBtnText: {
    color: colors.white,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    letterSpacing: 2,
  },
});
