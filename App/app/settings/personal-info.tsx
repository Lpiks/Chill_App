import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informations personnelles</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <InfoRow label="ID Utilisateur" value={user?.id || '42091823'} />
          <InfoRow label="Nom d'utilisateur" value={user?.username || 'user'} />
          <InfoRow label="Email" value={user?.email || 'email@chill.app'} />
          <InfoRow label="Date d'inscription" value="12 Janvier 2024" />
          <InfoRow label="Statut du compte" value="Vérifié" />
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.hint}>Ces informations sont privées et ne sont jamais partagées avec d'autres utilisateurs de Chill.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  content: { padding: 20 },
  card: { backgroundColor: colors.bg2, borderRadius: 20, padding: 20, gap: 20 },
  infoRow: { gap: 4 },
  label: { color: colors.muted, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  value: { color: 'white', fontSize: 16, fontWeight: '500' },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 30, paddingHorizontal: 20, lineHeight: 20 }
});
