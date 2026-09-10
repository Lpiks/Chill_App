import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/notionists/png?seed=Felix&backgroundColor=e50914',
  'https://api.dicebear.com/7.x/notionists/png?seed=Aneka&backgroundColor=1E1E24',
  'https://api.dicebear.com/7.x/notionists/png?seed=Jasper&backgroundColor=4CAF50',
  'https://api.dicebear.com/7.x/notionists/png?seed=Mia&backgroundColor=2196F3',
  'https://api.dicebear.com/7.x/notionists/png?seed=Oliver&backgroundColor=FF9800',
  'https://api.dicebear.com/7.x/notionists/png?seed=Leo&backgroundColor=9C27B0',
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [loading, setLoading] = useState(false);

  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const [isGridVisible, setGridVisible] = useState(false);

  const pickImage = async () => {
    setActionSheetVisible(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setLoading(true);
        const uri = result.assets[0].uri;
        
        const formData = new FormData();
        // @ts-ignore
        formData.append('avatar', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          type: 'image/jpeg',
          name: 'avatar.jpg'
        });

        const { data } = await api.post('/users/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setAvatar(data.avatarUrl);
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      showToast('error', 'Erreur', 'Impossible de télécharger l\'image. Veuillez réessayer.');
    }
  };

  const selectDefaultAvatar = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatar(url);
    setGridVisible(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('error', 'Attention', 'Le nom ne peut pas être vide.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data: updatedUser } = await api.put('/users/profile', {
        name: name.trim(),
        email: email.trim(),
        avatarUrl: avatar
      });

      await setUser(updatedUser);
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'Succès', 'Votre profil a été mis à jour.');
      router.back();
    } catch (error: any) {
      setLoading(false);
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du profil.';
      showToast('error', 'Erreur', message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={colors.red} /> : <Text style={styles.saveText}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Avatar Preview */}
        <TouchableOpacity style={styles.avatarSection} onPress={() => setActionSheetVisible(true)} disabled={loading}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.mainAvatar} />
          ) : (
            <View style={[styles.mainAvatar, styles.placeholderAvatar]}>
               <Text style={styles.avatarInitial}>{name?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <View style={styles.badge}>
            <Ionicons name="camera" size={16} color="white" />
          </View>
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.label}>Nom complet</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.muted} />
            <TextInput 
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Votre nom"
              placeholderTextColor={colors.muted}
            />
          </View>

          <Text style={styles.label}>Adresse Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.muted} />
            <TextInput 
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
            />
          </View>
        </View>
      </ScrollView>

      {/* Avatar Action Sheet Modal */}
      <Modal visible={isActionSheetVisible} transparent animationType="none" onRequestClose={() => setActionSheetVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>Changer l'avatar</Text>
            
            <TouchableOpacity style={styles.actionSheetBtn} onPress={() => { setActionSheetVisible(false); setGridVisible(true); }}>
              <Ionicons name="grid-outline" size={20} color="white" />
              <Text style={styles.actionSheetText}>Choisir un avatar par défaut</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSheetBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={20} color="white" />
              <Text style={styles.actionSheetText}>Choisir depuis la galerie</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSheetCancel} onPress={() => setActionSheetVisible(false)}>
              <Text style={styles.actionSheetCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Default Avatars Grid Modal */}
      <Modal visible={isGridVisible} transparent animationType="slide" onRequestClose={() => setGridVisible(false)}>
        <View style={styles.gridModalContainer}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridTitle}>Avatars par défaut</Text>
            <TouchableOpacity onPress={() => setGridVisible(false)} style={styles.gridCloseBtn}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.gridContainer}>
            {DEFAULT_AVATARS.map((url, i) => (
              <TouchableOpacity key={i} onPress={() => selectDefaultAvatar(url)} style={styles.gridItemBtn}>
                <Image source={{ uri: url }} style={styles.gridAvatar} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
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
  saveText: { color: colors.red, fontSize: 16, fontWeight: 'bold' },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 30, alignSelf: 'center' },
  mainAvatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.bg2, borderWidth: 3, borderColor: colors.red },
  placeholderAvatar: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: 'white', fontSize: 40, fontWeight: 'bold' },
  badge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.red, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.bg },
  form: { gap: 20 },
  label: { color: colors.muted, fontSize: 14, fontWeight: 'bold', marginBottom: -10, marginLeft: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 15, height: 55 },
  input: { flex: 1, color: 'white', marginLeft: 12, fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: '#1E1E24', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, paddingBottom: 40, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  actionSheetTitle: { color: colors.muted, fontSize: 14, fontWeight: 'bold', marginBottom: 20, textTransform: 'uppercase' },
  actionSheetBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12, width: '100%', marginBottom: 10, gap: 10 },
  actionSheetText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  actionSheetCancel: { marginTop: 10, paddingVertical: 10 },
  actionSheetCancelText: { color: colors.muted, fontSize: 16, fontWeight: 'bold' },

  // Grid Modal Styles
  gridModalContainer: { flex: 1, backgroundColor: colors.bg, marginTop: 100, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  gridTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  gridCloseBtn: { padding: 5, backgroundColor: colors.bg2, borderRadius: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
  gridItemBtn: { width: '30%', aspectRatio: 1, marginBottom: 15 },
  gridAvatar: { width: '100%', height: '100%', borderRadius: 100, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }
});
