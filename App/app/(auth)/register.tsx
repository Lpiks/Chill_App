import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    let newErrors: any = {};
    if (!form.name) newErrors.name = 'Nom complet requis';
    
    if (method === 'email') {
      if (!form.email) newErrors.email = 'Email requis';
      else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email invalide';
    } else {
      if (!form.phone) newErrors.phone = 'Numéro requis';
      else if (form.phone.length < 9) newErrors.phone = 'Numéro trop court';
    }

    if (!form.password) newErrors.password = 'Mot de passe requis';
    else if (form.password.length < 8) newErrors.password = 'Minimum 8 caractères';
    
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const payload = {
        name: form.name,
        password: form.password,
        method,
        email: method === 'email' ? form.email : undefined,
        phone: method === 'phone' ? `+213${form.phone}` : undefined
      };

      await api.post('/auth/register', payload);
      
      router.push({
        pathname: '/(auth)/otp',
        params: { 
          identifier: method === 'email' ? form.email : `+213${form.phone}`,
          method 
        }
      });
    } catch (error: any) {
      console.error(error);
      setErrors({ server: error.response?.data?.message || 'Erreur lors de l\'inscription' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un compte</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
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

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom complet</Text>
              <TextInput 
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Ex: Elhadi Hammaz"
                placeholderTextColor={colors.muted}
                value={form.name}
                onChangeText={(t) => setForm({...form, name: t})}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {method === 'email' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adresse Email</Text>
                <TextInput 
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="nom@exemple.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(t) => setForm({...form, email: t})}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Numéro de Téléphone</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>🇩🇿 +213</Text>
                  </View>
                  <TextInput 
                    style={[styles.input, styles.phoneInput, errors.phone && styles.inputError]}
                    placeholder="5xx xxx xxx"
                    placeholderTextColor={colors.muted}
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={(t) => setForm({...form, phone: t})}
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordWrapper}>
                <TextInput 
                  style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="Min. 8 caractères"
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
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <TextInput 
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Répétez le mot de passe"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
                value={form.confirmPassword}
                onChangeText={(t) => setForm({...form, confirmPassword: t})}
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity 
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>CONTINUER</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.termsText}>
              En continuant, vous acceptez nos <Text style={{ color: colors.red }}>Conditions d'utilisation</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    gap: 15
  },
  backBtn: { padding: 5 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
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
  input: { 
    backgroundColor: colors.bg3, 
    color: colors.white, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.border,
    fontFamily: 'Nunito_400Regular'
  },
  inputError: { borderColor: colors.red },
  phoneInputContainer: { flexDirection: 'row', gap: 10 },
  prefix: { 
    backgroundColor: colors.bg2, 
    paddingHorizontal: 12, 
    justifyContent: 'center', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  prefixText: { color: colors.white, fontSize: 14, fontWeight: 'bold' },
  phoneInput: { flex: 1 },
  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 15, top: 18 },
  errorText: { color: colors.red, fontSize: 12 },
  submitBtn: { 
    backgroundColor: colors.red, 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center',
    marginTop: 10
  },
  submitBtnText: { 
    color: colors.white, 
    fontFamily: 'BebasNeue_400Regular', 
    fontSize: 18, 
    letterSpacing: 2 
  },
  termsText: { 
    color: colors.muted, 
    fontSize: 12, 
    textAlign: 'center', 
    marginTop: 10,
    lineHeight: 18
  }
});
