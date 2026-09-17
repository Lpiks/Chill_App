import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Cairo_700Bold } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { usePresenceStore } from '../store/presenceStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import api from '../services/api';
import { getSocket, disconnectSocket } from '../services/socket';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useFriendStore } from '../store/friendStore';
import Animated, { FadeOut, FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/ui/CustomToast';
import { GlobalAlert } from '../components/GlobalAlert';
import { PremiumAlert } from '../utils/PremiumAlert';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const queryClient = new QueryClient();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Nunito_400Regular,
    Nunito_700Bold,
    Cairo_700Bold,
  });

  const { isAuthenticated, isBiometricEnabled, setBiometric, loadFromStorage } = useAuthStore();
  const { setUnreadNotifications, setRequests } = useFriendStore();
  const segments = useSegments();
  const router = useRouter();
  const [showFakeSplash, setShowFakeSplash] = useState(true);
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      if (data?.type === 'watch_party_invite' && data?.roomId) {
        setTimeout(() => {
          router.push(`/party/${data.roomId}`);
        }, 500); // Give layout time to mount if cold boot
      }
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    loadFromStorage();
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, []);

  // Biometric Check on App Open
  useEffect(() => {
    if (isAuthenticated && isBiometricEnabled) {
      handleBiometricAuth();
    }
  }, [isAuthenticated, isBiometricEnabled]);

  const handleBiometricAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification Chill',
        fallbackLabel: 'Utiliser le mot de passe',
      });

      if (!result.success) {
        setBiometric(false);
        PremiumAlert.alert('Échec', 'Authentification biométrique échouée');
        return;
      }
    }
  };

  useEffect(() => {
    if (!fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      checkEnableBiometrics();
      router.replace('/(tabs)');
    }

    SplashScreen.hideAsync();
    
    // Hide our custom full-screen splash after 2.5 seconds
    setTimeout(() => setShowFakeSplash(false), 2500);
  }, [fontsLoaded, isAuthenticated, segments]);

  const checkEnableBiometrics = async () => {
    const biometricPref = await AsyncStorage.getItem('cinedz_biometric_enabled');
    if (biometricPref === null) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        PremiumAlert.alert(
          'Biométrie',
          'Voulez-vous activer Face ID / Touch ID pour vos prochaines connexions ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Activer', onPress: () => setBiometric(true) }
          ]
        );
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync()
        .then(token => {
          if (token) api.post('/auth/update-push-token', { token }).catch(() => {});
        })
        .catch(e => console.warn('Push registration failed:', e));

      // Periodic check for unread notifications and friend requests
      const fetchData = async () => {
        try {
          const [notifRes, requestsRes] = await Promise.all([
            api.get('/notifications'),
            api.get('/friends/requests')
          ]);
          
          const unread = notifRes.data.filter((n: any) => !n.read).length;
          setUnreadNotifications(unread);
          
          setRequests(requestsRes.data.received, requestsRes.data.sent);
        } catch (e) {}
      };
      
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Global WebSocket for Real-time Sync
  useEffect(() => {
    let globalSocket: any;
    let cleanupFn: (() => void) | undefined;

    const setupGlobalSocket = async () => {
      if (!isAuthenticated) {
        disconnectSocket();
        return;
      }

      globalSocket = await getSocket();
      
      try {
        const { data: convs } = await api.get('/conversations');
        const convIds = convs.map((c: any) => c.id || c._id);
        if (convIds.length > 0) {
          globalSocket.emit('join-conversations', convIds);
        }
      } catch (err) {
        console.warn('Failed to fetch conversations for global socket', err);
      }

      const handleGlobalEvent = () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      };

      globalSocket.on('new-message', handleGlobalEvent);
      globalSocket.on('message-deleted', handleGlobalEvent);

      // Presence Handlers
      const { setOnlineUsers, addOnlineUser, removeOnlineUser } = usePresenceStore.getState();
      
      globalSocket.on('online-users-list', (users: string[]) => {
        setOnlineUsers(users);
      });
      globalSocket.on('user-online', ({ userId }: { userId: string }) => {
        addOnlineUser(userId);
      });
      globalSocket.on('user-offline', ({ userId }: { userId: string }) => {
        removeOnlineUser(userId);
      });

      // Fetch initial list
      globalSocket.emit('get-online-users');

      cleanupFn = () => {
        if (globalSocket) {
          globalSocket.off('new-message', handleGlobalEvent);
          globalSocket.off('message-deleted', handleGlobalEvent);
          globalSocket.off('online-users-list');
          globalSocket.off('user-online');
          globalSocket.off('user-offline');
        }
      };
    };

    setupGlobalSocket();

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [isAuthenticated]);

  const registerForPushNotificationsAsync = async () => {
    try {
      let token;
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          return;
        }
        token = (await Notifications.getExpoPushTokenAsync()).data;
      }

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.warn('registerForPushNotificationsAsync error:', error);
      return null;
    }
  };

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
          
          {showFakeSplash && (
            <Animated.View 
              exiting={FadeOut.duration(800)} 
              style={[StyleSheet.absoluteFill, { zIndex: 9999, backgroundColor: '#0a0a0f' }]}
            >
              <Image 
                source={require('../assets/splash.png')} 
                style={{ width: '100%', height: '100%' }} 
                contentFit="cover" 
              />
            </Animated.View>
          )}
          
          <Toast config={toastConfig} />
          <GlobalAlert />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
