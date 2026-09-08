import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { tmdbService } from '../../services/tmdb';
import { Image } from 'expo-image';
import { colors } from '../../constants/colors';
import { config } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../../components/ui/Skeleton';
import { MediaCard } from '../../components/MediaCard';

export default function ActorDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);

  const { data: person, isLoading: loadPerson } = useQuery({
    queryKey: ['person', id],
    queryFn: () => tmdbService.getPerson(id as string),
  });

  const { data: credits, isLoading: loadCredits } = useQuery({
    queryKey: ['person-credits', id],
    queryFn: () => tmdbService.getPersonCredits(id as string),
    enabled: !!person
  });

  if (loadPerson) {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={300} style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }} />
      </View>
    );
  }

  // Deduplicate credits and sort by popularity
  const uniqueCredits = credits ? Array.from(new Map(credits.map(item => [item.tmdbId, item])).values()) : [];
  const sortedCredits = uniqueCredits.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {person?.profile_path ? (
            <Image
              source={{ uri: `${config.imageBaseUrl}${person.profile_path}` }}
              style={styles.profileImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.profileImage, styles.placeholder]}>
              <Ionicons name="person" size={80} color={colors.muted} />
            </View>
          )}
          
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.name}>{person?.name}</Text>
          <Text style={styles.knownFor}>Connu pour: {person?.known_for_department}</Text>
          
          {person?.birthday && (
            <Text style={styles.meta}>Né(e) le: {person.birthday} {person.place_of_birth ? `(${person.place_of_birth})` : ''}</Text>
          )}

          {person?.biography ? (
            <View style={styles.bioContainer}>
              <Text style={styles.sectionTitle}>Biographie</Text>
              <Text 
                style={styles.bioText} 
                numberOfLines={bioExpanded ? undefined : 4}
              >
                {person.biography}
              </Text>
              <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                <Text style={styles.expandText}>
                  {bioExpanded ? 'Voir moins' : 'Voir plus'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Filmography */}
        <View style={styles.filmographySection}>
          <Text style={styles.sectionTitle}>Filmographie</Text>
          {loadCredits ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ marginRight: 15 }}><Skeleton width={110} height={165} style={{ borderRadius: 8 }} /></View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid}>
              {sortedCredits.map((media, index) => (
                <MediaCard
                  key={`${media.tmdbId}-${index}`}
                  item={media}
                  showType
                  onPress={() => router.push(`/${media.type === 'tv' ? 'tv' : 'movie'}/${media.tmdbId}`)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    height: 400,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  placeholder: {
    backgroundColor: colors.bg2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
  },
  infoSection: {
    padding: 20,
  },
  name: {
    color: colors.white,
    fontSize: 32,
    fontFamily: 'BebasNeue_400Regular',
    marginBottom: 4,
  },
  knownFor: {
    color: colors.red,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 20,
  },
  bioContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    marginBottom: 10,
  },
  bioText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  expandText: {
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 14,
  },
  filmographySection: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 50,
  },
  grid: {
    paddingRight: 20,
  }
});
