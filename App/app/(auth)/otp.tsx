import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function OTPScreen() {
  const router = useRouter();
  const { identifier, method } = useLocalSearchParams();
  const { setAuth } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next
    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) return;

    setIsLoading(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await api.post('/auth/verify-otp', {
        method,
        otp: code,
        email: method === 'email' ? identifier : undefined,
        phone: method === 'phone' ? identifier : undefined,
      });

      const { token, user } = response.data;
      await setAuth(user, token);
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Code invalide');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    try {
      await api.post('/auth/resend-otp', {
        method,
        email: method === 'email' ? identifier : undefined,
        phone: method === 'phone' ? identifier : undefined,
      });
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0].focus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior="padding"
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.textGroup}>
            <Text style={styles.title}>Entrez le code</Text>
            <Text style={styles.subtitle}>Un code a été envoyé à {identifier}</Text>
          </View>

          <View style={styles.otpContainer}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputs.current[i] = el!; }}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                  error ? styles.otpInputError : null
                ]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                selectTextOnFocus
              />
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity 
            style={[styles.verifyBtn, otp.join('').length < 6 && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={isLoading || otp.join('').length < 6}
          >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.verifyBtnText}>VÉRIFIER</Text>}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Vous n'avez pas reçu le code ?</Text>
            {countdown > 0 ? (
              <Text style={styles.timerText}>Renvoyer dans 00:{countdown.toString().padStart(2, '0')}</Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Renvoyer le code</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15 },
  backBtn: { padding: 5 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 25, paddingTop: 40 },
  textGroup: { gap: 10, marginBottom: 40 },
  title: { color: colors.white, fontSize: 32, fontFamily: 'BebasNeue_400Regular' },
  subtitle: { color: colors.muted, fontSize: 16, fontFamily: 'Nunito_400Regular' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  otpInput: {
    width: 50,
    height: 60,
    backgroundColor: colors.bg2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.white,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'BebasNeue_400Regular'
  },
  otpInputFilled: { borderColor: colors.red },
  otpInputError: { borderColor: colors.red },
  errorText: { color: colors.red, textAlign: 'center', marginBottom: 20 },
  verifyBtn: { backgroundColor: colors.red, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: colors.white, fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 2 },
  resendContainer: { marginTop: 40, alignItems: 'center', gap: 10 },
  resendText: { color: colors.muted, fontSize: 14 },
  timerText: { color: colors.white, fontWeight: 'bold' },
  resendLink: { color: colors.red, fontWeight: 'bold', textDecorationLine: 'underline' }
});
