import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { colors } from '../../constants/colors';
import { config } from '../../constants/config';
import api from '../../services/api';

export default function WatchPartyHub() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);

  const { data: recentRooms, isLoading } = useQuery({
    queryKey: ['party-recent'],
    queryFn: async () => {
      const res = await api.get('/party/recent');
      return res.data;
    }
  });

  const handleJoin = async () => {
    if (!roomCode || roomCode.length < 6) {
      Alert.alert('Code invalide', 'Le code de la salle doit comporter 6 caractères.');
      return;
    }

    setJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const res = await api.get(`/party/rooms/${roomCode.toUpperCase()}`);
      if (res.data) {
        router.push(`/party/${roomCode.toUpperCase()}`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Salle introuvable ou expirée.');
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/party/create');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Watch Party</Text>
        </View>

        {/* Action Cards */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.createCard} 
            onPress={handleCreate}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.red, '#b91c1c']}
              style={styles.cardGradient}
            >
              <Ionicons name="add-circle-outline" size={40} color="white" />
              <Text style={styles.cardLabel}>Créer une salle</Text>
              <Text style={styles.cardSub}>Invitez vos amis à regarder ensemble</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.joinCard}>
            <Text style={styles.joinTitle}>Rejoindre une salle</Text>
            <TextInput
              style={styles.joinInput}
              placeholder="Code: #xK92mP"
              placeholderTextColor={colors.muted}
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity 
              style={[styles.joinBtn, (!roomCode || joining) && { opacity: 0.5 }]}
              onPress={handleJoin}
              disabled={!roomCode || joining}
            >
              {joining ? <ActivityIndicator color="white" /> : <Text style={styles.joinBtnText}>Rejoindre</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Rooms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes salles récentes</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
          ) : recentRooms?.length > 0 ? (
            recentRooms.map((room: any) => (
              <TouchableOpacity 
                key={room._id} 
                style={styles.recentCard}
                onPress={() => router.push(`/party/${room.roomId}`)}
              >
                <Image
                  source={{ uri: `${config.imageBaseUrl}${room.posterPath}` }}
                  style={styles.recentPoster}
                />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle} numberOfLines={1}>{room.title}</Text>
                  <Text style={styles.recentId}>#{room.roomId}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyRecent}>
              <Ionicons name="time-outline" size={40} color={colors.bg3} />
              <Text style={styles.emptyText}>Aucune salle récente</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 20 },
  header: { marginBottom: 30 },
  headerTitle: { color: 'white', fontSize: 36, fontFamily: 'BebasNeue_400Regular' },
  actionRow: { gap: 15, marginBottom: 40 },
  createCard: { height: 160, borderRadius: 20, overflow: 'hidden' },
  cardGradient: { flex: 1, padding: 20, justifyContent: 'center' },
  cardLabel: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  cardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },
  joinCard: { backgroundColor: colors.bg2, borderRadius: 20, padding: 20 },
  joinTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  joinInput: { 
    backgroundColor: colors.bg3, 
    height: 50, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 15
  },
  joinBtn: { backgroundColor: colors.red, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  joinBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  section: { marginTop: 10 },
  sectionTitle: { color: colors.muted, fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 },
  recentCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.bg2, 
    borderRadius: 15, 
    padding: 10, 
    marginBottom: 10 
  },
  recentPoster: { width: 50, height: 75, borderRadius: 8 },
  recentInfo: { flex: 1, marginLeft: 15 },
  recentTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  recentId: { color: colors.muted, fontSize: 12, marginTop: 4 },
  emptyRecent: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.muted, fontSize: 14, marginTop: 10 }
});
