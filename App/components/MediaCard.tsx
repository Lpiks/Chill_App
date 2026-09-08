import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  View, 
  Alert 
} from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../constants/colors';
import { config } from '../constants/config';
import * as Haptics from 'expo-haptics';
import { Media } from '../types';

interface MediaCardProps {
  item: Media;
  onPress: () => void;
  showType?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MediaCard = ({ item, onPress, showType, size = 'md' }: MediaCardProps) => {
  const width = size === 'sm' ? 80 : size === 'md' ? 110 : 150;
  const height = width * 1.5;

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      item.title,
      'Actions rapides',
      [
        { text: '＋ Ma Liste', onPress: () => console.log('Add to list') },
        { text: 'Partager', onPress: () => console.log('Share') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { width }]} 
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: `${config.imageBaseUrl}${item.posterPath}` }}
        style={[styles.poster, { height }]}
        contentFit="cover"
        transition={300}
      />
      {showType && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.type === 'movie' ? 'Film' : 'Série'}
          </Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { marginRight: 12 },
  poster: {
    borderRadius: 8,
    backgroundColor: colors.bg3,
  },
  title: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    marginTop: 6,
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  }
});
