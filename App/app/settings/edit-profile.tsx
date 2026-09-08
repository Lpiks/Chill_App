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
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import api from '../../services/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
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
      Alert.alert('Erreur', 'Impossible de télécharger l\'image. Veuillez réessayer.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert('Attention', 'Le nom ne peut pas être vide.');
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
      Alert.alert('Succès', 'Votre profil a été mis à jour.');
      router.back();
    } catch (error: any) {
      setLoading(false);
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du profil.';
      Alert.alert('Erreur', message);
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
        <TouchableOpacity style={styles.avatarSection} onPress={pickImage} disabled={loading}>
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
  input: { flex: 1, color: 'white', marginLeft: 12, fontSize: 16 }
});
