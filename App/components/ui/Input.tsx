import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export const Input = (props: any) => (
  <TextInput 
    style={styles.input} 
    placeholderTextColor={colors.muted}
    {...props} 
  />
);

const styles = StyleSheet.create({
  input: { 
    backgroundColor: colors.bg3, 
    color: colors.white, 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
});
