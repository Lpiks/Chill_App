import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '../../store/settingsStore';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage } = useSettingsStore();

  const languages = [
    { id: 'fr', label: 'Français', flag: '🇫🇷' },
    { id: 'ar', label: 'العربية (Algérie)', flag: '🇩🇿' },
    { id: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const handleSelect = (id: 'fr' | 'ar' | 'en') => {
    setLanguage(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => router.back(), 300);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Langue</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          {languages.map((lang) => (
            <TouchableOpacity 
              key={lang.id} 
              style={styles.row} 
              onPress={() => handleSelect(lang.id)}
            >
              <View style={styles.left}>
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={styles.label}>{lang.label}</Text>
              </View>
              {language === lang.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.red} />
              )}
            </TouchableOpacity>
          ))}
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
  card: { backgroundColor: colors.bg2, borderRadius: 20, overflow: 'hidden' },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.03)' 
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  flag: { fontSize: 24 },
  label: { color: 'white', fontSize: 16, fontWeight: '500' }
});
