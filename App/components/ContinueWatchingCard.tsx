import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { showToast } from '../utils/toast';
import { colors } from '../constants/colors';

export const ContinueWatchingCard = ({ item }: { item: any }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const progressPercent = item.duration > 0 ? Math.min((item.timestamp / item.duration) * 100, 100) : 0;

  const handleRemove = async () => {
    setIsModalVisible(false);
    const previousProgress = queryClient.getQueryData(['progress']);
    queryClient.setQueryData(['progress'], (old: any) => 
      old?.filter((p: any) => p._id !== item._id)
    );
    
    try {
      await api.delete(`/progress/${item._id}`);
    } catch (error) {
      queryClient.setQueryData(['progress'], previousProgress);
      showToast('error', 'Erreur', 'Impossible de retirer le titre.');
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.continueCard}
        delayLongPress={200}
        onLongPress={() => setIsModalVisible(true)}
        onPress={() => router.push({
          pathname: `/watch/${item.tmdbId}`,
          params: { 
            type: item.mediaType, 
            title: item.title, 
            posterPath: item.posterPath, 
            ...(item.mediaType === 'series' || item.mediaType === 'tv' ? { season: item.season?.toString(), episode: item.episode?.toString() } : {}) 
          }
        })}
      >
        <Image source={{ uri: `https://image.tmdb.org/t/p/w342${item.posterPath}` }} style={styles.continuePoster} contentFit="cover" transition={300} />
        <View style={styles.continueOverlay}>
          <Ionicons name="play-circle" size={40} color="white" style={styles.continuePlayBtn} />
        </View>
        
        {(item.mediaType === 'series' || item.mediaType === 'tv') && item.season && item.episode && (
          <View style={styles.continueMetaBadge}>
            <Text style={styles.continueMetaText}>S{item.season} E{item.episode}</Text>
          </View>
        )}

        {item.duration > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsModalVisible(false)}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>Retirer de la liste</Text>
            <Text style={styles.actionSheetSub}>Voulez-vous vraiment retirer {item.title} ?</Text>
            
            <TouchableOpacity style={styles.actionSheetBtnDestructive} onPress={handleRemove}>
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.actionSheetText}>Oui, Retirer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSheetCancel} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.actionSheetCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  continueCard: { width: 140, height: 210, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bg2 },
  continuePoster: { width: '100%', height: '100%' },
  continueOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  continuePlayBtn: { opacity: 0.8 },
  continueMetaBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  continueMetaText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  progressBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressBarFill: { height: '100%', backgroundColor: colors.red },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  actionSheet: {
    width: '100%',
    backgroundColor: '#1E1E24',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  actionSheetTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  actionSheetSub: { color: colors.muted, fontSize: 14, marginBottom: 25, textAlign: 'center' },
  actionSheetBtnDestructive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: colors.red,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10
  },
  actionSheetText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  actionSheetCancel: { paddingVertical: 10, width: '100%', alignItems: 'center' },
  actionSheetCancelText: { color: colors.muted, fontSize: 16, fontWeight: 'bold' }
});
