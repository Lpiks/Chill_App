import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SettingsStore {
  language: 'fr' | 'ar' | 'en'
  notifications: {
    newReleases: boolean
    watchParties: boolean
    socialActivity: boolean
    marketing: boolean
  }
  setLanguage: (lang: 'fr' | 'ar' | 'en') => void
  setNotification: (key: string, value: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: 'fr',
      notifications: {
        newReleases: true,
        watchParties: true,
        socialActivity: false,
        marketing: false,
      },
      setLanguage: (lang) => set({ language: lang }),
      setNotification: (key, value) =>
        set((state) => ({
          notifications: { ...state.notifications, [key]: value }
        })),
    }),
    {
      name: 'cinedz-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
