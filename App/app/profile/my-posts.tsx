import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { PostCard } from '../../components/PostCard';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import * as Haptics from 'expo-haptics';

export default function MyPostsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['my-posts'],
    queryFn: async () => {
      // Fetching general posts and filtering locally for demonstration
      const { data } = await api.get('/posts?limit=50');
      return data.posts?.filter((p: any) => p.user?._id === user?._id) || [];
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Publications</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Create Post Banner */}
      <TouchableOpacity 
        style={styles.createBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/create-post');
        }}
      >
        <View style={styles.createBtnContent}>
          <View style={styles.createIconBg}>
            <Ionicons name="pencil" size={20} color="white" />
          </View>
          <Text style={styles.createText}>Écrire un avis...</Text>
        </View>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.red} style={{ marginTop: 50 }} />
      ) : (
        <FlashList
          data={posts}
          renderItem={({ item }) => <PostCard post={item} />}
          estimatedItemSize={400}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color={colors.bg3} />
              <Text style={styles.emptyTitle}>Aucune publication</Text>
              <Text style={styles.emptySub}>Vous n'avez pas encore partagé d'avis.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  createBtn: {
    margin: 20,
    backgroundColor: colors.bg2,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  createBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  createIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center'
  },
  createText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500'
  },
  listContent: { paddingBottom: 50 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySub: { color: colors.muted, fontSize: 14, marginTop: 5 }
});
