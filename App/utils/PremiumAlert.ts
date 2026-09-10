import { DeviceEventEmitter } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export const PremiumAlert = {
  alert: (title: string, message?: string, buttons?: AlertButton[], options?: any) => {
    DeviceEventEmitter.emit('SHOW_GLOBAL_ALERT', { title, message, buttons });
  }
};
