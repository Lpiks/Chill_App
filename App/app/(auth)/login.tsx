import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    identifier: '',
    password: ''
  });

  const handleLogin = async () => {
    if (!form.identifier || !form.password) return;
    
    setIsLoading(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const cleanIdentifier = form.identifier.trim();
      const payload = {
        method,
        password: form.password,
        email: method === 'email' ? cleanIdentifier.toLowerCase() : undefined,
        phone: method === 'phone' ? (cleanIdentifier.startsWith('+') ? cleanIdentifier : `+213${cleanIdentifier}`) : undefined
      };

      const response = await api.post('/auth/login', payload);
      const { token, user } = response.data;
      
      await setAuth(user, token);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="white" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connexion</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.topSection}>
            <Text style={styles.title}>Content de vous revoir</Text>
            <Text style={styles.subtitle}>Connectez-vous pour continuer l'aventure</Text>
          </View>

          {/* Method Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, method === 'email' && styles.toggleBtnActive]}
              onPress={() => setMethod('email')}
            >
              <Text style={[styles.toggleText, method === 'email' && styles.toggleTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, method === 'phone' && styles.toggleBtnActive]}
              onPress={() => setMethod('phone')}
            >
              <Text style={[styles.toggleText, method === 'phone' && styles.toggleTextActive]}>Téléphone</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{method === 'email' ? 'Email' : 'Téléphone'}</Text>
              <View style={styles.inputWrapper}>
                {method === 'phone' && (
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>+213</Text>
                  </View>
                )}
                <TextInput 
                  style={[styles.input, method === 'phone' && styles.phoneInput]}
                  placeholder={method === 'email' ? "nom@exemple.com" : "5xx xxx xxx"}
                  placeholderTextColor={colors.muted}
                  keyboardType={method === 'email' ? "email-address" : "phone-pad"}
                  autoCapitalize="none"
                  value={form.identifier}
                  onChangeText={(t) => setForm({...form, identifier: t})}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordWrapper}>
                <TextInput 
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={(t) => setForm({...form, password: t})}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotLink}>
              <Text style={styles.forgotText}>Mot de passe oublié?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.loginBtnText}>SE CONNECTER</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  errorBanner: { 
    backgroundColor: colors.red, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 12,
    gap: 10
  },
  errorBannerText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15 },
  backBtn: { padding: 5 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 25, paddingBottom: 40 },
  topSection: { marginTop: 20, marginBottom: 40, gap: 10 },
  title: { color: colors.white, fontSize: 32, fontFamily: 'BebasNeue_400Regular' },
  subtitle: { color: colors.muted, fontSize: 16, fontFamily: 'Nunito_400Regular' },
  toggleContainer: { 
    flexDirection: 'row', 
    backgroundColor: colors.bg2, 
    borderRadius: 12, 
    padding: 4,
    marginBottom: 30
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: colors.bg3 },
  toggleText: { color: colors.muted, fontWeight: 'bold' },
  toggleTextActive: { color: colors.white },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { color: colors.white, fontSize: 14, fontWeight: '600' },
  inputWrapper: { flexDirection: 'row', gap: 10 },
  prefix: { 
    backgroundColor: colors.bg2, 
    paddingHorizontal: 12, 
    justifyContent: 'center', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  prefixText: { color: colors.white, fontSize: 14, fontWeight: 'bold' },
  input: { 
    flex: 1,
    backgroundColor: colors.bg3, 
    color: colors.white, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.border,
    fontFamily: 'Nunito_400Regular'
  },
  phoneInput: { flex: 1 },
  passwordWrapper: { position: 'relative' },
  eyeIcon: { position: 'absolute', right: 15, top: 18 },
  forgotLink: { alignSelf: 'flex-end' },
  forgotText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  loginBtn: { backgroundColor: colors.red, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  loginBtnText: { color: colors.white, fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 2 }
});
