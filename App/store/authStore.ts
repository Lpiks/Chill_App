import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  subscriptionTier: 'free' | 'basic' | 'standard' | 'premium';
  tasteProfile: {
    genres: any;
    languages: string[];
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  setBiometric: (enabled: boolean) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isBiometricEnabled: false,
  setAuth: async (user, token) => {
    const normalizedUser = { ...user, id: user.id || user._id };
    await AsyncStorage.setItem('cinedz_user', JSON.stringify(normalizedUser));
    await AsyncStorage.setItem('cinedz_token', token);
    set({ user: normalizedUser, token, isAuthenticated: true });
  },
  setUser: async (userData) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...userData, id: userData.id || userData._id || currentUser.id };
    await AsyncStorage.setItem('cinedz_user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },
  setBiometric: async (enabled) => {
    await AsyncStorage.setItem('cinedz_biometric_enabled', enabled ? 'true' : 'false');
    set({ isBiometricEnabled: enabled });
  },
  logout: async () => {
    await AsyncStorage.removeItem('cinedz_user');
    await AsyncStorage.removeItem('cinedz_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  loadFromStorage: async () => {
    const userStr = await AsyncStorage.getItem('cinedz_user');
    const token = await AsyncStorage.getItem('cinedz_token');
    const biometric = await AsyncStorage.getItem('cinedz_biometric_enabled');
    
    let user = null;
    if (userStr) {
      user = JSON.parse(userStr);
      user.id = user.id || user._id;
    }

    set({ 
      user, 
      token, 
      isAuthenticated: !!(user && token),
      isBiometricEnabled: biometric === 'true'
    });
  },
}));
