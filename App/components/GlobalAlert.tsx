import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, DeviceEventEmitter } from 'react-native';
import { colors } from '../constants/colors';
import { BlurView } from 'expo-blur';

export const GlobalAlert = () => {
  const [visible, setVisible] = useState(false);
  const [alertData, setAlertData] = useState<any>(null);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('SHOW_GLOBAL_ALERT', (data) => {
      setAlertData(data);
      setVisible(true);
    });

    return () => subscription.remove();
  }, []);

  const closeAlert = () => {
    setVisible(false);
    setTimeout(() => setAlertData(null), 300);
  };

  if (!visible || !alertData) return null;

  const buttons = alertData.buttons && alertData.buttons.length > 0 
    ? alertData.buttons 
    : [{ text: 'OK', onPress: () => {} }];

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={closeAlert}>
      <BlurView intensity={20} tint="dark" style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{alertData.title}</Text>
          {!!alertData.message && <Text style={styles.message}>{alertData.message}</Text>}
          
          <View style={[styles.buttonsContainer, buttons.length > 2 && styles.buttonsColumn]}>
            {buttons.map((btn: any, index: number) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.button, 
                    isDestructive && styles.destructiveButton,
                    isCancel && styles.cancelButton,
                    buttons.length === 2 && styles.halfButton
                  ]}
                  onPress={() => {
                    closeAlert();
                    if (btn.onPress) btn.onPress();
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    isDestructive && styles.destructiveText,
                    isCancel && styles.cancelText
                  ]}>
                    {btn.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20
  },
  alertBox: {
    backgroundColor: '#1a1a28',
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center'
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  message: {
    color: '#a0a0a0',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    justifyContent: 'center'
  },
  buttonsColumn: {
    flexDirection: 'column'
  },
  button: {
    backgroundColor: colors.red,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100
  },
  halfButton: {
    flex: 1
  },
  cancelButton: {
    backgroundColor: '#333344'
  },
  destructiveButton: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1,
    borderColor: colors.red
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelText: {
    color: '#d0d0d0'
  },
  destructiveText: {
    color: colors.red
  }
});
