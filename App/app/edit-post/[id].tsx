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
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { config } from '../../constants/config';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../../utils/toast';

export default function EditPostScreen() {
  const router = useRouter();
  const { id, title, posterPath, rating: initialRating, review: initialReview } = useLocalSearchParams();
  const queryClient = useQueryClient();
  
  const [rating, setRating] = useState(initialRating ? parseInt(initialRating as string) : 0);
  const [review, setReview] = useState((initialReview as string) || '');

  const mutation = useMutation({
    mutationFn: async (postData: any) => {
      return await api.put(`/posts/${id}`, postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'Succès', 'Avis modifié avec succès.');
      router.back();
    },
    onError: () => {
      showToast('error', 'Erreur', 'Impossible de modifier l\'avis.');
    }
  });

  const handleUpdate = () => {
    if (!rating) return;
    mutation.mutate({ rating, review });
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
        <Text style={styles.headerTitle}>Modifier l'avis</Text>
        <TouchableOpacity 
          style={[styles.postBtn, (!rating || mutation.isPending) && { opacity: 0.5 }]} 
          onPress={handleUpdate}
          disabled={!rating || mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.postBtnText}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          {/* Selected Item Preview */}
          <View style={styles.previewCard}>
            <Image 
              source={{ uri: `${config.imageBaseUrl}${posterPath}` }} 
              style={styles.previewPoster}
            />
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>{title}</Text>
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
  previewCard: { flexDirection: 'row', backgroundColor: colors.bg2, borderRadius: 15, padding: 15, marginBottom: 30 },
  previewPoster: { width: 60, height: 90, borderRadius: 8 },
  previewInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
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
