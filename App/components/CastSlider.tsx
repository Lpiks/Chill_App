import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { tmdbService } from '../services/tmdb';
import { colors } from '../constants/colors';
import { config } from '../constants/config';
import { Skeleton } from './ui/Skeleton';

interface CastSliderProps {
  id: string | number;
  type: 'movie' | 'tv';
}

export const CastSlider = ({ id, type }: CastSliderProps) => {
  const router = useRouter();
  
  const { data: cast, isLoading } = useQuery({
    queryKey: ['credits', type, id],
    queryFn: () => tmdbService.getCredits(id, type),
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Acteurs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.castItem}>
              <Skeleton width={80} height={80} style={{ borderRadius: 40, marginBottom: 8 }} />
              <Skeleton width={60} height={10} style={{ marginBottom: 4 }} />
              <Skeleton width={40} height={8} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!cast || cast.length === 0) return null;

  // Take top 15 actors
  const mainCast = cast.slice(0, 15);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acteurs</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {mainCast.map((person: any) => (
          <TouchableOpacity 
            key={person.id} 
            style={styles.castItem}
            onPress={() => router.push(`/actor/${person.id}`)}
          >
            <View style={styles.imageContainer}>
              {person.profile_path ? (
                <Image
                  source={{ uri: `${config.imageBaseUrl}${person.profile_path}` }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>{person.name.charAt(0)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.name} numberOfLines={2}>{person.name}</Text>
            <Text style={styles.character} numberOfLines={1}>{person.character}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: 20,
    gap: 15,
  },
  castItem: {
    width: 80,
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bg3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  character: {
    color: colors.muted,
    fontSize: 10,
    textAlign: 'center',
  },
});
