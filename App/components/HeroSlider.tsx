import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  FlatList 
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { config } from '../constants/config';
import { Media } from '../types';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = Dimensions.get('window').height * 0.55;

interface HeroSliderProps {
  data: Media[];
  onPress: (item: Media) => void;
}

export const HeroSlider = ({ data, onPress }: HeroSliderProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const slideLimit = Math.min(data.length, 5);
    if (slideLimit === 0) return;
    
    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % slideLimit;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [activeIndex, data]);

  const onScroll = (e: any) => {
    const slide = Math.ceil(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
    if (slide !== activeIndex) setActiveIndex(slide);
  };

  const renderItem = ({ item }: { item: Media }) => (
    <TouchableOpacity 
      activeOpacity={1} 
      onPress={() => onPress(item)}
      style={{ width }}
    >
      <Image
        source={{ uri: `${config.backdropBaseUrl}${item.backdropPath}` }}
        style={styles.image}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', colors.bg]}
        style={styles.gradient}
      />
      
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        
        <View style={styles.meta}>
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={styles.ratingText}>{(item.rating || 0).toFixed(1)}</Text>
          </View>
          <Text style={styles.year}>{item.year}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.playBtn} onPress={() => onPress(item)}>
            <Ionicons name="play" size={20} color="white" />
            <Text style={styles.playText}>Regarder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listBtn}>
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.listText}>Ma Liste</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={data.slice(0, 5)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        keyExtractor={(item) => item.tmdbId.toString()}
      />
      
      <View style={styles.dots}>
        {data.slice(0, 5).map((_, i) => (
          <View 
            key={i} 
            style={[styles.dot, activeIndex === i && styles.dotActive]} 
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: HERO_HEIGHT },
  image: { width, height: HERO_HEIGHT },
  gradient: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: '70%' 
  },
  info: { 
    position: 'absolute', 
    bottom: 40, 
    left: 0, 
    right: 0, 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  title: { 
    color: colors.white, 
    fontSize: 42, 
    fontFamily: 'BebasNeue_400Regular', 
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 44
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { color: colors.gold, fontWeight: 'bold' },
  year: { color: colors.muted, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 15 },
  playBtn: { 
    backgroundColor: colors.red, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingVertical: 12, 
    borderRadius: 8,
    gap: 8
  },
  playText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  listBtn: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingVertical: 12, 
    borderRadius: 8,
    gap: 8
  },
  listText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  dots: { 
    position: 'absolute', 
    bottom: 15, 
    flexDirection: 'row', 
    width: '100%', 
    justifyContent: 'center', 
    gap: 8 
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: colors.red, width: 20 },
});
