import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ToastConfig } from 'react-native-toast-message';
import { colors } from '../../constants/colors';

const BaseToast = ({ text1, text2, type }: any) => {
  let iconName = 'information-circle';
  let accentColor = '#FF3366'; // Default accent color

  if (type === 'success') {
    iconName = 'checkmark-circle';
    accentColor = '#4CAF50'; 
  } else if (type === 'error') {
    iconName = 'alert-circle';
    accentColor = colors.red || '#FF3B30'; 
  } else if (type === 'info') {
    iconName = 'information-circle';
    accentColor = '#007AFF'; 
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
        <View style={[styles.indicator, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          <Ionicons name={iconName as any} size={28} color={accentColor} style={styles.icon} />
          <View style={styles.textContainer}>
            {text1 && <Text style={styles.title}>{text1}</Text>}
            {text2 && <Text style={styles.message}>{text2}</Text>}
          </View>
        </View>
      </BlurView>
    </View>
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} type="success" />,
  error: (props) => <BaseToast {...props} type="error" />,
  info: (props) => <BaseToast {...props} type="info" />,
  default: (props) => <BaseToast {...props} type="info" />
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: 'rgba(20, 20, 25, 0.65)', 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  blurContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    color: '#A0A0A0',
    fontSize: 14,
  }
});
