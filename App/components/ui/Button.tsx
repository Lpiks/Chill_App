import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export const Button = ({ title, onPress }: any) => (
  <TouchableOpacity style={styles.btn} onPress={onPress}>
    <Text style={styles.text}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: { backgroundColor: colors.red, padding: 15, borderRadius: 12, alignItems: 'center' },
  text: { color: colors.white, fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 1 },
});
