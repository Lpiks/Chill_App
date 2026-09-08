import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { tmdbService } from '../services/tmdb';
import api from '../services/api';
import { colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { config } from '../constants/config';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function CreatePostScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  // 1. Search Logic
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setSearching(true);
      try {
        const results = await tmdbService.searchMulti(text);
        setSearchResults(results.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  // 2. Mutation to Post
  const mutation = useMutation({
    mutationFn: async (postData: any) => {
      return await api.post('/posts', postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feed']);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  });

  const handlePost = () => {
    if (!selectedMedia || !rating) return;
    
    mutation.mutate({
      tmdbId: selectedMedia.tmdbId,
      mediaType: selectedMedia.type,
      title: selectedMedia.title,
      posterPath: selectedMedia.posterPath,
      backdropPath: selectedMedia.backdropPath,
      rating,
      review,
      genres: selectedMedia.genres,
      year: parseInt(selectedMedia.year)
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle Publication</Text>
        {step === 2 ? (
          <TouchableOpacity 
            style={[styles.postBtn, (!rating || mutation.isPending) && { opacity: 0.5 }]} 
            onPress={handlePost}
            disabled={!rating || mutation.isPending}
          >
            {mutation.isPending ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.postBtnText}>Publier</Text>}
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <View>
            <Text style={styles.stepTitle}>Quel film ou série as-tu regardé ?</Text>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput 
                style={styles.input} 
                placeholder="Chercher un titre..." 
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            {searching && <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />}

            {searchResults.map((item) => (
              <TouchableOpacity 
                key={item.tmdbId} 
                style={styles.resultItem}
                onPress={() => {
                  setSelectedMedia(item);
                  setStep(2);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Image 
                  source={{ uri: `${config.imageBaseUrl}${item.posterPath}` }} 
                  style={styles.resultPoster}
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultYear}>{item.year} • {item.type === 'movie' ? 'Film' : 'Série'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View>
            {/* Selected Item Preview */}
            <View style={styles.previewCard}>
              <Image 
                source={{ uri: `${config.imageBaseUrl}${selectedMedia.posterPath}` }} 
                style={styles.previewPoster}
              />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{selectedMedia.title}</Text>
                <TouchableOpacity onPress={() => setStep(1)}>
                  <Text style={styles.changeText}>Changer</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Rating */}
            <Text style={styles.sectionTitle}>Ta Note</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => { setRating(star); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}>
                  <Ionicons 
                    name={rating >= star ? "star" : "star-outline"} 
                    size={45} 
                    color={rating >= star ? colors.gold : colors.bg3} 
                    style={{ marginHorizontal: 5 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Review */}
            <Text style={styles.sectionTitle}>Ton Avis (Optionnel)</Text>
            <TextInput 
              style={styles.reviewInput}
              placeholder="Qu'est-ce que tu en as pensé ? (max 280 chars)"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={280}
              value={review}
              onChangeText={setReview}
            />
            <Text style={styles.charCount}>{review.length}/280</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg2
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 5 },
  postBtn: { backgroundColor: colors.red, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: 'white', fontWeight: 'bold' },
  content: { padding: 20 },
  stepTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.bg2, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    height: 50,
    marginBottom: 20
  },
  input: { flex: 1, color: 'white', marginLeft: 10, fontSize: 16 },
  resultItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg2, padding: 10, borderRadius: 12, marginBottom: 10 },
  resultPoster: { width: 50, height: 75, borderRadius: 6 },
  resultInfo: { flex: 1, marginLeft: 15 },
  resultTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  resultYear: { color: colors.muted, fontSize: 14, marginTop: 4 },
  previewCard: { flexDirection: 'row', backgroundColor: colors.bg2, borderRadius: 15, padding: 15, marginBottom: 30 },
  previewPoster: { width: 60, height: 90, borderRadius: 8 },
  previewInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  changeText: { color: colors.red, marginTop: 10, fontWeight: '600' },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
  reviewInput: { 
    backgroundColor: colors.bg2, 
    borderRadius: 15, 
    padding: 15, 
    color: 'white', 
    fontSize: 16, 
    minHeight: 120, 
    textAlignVertical: 'top' 
  },
  charCount: { color: colors.muted, textAlign: 'right', marginTop: 10, fontSize: 12 }
});
