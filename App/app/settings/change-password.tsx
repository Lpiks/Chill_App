import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { PremiumAlert } from '../../utils/PremiumAlert';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ current: '', new: '', confirm: '' });

  const handleUpdate = async () => {
    setError('');
    if (!form.current) return setError('Veuillez saisir votre mot de passe actuel');
    if (!form.new) return setError('Veuillez saisir un nouveau mot de passe');
    if (form.new !== form.confirm) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return setError('Les mots de passe ne correspondent pas');
    }

    setLoading(true);
    try {
      await api.put('/users/password', {
        currentPassword: form.current,
        newPassword: form.new
      });
      
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      PremiumAlert.alert('Succès', 'Votre mot de passe a été mis à jour avec succès.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      setLoading(false);
      const message = err.response?.data?.message || 'Erreur lors du changement de mot de passe';
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        <Text style={styles.headerTitle}>Changer le mot de passe</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Mot de passe actuel</Text>
          <TextInput 
            style={styles.input} 
            secureTextEntry 
            placeholder="••••••••" 
            placeholderTextColor={colors.muted}
            value={form.current}
            onChangeText={(t) => setForm({...form, current: t})}
          />

          <Text style={styles.label}>Nouveau mot de passe</Text>
          <TextInput 
            style={styles.input} 
            secureTextEntry 
            placeholder="••••••••" 
            placeholderTextColor={colors.muted}
            value={form.new}
            onChangeText={(t) => setForm({...form, new: t})}
          />

          <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
          <TextInput 
            style={styles.input} 
            secureTextEntry 
            placeholder="••••••••" 
            placeholderTextColor={colors.muted}
            value={form.confirm}
            onChangeText={(t) => setForm({...form, confirm: t})}
          />

          <TouchableOpacity 
            style={[styles.saveBtn, (!form.new || loading) && { opacity: 0.5 }]} 
            onPress={handleUpdate}
            disabled={!form.new || loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Mettre à jour</Text>}
          </TouchableOpacity>
        </View>
      </View>
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
  content: { padding: 25 },
  form: { gap: 20 },
  label: { color: colors.muted, fontSize: 13, fontWeight: 'bold', marginBottom: -10, marginLeft: 5 },
  input: { 
    backgroundColor: colors.bg2, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    height: 55, 
    color: 'white', 
    fontSize: 16 
  },
  saveBtn: { 
    backgroundColor: colors.red, 
    height: 55, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 20 
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: colors.red, fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }
});
