import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { PremiumAlert } from '../../utils/PremiumAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const { user, logout, isBiometricEnabled, setBiometric } = useAuthStore();
  const { language } = useSettingsStore();
  const router = useRouter();

  // Mock data for the "Pro" look
  const stats = [
    { label: 'Avis', value: '12', icon: 'chatbubble-ellipses-outline' },
    { label: 'Vues', value: '48', icon: 'eye-outline' },
    { label: 'Amis', value: '24', icon: 'people-outline' },
  ];

  const handleClearCache = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Image.clearDiskCache();
      await Image.clearMemoryCache();
      await AsyncStorage.clear();
      PremiumAlert.alert('Succès', 'Le cache de l\'application a été vidé avec succès.');
    } catch (e) {
      PremiumAlert.alert('Erreur', 'Impossible de vider le cache.');
    }
  };

  const toggleBiometry = async (value: boolean) => {
    await setBiometric(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogout = () => {
    PremiumAlert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { 
        text: 'Déconnexion', 
        style: 'destructive', 
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
          router.replace('/(auth)/welcome');
        } 
      },
    ]);
  };

  const SettingItem = ({ icon, label, value, type = 'chevron', onPress, color = 'white' }: any) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={() => {
        if (type === 'switch') {
          onPress(!value);
        } else if (onPress) {
          onPress();
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }} 
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.settingLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && type === 'chevron' && <Text style={styles.settingValue}>{value}</Text>}
        {type === 'chevron' && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
        {type === 'switch' && (
          <View pointerEvents="none">
            <Switch value={value} trackColor={{ true: colors.red }} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
              </View>
            )}
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="black" />
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          </View>
          <Text style={styles.username}>{user?.name || 'Utilisateur'}</Text>
          <Text style={styles.email}>{user?.email || 'email@chill.app'}</Text>
          
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings/edit-profile');
            }}
          >
            <Text style={styles.editBtnText}>Modifier le profil</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Ionicons name={stat.icon as any} size={20} color={colors.red} />
              <Text style={stat.value.includes(' ') ? styles.statValueSmall : styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* My Posts Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.myPostsBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/profile/my-posts');
            }}
          >
            <View style={styles.myPostsLeft}>
              <View style={styles.myPostsIconBg}>
                <Ionicons name="images-outline" size={20} color="white" />
              </View>
              <Text style={styles.myPostsText}>Mes Publications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <View style={styles.sectionCard}>
            <SettingItem 
              icon="person-outline" 
              label="Informations personnelles" 
              onPress={() => router.push('/settings/personal-info')} 
            />
            <SettingItem 
              icon="card-outline" 
              label="Abonnement" 
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} 
            />
            <SettingItem 
              icon="notifications-outline" 
              label="Notifications" 
              onPress={() => router.push('/settings/notifications')} 
            />
          </View>
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <View style={styles.sectionCard}>
            <SettingItem 
              icon="finger-print-outline" 
              label="Biométrie" 
              type="switch" 
              value={isBiometricEnabled} 
              onPress={toggleBiometry} 
            />
            <SettingItem 
              icon="lock-closed-outline" 
              label="Changer le mot de passe" 
              onPress={() => router.push('/settings/change-password')} 
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          <View style={styles.sectionCard}>
            <SettingItem 
              icon="globe-outline" 
              label="Langue" 
              value={language === 'fr' ? 'Français' : language === 'ar' ? 'العربية' : 'English'} 
              onPress={() => router.push('/settings/language')} 
            />
            <SettingItem icon="trash-outline" label="Vider le cache" onPress={handleClearCache} />
            <SettingItem icon="help-circle-outline" label="Aide & Support" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <SettingItem 
              icon="log-out-outline" 
              label="Déconnexion" 
              color={colors.red} 
              onPress={handleLogout}
            />
          </View>
        </View>

        <Text style={styles.version}>Chill Version 1.0.4 (Bêta)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120 },
  header: { alignItems: 'center', paddingVertical: 30 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: colors.red, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(229, 9, 20, 0.2)',
    overflow: 'hidden'
  },
  avatarText: { color: 'white', fontSize: 40, fontFamily: 'BebasNeue_400Regular' },
  premiumBadge: { 
    position: 'absolute', 
    bottom: -5, 
    backgroundColor: colors.gold, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  premiumText: { fontSize: 10, fontWeight: 'bold', color: 'black' },
  username: { color: 'white', fontSize: 24, fontFamily: 'Nunito_700Bold' },
  email: { color: colors.muted, fontSize: 14, marginTop: 4 },
  editBtn: { 
    marginTop: 15, 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  editBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    backgroundColor: colors.bg2, 
    marginHorizontal: 20, 
    borderRadius: 20, 
    paddingVertical: 20,
    marginBottom: 30
  },
  statItem: { alignItems: 'center', gap: 5 },
  statValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  statValueSmall: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  statLabel: { color: colors.muted, fontSize: 12 },
  
  myPostsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg2,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  myPostsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myPostsIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myPostsText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { color: colors.muted, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 },
  sectionCard: { backgroundColor: colors.bg2, borderRadius: 20, overflow: 'hidden' },
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  settingValue: { color: colors.muted, fontSize: 14 },
  version: { textAlign: 'center', color: colors.bg3, fontSize: 12, marginTop: 10 }
});
