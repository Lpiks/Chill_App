import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../store/settingsStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, setNotification } = useSettingsStore();

  const toggle = (key: string) => {
    // @ts-ignore
    setNotification(key, !notifications[key]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const NotificationToggle = ({ label, sub, value, onToggle }: any) => (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onToggle} 
        trackColor={{ true: colors.red }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertes de contenu</Text>
          <View style={styles.card}>
            <NotificationToggle 
              label="Nouvelles sorties" 
              sub="Soyez prévenu quand un film ou une série sort."
              value={notifications.newReleases}
              onToggle={() => toggle('newReleases')}
            />
            <NotificationToggle 
              label="Watch Parties" 
              sub="Recevez une invitation quand un ami lance une séance."
              value={notifications.watchParties}
              onToggle={() => toggle('watchParties')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social & Marketing</Text>
          <View style={styles.card}>
            <NotificationToggle 
              label="Activités sociales" 
              sub="Likes, commentaires et partages sur vos avis."
              value={notifications.socialActivity}
              onToggle={() => toggle('socialActivity')}
            />
            <NotificationToggle 
              label="Offres spéciales" 
              sub="Réductions sur l'abonnement Premium."
              value={notifications.marketing}
              onToggle={() => toggle('marketing')}
            />
          </View>
        </View>
      </ScrollView>
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
  section: { marginBottom: 30 },
  sectionTitle: { color: colors.muted, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, marginLeft: 5 },
  card: { backgroundColor: colors.bg2, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  textCol: { flex: 1, paddingRight: 20 },
  label: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 18 }
});
